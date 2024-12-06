
import { GameID, Game, GameState, Forms, Move } from './Classes';
import {ALL_SEEDS, SEEDS, OPS, GOAL_MIN, GOAL_MAX } from './Core';

// See  /dev/schemas.txt
// simple: (62B, 5MB limit => 10 per day for 20 years)

//       key:
//       u60 10B (5 UTF-16 BMP single code units) 

//       grade, 1,...,228 u15
//       goal, 100, ..., 999 u15 
//       form, 2, 3, ..., (1, (1, (2, 2))), u15
//       index, (0 to 70_000) u30 
      
//       val:
//       game u... 52B (26 UTF-16 BMP single code units) 

//       Schema index: 2B u15 (1) 
//       timestamp: u45       (3)
//       solved, u15           (1)
//       seeds*6, u90 (6) (14 seeds in normal game, 10 small (twice) 4 large)
//         seed u4
//       current state of this game
//       moves*5 u225   (15)
//         move u9
//           Operand u3 (indices 0, 1, ..., 6)
//           Op u2 (+, -, *, //)
const SCHEMA_CODE = "S";
export const CHUNK_SIZE = 15;

const MAX_U15 = ((1 << CHUNK_SIZE) - 1);  //32767, 0b111111111111111 === 0x7fff
                                // highest number of bits that don't 
                                // need any bits that indicate a 
                                // surrogate (0xd800 - 0xdfff).

const NO_SEED = 0xd7ff;    // 0xd7ff is the max single code unit BMP code 
                           // point (before surrogate range).   
const NO_OP = 0xd7fe;      // These cannot be u15s as 0xd7fd needs 16 bits 
const NO_OPERAND = 0xd7fd; // (0xd7fd > 0x7fff == 0b11111111111111)

export const MAX_SEEDS = 6;
export const MAX_MOVES = MAX_SEEDS - 1;
export const MAX_OPERANDS = 2;



const fitsIn_u15 = function(x: number): boolean {
    return (0 <= x) && (x <= MAX_U15);
}


export const checkFitsInChunk = function(x: number) {
    if (!fitsIn_u15(x)) {
        throw new Error(`An internal error occurred. Number must be >= 0 and <= ${MAX_U15}.  Got: ${x}`);
    }
}


export const chunkify = function(x: number, num_chunks: number): number[] {
    // JS converts numbers to signed 32 bit integers, 
    // and has >> as well as >>>.  This function
    // supports higher unsigned integers using bit strings.
    const chunks = [];
    const target_length = num_chunks*CHUNK_SIZE;
    const minNumBits = x.toString(2).length;

    if (minNumBits > target_length) {
        throw new Error(`Number: ${x} is too large `
                       +`to fit into ${num_chunks} x ${CHUNK_SIZE}-bit chunks.  `
                       +`${Math.ceil(minNumBits / CHUNK_SIZE)} chunks are needed. `
        );
    }

    const bits = x.toString(2).padStart(target_length,"0");

    for (let i = 0; i < target_length; i += CHUNK_SIZE ) {
        const chunk = parseInt(bits.slice(i, i + CHUNK_SIZE), 2);
        checkFitsInChunk(chunk);
        chunks.push(chunk);
    }
    return chunks;
}


export const deChunkify = function(chunks: number[]): number {
    const num_chunks = chunks.length;
    return chunks.map((x, i) => x*(2**(CHUNK_SIZE*(num_chunks-1-i)))).reduce((a,c) => a + c);
}


export const stringifyCodeUnits = function(codeUnits: Iterable<number>): string {
    let retval = "";
    for  (const codeUnit of codeUnits) {
        // Don't mistakenly yield surrogate-pairs. Use UTF-16 code-unit charCodes. 
        retval = retval.concat(String.fromCharCode(codeUnit))
    }
    return retval;
}


export const destringifyCodeUnits = function*(s: string): IterableIterator<number> {
    for (let i = 0; i < s.length; i++) {
        // Don't mistakenly yield code-points, use UTF-16 code-unit charCodes. 
        // if a surrogate ends up in there,
        // Other error checking code should find it.
        yield s.charCodeAt(i);
    }
}


