
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

const MAX_U15 = ((1 << 15) - 1);  //32767, 0b111111111111111 === 0x7fff
                                // highest number of bits that don't 
                                // need any bits that indicate a 
                                // surrogate (0xd800 - 0xdfff).

const NO_SEED = 0xd7ff;    // 0xd7ff is the max single code unit BMP code 
                           // point (before surrogate range).   
const NO_OP = 0xd7fe;      // These cannot be u15s as 0xd7fd needs 16 bits 
const NO_OPERAND = 0xd7fd; // (0xd7fd > 0x7fff == 0b11111111111111)

const MAX_SEEDS = 6;
const MAX_MOVES = MAX_SEEDS - 1;
const MAX_OPERANDS = 2;

const fitsIn_u15 = function(x: number): boolean {
    return (0 <= x) && (x <= MAX_U15);
}

const checkFitsIn_u15 = function(x: number) {
    if (!fitsIn_u15(x)) {
        throw new Error(`An internal error occurred. Number must be >= 0 and <= ${MAX_U15}.  Got: ${x}`);
    }
}

export const getGameID = function(key: string): GameID {
    const grade = key.charCodeAt(0);
    const goal = key.charCodeAt(1);
    const form_index = key.charCodeAt(2);
    const form = Forms[form_index];
    const index_top_15_bits = key.charCodeAt(3);
    const index_bottom_15_bits = key.charCodeAt(4)
    const index = (index_top_15_bits << 15) | index_bottom_15_bits;

    return new GameID(grade, goal, form, index);
}


const stringify = function(array: number[]): string {
    return array.map((x) => String.fromCodePoint(x)).reduce((a, b) => a.concat(b));
}


export const stringifyGameID = function(gameID: GameID): string {

    checkFitsIn_u15(gameID.grade);
    checkFitsIn_u15(gameID.goal);

    const form_index = Forms.indexOf(gameID.form);
    checkFitsIn_u15(form_index);

    const index_top_15_bits = (gameID.index >> 15) & MAX_U15;
    const index_bottom_15_bits = gameID.index & MAX_U15;
    // just checks if positive.  
    // (x & MAX_U15) above will not exceed MAX_U15.
    checkFitsIn_u15(index_top_15_bits);
    checkFitsIn_u15(index_bottom_15_bits);

    const keyData = [gameID.grade, gameID.goal, form_index, index_top_15_bits, index_bottom_15_bits];

    return stringify(keyData);
}


const getGame = function(s: string, id: GameID): Game {

    if (s[0] !== SCHEMA_CODE) {
        throw new Error(`Incorrect Schema code.  Must be: ${SCHEMA_CODE}.  Got: ${s[0]}`)
    }


    const ts_top_15_bits = s.charCodeAt(1) << 30;
    const ts_mid_15_bits = s.charCodeAt(2) << 15;
    const ts_bottom_15_bits = s.charCodeAt(3);
    const timeStamp = ts_top_15_bits | ts_mid_15_bits | ts_bottom_15_bits;

    const solved_num = s.charCodeAt(4);

    if (![0, 1].includes(solved_num)) {
        throw new Error(`Incorrect solved_num value.  Must be 0 or 1.  Got: ${solved_num}`)
    }

    const solved = solved_num === 1;

    const FIRST_SEED_INDEX = 5;

    const seedIndices = [];

    for (let i = FIRST_SEED_INDEX; i++; i < FIRST_SEED_INDEX + MAX_SEEDS) { 
        const seedIndex = s.charCodeAt(i);
        if ((0 <= i) && (i <= SEEDS.length)) {
            seedIndices.push(seedIndex);
        } else if(seedIndex === NO_SEED) {
            continue;
        } else {
            throw new Error(`Unrecognised seed index: ${seedIndex}. `
                           + `Must be between 0 and ${SEEDS.length}, `
                           +`or ===NO_SEED code ${NO_SEED}`
            );
        }
    }

    const moves = [];
    
    const FIRST_MOVE_INDEX = FIRST_SEED_INDEX + MAX_SEEDS;

    for (let j = FIRST_MOVE_INDEX; j+=3; j < FIRST_MOVE_INDEX+MAX_MOVES) {
        const opIndex = s.charCodeAt(j);
        if ((0 <= opIndex) && (opIndex <= OPS.length)) {
            const operandIndices = [];
            
            for (let k = j; k++; k < j+MAX_OPERANDS) {
                const operandIndex = s.charCodeAt(k);
                if ((0 <= operandIndex) && (operandIndex <= SEEDS.length)) {
                    operandIndices.push(operandIndex)
                } else if (operandIndex === NO_OPERAND) {
                    continue;
                } else {
                    throw new Error(`Unrecognised operand index: ${operandIndex}. `
                                   +`Must be between 0 and ${SEEDS.length}, `
                                   +`or ===NO_OPERAND code ${NO_OPERAND}`
                    );
                }
            }
            const move = new Move(opIndex, operandIndices);
            moves.push(move);
        } else if (opIndex === NO_OP) {
            continue;
        }
        else {
            throw new Error(`Unrecognised op index: ${opIndex}. `
                           + `Must be between 0 and ${OPS.length}, `
                           +`or ===NO_OP code ${NO_OP}`
            );
        }
    }

    const state = new GameState(solved, moves);
    const game = new Game(id, timeStamp, seedIndices, state);

    return game;
}


