
import { instanceOf } from 'prop-types';
import { GameID, GradedGameID, CustomGameID, GameIDBase ,
         Game, GameState, Forms, Move } from './Classes';
import {ALL_SEEDS, SEEDS, OP_SYMBOLS, GOAL_MIN, GOAL_MAX, 
        MAX_SEEDS, MAX_OPS, MAX_OPERANDS, MAX_MOVES } from './Core';


const SCHEMA_CODE = "S";
export const CHUNK_SIZE = 15;

const MAX_U15 = ((1 << CHUNK_SIZE) - 1);  //32767, 0b111111111111111 === 0x7fff
                                // highest number of bits that don't 
                                // need any bits that indicate a 
                                // surrogate (0xd800 - 0xdfff).

const NO_SEED = 0xd7ff;    // 0xd7ff is the max single code unit BMP code 
                           // point (before surrogate range).   
export const NO_OP = 0xd7fe;      // These cannot be u15s as 0xd7fd needs 16 bits 
const NO_OPERAND = 0xd7fd; // (0xd7fd > 0x7fff == 0b11111111111111)
const NO_MOVE = 0xd7fc;

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
    // Split the bits of x into num_chunks * bit strings, each of length CHUNK_SIZE
    // JS converts numbers to signed 32 bit integers, 
    // and has >> as well as >>>.  This function
    // supports larger unsigned integers using bit strings.
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


const makeTakeNextNDestringified = function(s: string): [() => number, (N: number) => IterableIterator<number>] {
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
    const next = () => takeNextNDestringified(1).next().value
    return [next, takeNextNDestringified];
}


const seedsFromDestringified = function*(destringified: Iterable<number>): IterableIterator<number> {
    for (const seedIndex of destringified) {
        if(seedIndex === NO_SEED) {
            continue;
        } else if ((0 <= seedIndex) && (seedIndex < SEEDS.length)) {
            yield seedIndex;
        } else {
            throw new Error(`Unrecognised seed index: ${seedIndex}. `
                           + `Must be between 0 and ${SEEDS.length-1}, `
                           +`or ===NO_SEED code ${NO_SEED}`
            );
        }
    }    
}


const destringifyGradedGameID = function(key: string): GradedGameID {


    if (key.length < GradedGameID.MIN_SIZE) {
        throw new Error(`Need ${GradedGameID.MIN_SIZE} code-units to stringify a GradedGameID. `
                        +`Got: ${key.length}, key=${key}`
        )   
    }

    
    const [next, takeNextN] = makeTakeNextNDestringified(key);

    const type_code = GradedGameID.GAME_ID_TYPE_CODE; // "G"
    if (next() !== type_code.charCodeAt(0)) {
        throw new Error(`Incorrect GameID-type-flag.  Must be ${type_code}.  Got: ${key[0]}`);
    }

    const grade = next();
    const goal = next();
    const form_index = next();
    const form = Forms[form_index];
    // const index_top_15_bits = key.charCodeAt(3);
    // const index_bottom_15_bits = key.charCodeAt(4)
    // Less than 32-bits total so this works using JS native operators
    const index = deChunkify([next(), next()]);

    return new GradedGameID(grade, goal, form, index);
}


const destringifyCustomGameID = function(key: string): CustomGameID {
    // ["C".charCodeAt(0), gameID.goal, ...gameID.seedIndices]

    if (key.length < CustomGameID.MIN_SIZE) {
        throw new Error(`Need ${CustomGameID.MIN_SIZE} code-units to stringify a CustomGameID. `
                        +`Got: ${key.length}, key=${key}`
        )   
    }

    const [next, takeNextN] = makeTakeNextNDestringified(key);

    const type_code = CustomGameID.GAME_ID_TYPE_CODE; // "C"
    if (next() !== type_code.charCodeAt(0)) {
        throw new Error(`Incorrect GameID-type-flag.  Must be ${type_code}.  Got: ${key[0]}`);
    }

    const goal = next();
    
    const seedIndices = Array.from(seedsFromDestringified(takeNextN(MAX_SEEDS)));;

    return new CustomGameID(goal, seedIndices);
}


export const getStringifiedGameIDClass = function(
    stringified: string,
    ): typeof GradedGameID | typeof CustomGameID {

    switch (stringified[0]) {
        case "G" : return GradedGameID;
        case "C" : return CustomGameID;
        default: throw new Error(`Could not find GameID for: ${stringified}`);
    }
}


export const destringifyGameID = function(stringified: string): GameID {
    
    switch (getStringifiedGameIDClass(stringified)) {
        case GradedGameID : return destringifyGradedGameID(stringified);
        case CustomGameID : return destringifyCustomGameID(stringified);
    }
    throw new Error(` getStringifiedGameIDClass("${stringified}") should've errored. `)
}