export const destringifyGameID = function(key: string): GameID {


    if (key.length < 5) {
        throw new Error(`Need 5 code-units to encode a GameID.  Got: ${key.length}, key=${key}`)   
    }

    const next = makeNextDestringified(key);

    const grade = next();
    const goal = next();
    const form_index = next();
    const form = Forms[form_index];
    // const index_top_15_bits = key.charCodeAt(3);
    // const index_bottom_15_bits = key.charCodeAt(4)
    // Less than 32-bits total so this works using JS native operators
    const index = deChunkify([next(), next()]);

    return new GameID(grade, goal, form, index);
}




const makeNextDestringified = function(s: string): () => number {
    const codeUnitsIterator = destringifyCodeUnits(s);
    const nextDestringified = function(): number {
        const result = codeUnitsIterator.next();
        if (result.done) {
            throw new Error(`codeUnitsIterator exhausted. `
                +`s=${s} too short for required number of calls/iterations. `
            )
        }

        return result.value;
    }
    return nextDestringified;
}

export const stringifyGameID = function(gameID: GameID): string {

    checkFitsInChunk(gameID.grade);
    checkFitsInChunk(gameID.goal);

    const form_index = Forms.indexOf(gameID.form);
    checkFitsInChunk(form_index);

    // const index_top_15_bits = (gameID.index >>> 15) & MAX_U15;
    // const index_bottom_15_bits = gameID.index & MAX_U15;
    // just checks if positive.  
    // (x & MAX_U15) above will not exceed MAX_U15.
    // checkFitsInChunk(index_top_15_bits);
    // checkFitsInChunk(index_bottom_15_bits);

    const keyData = [gameID.grade, gameID.goal, form_index, ...chunkify(gameID.index, 2)];
    //index_top_15_bits, index_bottom_15_bits];

    return stringifyCodeUnits(keyData);
}


export const destringifyGame = function(s: string, id: GameID): Game {

    if (s[0] !== SCHEMA_CODE) {
        throw new Error(`Incorrect Schema code.  Must be: ${SCHEMA_CODE}.  Got: ${s[0]}`)
    }

    if (s.length < 26) {
        throw new Error(`Need 26 code-units to encode a Game.  Got: ${s.length}, s=${s}`)   
    }

    const next = makeNextDestringified(s);

    // Skip schema code
    next();
    
    // const ts_top_15_bits = s.charCodeAt(1) << 30;
    // const ts_mid_15_bits = s.charCodeAt(2) << 15;
    // const ts_bottom_15_bits = s.charCodeAt(3);
    // const timeStamp = deChunkify([s.charCodeAt(1),s.charCodeAt(2), s.charCodeAt(3)]);
    const timeStamp = deChunkify([next(), next(), next()]);

    // const solved_num = s.charCodeAt(4);
    const solved_num = next();

    if (![0, 1].includes(solved_num)) {
        throw new Error(`Incorrect solved_num value.  Must be 0 or 1.  Got: ${solved_num}`)
    }

    const solved = solved_num === 1;

    const FIRST = 5;

    const seedIndices = [];

    for (let i = 0; i < MAX_SEEDS; i++) { 
        // const seedIndex = s.charCodeAt(i);
        const seedIndex = next();
        if(seedIndex === NO_SEED) {
            continue
        } else if ((0 <= seedIndex) && (seedIndex <= SEEDS.length)) {
            seedIndices.push(seedIndex);
        } else {
            throw new Error(`Unrecognised seed index: ${seedIndex}. `
                           + `Must be between 0 and ${SEEDS.length-1}, `
                           +`or ===NO_SEED code ${NO_SEED}`
                           +`Check s.charCodeAt(${i+FIRST})`
            );
        }
    }

    const moves = [];
    
    // for (let j = FIRST_MOVE_INDEX; j+=3; j < FIRST_MOVE_INDEX+MAX_MOVES) {
    //     const opIndex = s.charCodeAt(j);
    for (let j = 0; j < MAX_MOVES; j++) {
        const opIndex = next();
        const operandIndices = [];
        for (let k=0; k< MAX_OPERANDS; k++) {
            const operandIndex = next();
            if (operandIndex === NO_OPERAND) {
                continue
            } else if (0 <= operandIndex && operandIndex < (MAX_SEEDS)) {
            operandIndices.push(operandIndex);
            } else {
                throw new Error(`Unrecognised operand index: ${operandIndex}. `
                    +`Must be between 0 and ${MAX_SEEDS-1} inc, `
                    +`or ===NO_OPERAND code ${NO_OPERAND}`
                );
            }
        }
        if (opIndex === NO_OP) {
            continue;
        } else if ((0 <= opIndex) && (opIndex < OPS.length)) {
            const move = new Move(opIndex, operandIndices);
            moves.push(move);
        } else {
            throw new Error(`Unrecognised op index: ${opIndex}. `
                           + `Must be between 0 and ${OPS.length-1} inc, `
                           +`or ===NO_OP code ${NO_OP}`
            );
        }
    }

    const state = new GameState(solved, moves);
    const game = new Game(id, timeStamp, seedIndices, state);

    return game;
}


