
import { GameID, GameData, GameState } from './Classes';


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

const MAX_U15 = (1 << 15 - 1);  //32767

const fits_in_u15 = function(x: number): boolean {
    return (0 <= x) && (x <= MAX_U15);
}

const check_fits_in_u15 = function(x: number) {
    if (fits_in_u15(x)) {
        throw new Error(`An internal error occurred. Number must be >= 0 and <= ${MAX_U15}.  Got: ${x}`);
    }
}

const KeyReader = function(s: string): GameID {

    const id = new GameID(10, 110, 6, 0);

    return id;
}
const KeyWriter = function(gameID: GameID): string {
    check_fits_in_u15(gameID.grade);
    check_fits_in_u15(gameID.goal);
    let key = "";

    return key
}
const ValReader = function(s: string): GameData {

    const state = new GameState(false, []);
    const game = new GameData(Date.now(), state);

    return game;
}
const ValWriter = function(gameData: GameData): string {

    let val = "";

    return val
}


export function GetReadersAndWriters() {
    return [KeyReader, KeyWriter, ValReader, ValWriter];
}