export function stringifyGameID(gameID: GradedGameID): string
export function stringifyGameID(gameID: CustomGameID): string
export function stringifyGameID(gameID: GradedGameID | CustomGameID): string
export function stringifyGameID(gameID: GradedGameID | CustomGameID): string {

    let keyData;

    if (gameID instanceof GradedGameID) {
        checkFitsInChunk(gameID.grade);
        checkFitsInChunk(gameID.goal);

        const form_index = Forms.indexOf(gameID.form() as string);
        checkFitsInChunk(form_index);

        keyData = ["G".charCodeAt(0), gameID.grade, gameID.goal, form_index, ...chunkify(gameID.index, 2)];
        //index_top_15_bits, index_bottom_15_bits];

    } else if (gameID instanceof CustomGameID) {

        checkFitsInChunk(gameID.goal);
        gameID.seedIndices.forEach(checkFitsInChunk);

        keyData = ["C".charCodeAt(0), gameID.goal, ...gameID.seedIndices];
    } else {
        throw new Error(`Unsupported gameID type: ${gameID}`);
    }
    
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

    const [next, takeNextN] = makeTakeNextNDestringified(s);

    // Skip schema code (e.g. "S")
    next();

    const timeStamp = deChunkify([next(), next(), next()]);

    const solved_num = next();

    if (![0, 1].includes(solved_num)) {
        throw new Error(`Incorrect solved_num value.  Must be 0 or 1.  Got: ${solved_num}`)
    }

    const solved = solved_num === 1;

    const seedIndices = Array.from(seedsFromDestringified(takeNextN(MAX_SEEDS)));

    const opIndices = [];

    for (const opIndex of takeNextN(MAX_OPS)) { 
        if(opIndex === NO_OP) {
            continue;
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
    
    let allSubmitted = true;

    for (const opIndex of takeNextN(MAX_MOVES)) {
        const submitted = 1===next();
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
        let move;
        if (opIndex === NO_MOVE) {
            continue;
        } else if (opIndex === NO_OP) {
            move = new Move(null, submitted, operandIndices);
        } else if ((0 <= opIndex) && (opIndex < OP_SYMBOLS.length)) {
            move = new Move(opIndex, submitted, operandIndices);
        } else {
            throw new Error(`Unrecognised op index: ${opIndex}. `
                           + `Must be between 0 and ${OP_SYMBOLS.length-1} inc, `
                           +`or ===NO_OP code ${NO_OP}`
            );
        }
        moves.push(move);
    }

    const redHerrings = [];
    for (const seedIndex of takeNextN(MAX_SEEDS)) {
        if(seedIndex === NO_SEED) {
            continue;
        } else if ((0 <= seedIndex) && (seedIndex < SEEDS.length)) {
            redHerrings.push(seedIndex);
        } else {
            throw new Error(`Unsupported seed index: ${seedIndex}. `
                           + `Must be between 0 and ${SEEDS.length-1}, `
                           +`or ===NO_SEED code ${NO_SEED}`
            );
        }
    }

    const seedsDisplayOrder = [];
    for (const indexOfIndex of takeNextN(MAX_SEEDS)) {
        if(indexOfIndex === NO_SEED) {
            continue;
        } else if ((0 <= indexOfIndex) && (indexOfIndex < MAX_SEEDS)) {
            seedsDisplayOrder.push(indexOfIndex);
        } else {
            throw new Error(`Unsupported index: ${indexOfIndex}. `
                           + `Must be between 0 and ${MAX_SEEDS-1}, `
                           +`or ===NO_SEED code ${NO_SEED}`
            );
        }
    }




    const state = new GameState(solved, moves);
    const game = new Game(
        id,
        timeStamp,
        seedIndices,
        opIndices,
        state,
        redHerrings,
        seedsDisplayOrder,    
    );

    return game;
}




// export const destringifyGame = function(stringified: string, id: GameID): Game {
//     const GameIDClass = getStringifiedGameIDClass(stringified);


// }



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

export const checkItemsFitAndPadIterable = function*(
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
    

    for (const chunk of chunkify(game.timestamp_ms, 3)) {
        yield chunk;
    }

    const solved_num = (game.state.solved === true ? 1 : 0);
    yield solved_num;

    for (const seedIndex of checkItemsFitAndPadIterable(
                game.seedIndices, MAX_SEEDS, NO_SEED)) { 
        yield seedIndex;
    }

    for (const opIndex of checkItemsFitAndPadIterable(
                game.opIndices ?? [], MAX_OPS, NO_OP)) { 
        yield opIndex;
    }

    const movesPadValue = new Move(NO_MOVE,false, Array(MAX_OPERANDS).fill(NO_OPERAND));

    for (const move of checkAndPadIterable(game.state.moves, MAX_MOVES, movesPadValue )) {
        yield move.opIndex ?? NO_OP;
        yield move.submitted ? 1 : 0;
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

    
    for (const seedIndex of checkItemsFitAndPadIterable(
        game.redHerrings, MAX_SEEDS, NO_SEED)) { 
        yield seedIndex;
    }
    
    for (const seedIndex of checkItemsFitAndPadIterable(
        game.seedsDisplayOrder, MAX_SEEDS, NO_SEED)) { 
        yield seedIndex;
    }



}


export const stringifyGame = function(game: Game): string {

    const val = SCHEMA_CODE;

    return val.concat(stringifyCodeUnits(Array.from(gameDataCodeUnits(game))));
}