export const gameDataCodeUnits = function*(game: Game): IterableIterator<number> {
    
    // const datetime_top_15_bits = (game.when_first_seen_ms >>> 30) & MAX_U15;
    // const datetime_mid_15_bits = (game.when_first_seen_ms >>> 15) & MAX_U15;
    // const datetime_bottom_15_bits = game.when_first_seen_ms & MAX_U15;
    // // just checks if positive.  
    // // (x & MAX_U15) above cannot exceed MAX_U15.
    // checkFitsInChunk(datetime_top_15_bits);
    // checkFitsInChunk(datetime_mid_15_bits);
    // checkFitsInChunk(datetime_bottom_15_bits);
    for (const chunk of chunkify(game.when_first_seen_ms, 3)) {
        yield chunk;
    }
    // [datetime_top_15_bits,
    //                  datetime_mid_15_bits,
                    //  datetime_bottom_15_bits,
                    // ];

    const solved_num = (game.state.solved === true ? 1 : 0);
    yield solved_num;

    for (let i = 0; i < MAX_SEEDS; i++) { 
        if (i < game.seedIndices.length) {
            const seedIndex = game.seedIndices[i];
            checkFitsInChunk(seedIndex);
            yield seedIndex;  
        } else {
            // Pad with NO_SEED.  NO_SEED is too 
            // high to be a u15, so we needn't pad
            // with zero for example (which would
            // require encoding 1 plus each index).
            yield NO_SEED;  
        }
    }

    for (let j = 0; j < MAX_MOVES; j++) {

        if (j < game.state.moves.length) {
            const move = game.state.moves[j];

            // A Move in .moves must have an opIndex
            checkFitsInChunk(move.opIndex);
            yield move.opIndex; 

            for (let k = 0; k < MAX_OPERANDS; k++) {

                let operandIndex;

                if (k < move.operandIndices.length) {
                    operandIndex = move.operandIndices[k];
                    checkFitsInChunk(operandIndex);
                } else {
                    // Padding
                    operandIndex = NO_OPERAND;
                }

                yield operandIndex; 
            } 

        } else {
            // Padding.  See yield NO_SEED) above.
            yield NO_OP;
            for (let m = 0; m < MAX_OPERANDS; m++) {
                yield NO_OPERAND; 
            }
        }
    }
}


export const stringifyGame = function(game: Game): string {

    // Schema index
    const val = SCHEMA_CODE;



    return val.concat(stringifyCodeUnits(Array.from(gameDataCodeUnits(game))));
}

// Ensure importing clients always get corresponding 
// pairs of getters and stringifiers.
export function stringifiersAndGetters() {
    return [destringifyGameID, stringifyGameID, destringifyGame, stringifyGame];
}