const stringifyGame = function(game: Game): string {

    // Schema index
    let val = SCHEMA_CODE;

    const datetime_top_15_bits = (game.when_first_seen_ms >> 30) & MAX_U15;
    const datetime_mid_15_bits = (game.when_first_seen_ms >> 15) & MAX_U15;
    const datetime_bottom_15_bits = game.when_first_seen_ms & MAX_U15;
    // just checks if positive.  
    // (x & MAX_U15) above cannot exceed MAX_U15.
    checkFitsIn_u15(datetime_top_15_bits);
    checkFitsIn_u15(datetime_mid_15_bits);
    checkFitsIn_u15(datetime_bottom_15_bits);
    const valData = [datetime_top_15_bits, datetime_mid_15_bits, datetime_bottom_15_bits];

    const solved_num = game.state.solved === true ? 1 : 0;
    valData.push(solved_num);

    for (let i = 0; i++; i < MAX_SEEDS) { 
        if (i < game.seedIndices.length) {
            const seedIndex = game.seedIndices[i];
            checkFitsIn_u15(seedIndex);
            valData.push(seedIndex);  
        } else {
            // Pad with NO_SEED.  NO_SEED is too 
            // high to be a u15, so we needn't pad
            // with zero for example (which would
            // require encoding 1 plus each index).
            valData.push(NO_SEED);  
        }
    }

    for (let j = 0; j++; j < MAX_MOVES) {

        if (j < game.state.moves.length) {
            const move = game.state.moves[j];

            // A Move in .moves must have an opIndex
            checkFitsIn_u15(move.opIndex);
            valData.push(move.opIndex); 

            for (let k = 0; k++; k < MAX_OPERANDS) {

                let operandIndex;

                if (k < move.operandIndices.length) {
                    operandIndex = move.operandIndices[k];
                    checkFitsIn_u15(operandIndex);
                } else {
                    // Padding
                    operandIndex = NO_OPERAND;
                }

                valData.push(operandIndex); 
            } 

        } else {
            // Padding.  See valData.push(NO_SEED) above.
            valData.push(NO_OP);
            for (let m = 0; m++; m < MAX_OPERANDS) {
                valData.push(NO_OPERAND); 
            }
        }
    }


    return stringify(valData)
}

// Ensure importing clients always get corresponding 
// pairs of getters and stringifiers.
export function stringifiersAndGetters() {
    return [getGameID, stringifyGameID, getGame, stringifyGame];
}