
import { GameID, GameData, GameState, Forms } from './Classes';


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
//       seeds*6, u85 (6) (14 seeds in normal game, 10 small (twice) 4 large)
//         seed u4
//       current state of this game
//       moves*5 u225   (15)
//         move u9
//           Operand u3 (indices 0, 1, ..., 6)
//           Op u2 (+, -, *, //)

const MAX_U15 = (1 << 15 - 1);  //32767, 0b111111111111111
                                // highest number of bits that don't 
                                // need any bits that indicate a 
                                // surrogate (0xd800 - 0xdfff).

const fitsIn_u15 = function(x: number): boolean {
    return (0 <= x) && (x <= MAX_U15);
}

const checkFitsIn_u15 = function(x: number) {
    if (fitsIn_u15(x)) {
        throw new Error(`An internal error occurred. Number must be >= 0 and <= ${MAX_U15}.  Got: ${x}`);
    }
}

const getGameID = function(key: string): GameID {

    const id = new GameID(10, 110, Forms[6], 0);

    return id;
}



const stringifyGameID = function(gameID: GameID): string {

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
    const key = keyData.map((x) => String.fromCodePoint(x)).reduce((a, b) => a.concat(b));

    return key;
}


const getGameData = function(s: string): GameData {

    const state = new GameState(false, []);
    const gameData = new GameData(Date.now(), state);

    return gameData;
}
const stringifyGameData = function(gameData: GameData): string {

    let val = "";

    return val
}


export function GetReadersAndWriters() {
    return [getGameID, stringifyGameID, getGameData, stringifyGameData];
}