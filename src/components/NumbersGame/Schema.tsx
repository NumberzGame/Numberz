
import { GameID, Game, GameState, Forms, Move } from './Classes';
import {ALL_SEEDS, SEEDS, OP_SYMBOLS, GOAL_MIN, GOAL_MAX } from './Core';

// See  /dev/schemas.txt
// simple: (72B, 5MB limit => 10 per day for 16 years)

//       key:
//       u60 10B (5 UTF-16 BMP single code units) 

//       grade, 1,...,228 u15
//       goal, 100, ..., 999 u15 
//       form, 2, 3, ..., (1, (1, (2, 2))), u15
//       index, (0 to 70_000) u30 
      
//       val:
//       game u... 62B (31 UTF-16 BMP single code units) 

//       Schema index: 2B u15 (1) 
//       timestamp: u45       (3)
//       solved, u15           (1)
//       seeds*6, u90 (6) (14 seeds in normal game, 10 small (twice) 4 large)
//         seed u4
//       ops*5    u75 (5) 
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
export const MAX_OPS = MAX_SEEDS - 1;
export const MAX_MOVES = MAX_OPS
export const MAX_OPERANDS = 2;
export const MIN_GAME_ID_SIZE = 5;
export const MIN_GAME_SIZE = 26;



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


    if (key.length < MIN_GAME_ID_SIZE) {
        throw new Error(`Need ${MIN_GAME_ID_SIZE} code-units to encode a GameID. `
                        +`Got: ${key.length}, key=${key}`
        )   
    }

    const takeNextN = makeTakeNextNDestringified(key);
    const next = () => takeNextN(1).next().value;

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




const makeTakeNextNDestringified = function(s: string): (N: number) => IterableIterator<number> {
    const codeUnitsIterator = destringifyCodeUnits(s);
    const takeNextNDestringified = function*(N: number): IterableIterator<number> {
        // Iterator.prototype.take is not supported on Safari (as of 10 Dec 2024)
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/take
        // const NResults = codeUnitsIterator.take(N); 
        for (let i = 0; i < N; i++) {
            const result = codeUnitsIterator.next();
            if (result.done) {
                throw new Error(`codeUnitsIterator exhausted. `
                    +`s=${s} too short for required number of calls/iterations. `
                    +`latest N=${N}`
                );
            }
            yield result.value;
        }
    }
    return takeNextNDestringified;
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

    if (s.length < MIN_GAME_SIZE) {
        throw new Error(`Need ${MIN_GAME_SIZE} code-units to encode a Game. `
                       +` Got: ${s.length}, s=${s}`
        )   
    }

    const takeNextN = makeTakeNextNDestringified(s);
    const next = () => takeNextN(1).next().value;
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

    const seedIndices = [];

    for (const seedIndex of takeNextN(MAX_SEEDS)) {
        if(seedIndex === NO_SEED) {
            continue
        } else if ((0 <= seedIndex) && (seedIndex <= SEEDS.length)) {
            seedIndices.push(seedIndex);
        } else {
            throw new Error(`Unrecognised seed index: ${seedIndex}. `
                           + `Must be between 0 and ${SEEDS.length-1}, `
                           +`or ===NO_SEED code ${NO_SEED}`
            );
        }
    }

    const opIndices = [];

    for (const opIndex of takeNextN(MAX_OPS)) { 
        if(opIndex === NO_OP) {
            continue
        } else if ((0 <= opIndex) && (opIndex <= SEEDS.length)) {
            opIndices.push(opIndex);
        } else {
            throw new Error(`Unrecognised seed index: ${opIndex}. `
                           + `Must be between 0 and ${SEEDS.length-1}, `
                           +`or ===NO_SEED code ${NO_SEED}`
            );
        }
    }

    const moves = [];
    

    for (const opIndex of takeNextN(MAX_MOVES)) {
        const operandIndices = [];
        for (const operandIndex of takeNextN(MAX_OPERANDS)) {
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
        } else if ((0 <= opIndex) && (opIndex < OP_SYMBOLS.length)) {
            const move = new Move(opIndex, operandIndices);
            moves.push(move);
        } else {
            throw new Error(`Unrecognised op index: ${opIndex}. `
                           + `Must be between 0 and ${OP_SYMBOLS.length-1} inc, `
                           +`or ===NO_OP code ${NO_OP}`
            );
        }
    }

    const state = new GameState(solved, moves);
    const game = new Game(id, timeStamp, seedIndices, [], state);

    return game;
}

function* checkAndPadIterable<T>(
    it: Iterable<T>,
    paddedLen: number,
    fillValue: T,
    checker: ((item: T) => void) | null = null,
    ): IterableIterator<T> {
    
    let i=0;

    for (const item of it) {
        if (checker) {
            checker(item);
        }
        yield item   
        i++;
    }
    
    for (;i < paddedLen; i++) {
        yield fillValue;
    }
}

const checkItemsFitAndPadIterable = function*(
    it: Iterable<number>,
    paddedLen: number,
    fillValue: number,
    ): IterableIterator<number> {
    const items = checkAndPadIterable(it, paddedLen, fillValue, checkFitsInChunk);
    for (const item of items) {
        yield item;
    }
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

    for (const seedIndex of checkItemsFitAndPadIterable(game.seedIndices, MAX_SEEDS, NO_SEED)) { 
        yield seedIndex;
    }

    for (const opIndex of checkItemsFitAndPadIterable(game.opIndices, MAX_OPS, NO_OP)) { 
        yield opIndex;
    }

    const NO_MOVE = new Move(NO_OP,Array(MAX_OPERANDS).fill(NO_OPERAND));

    for (const move of checkAndPadIterable(game.state.moves, MAX_MOVES, NO_MOVE )) {
        yield move.opIndex;
        const operandIndices = checkAndPadIterable(
                                    move.operandIndices,
                                    MAX_OPERANDS,
                                    NO_OPERAND,
        );
        for (const operandIndex of operandIndices) {
            if (operandIndex != NO_OPERAND) {
                checkFitsInChunk(operandIndex);
            }
            yield operandIndex;
        }
    }

}


export const stringifyGame = function(game: Game): string {

    // Schema index
    const val = SCHEMA_CODE;



    return val.concat(stringifyCodeUnits(Array.from(gameDataCodeUnits(game))));
}
