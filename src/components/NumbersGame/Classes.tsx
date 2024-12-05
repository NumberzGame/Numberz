// All possible keys in all distribution.jsons:
// '((3_2)_1)', '(((2_2)_1)_1)', '(3_2)', '5', '6', '((2_2)_2)', 
// '(4_2)', '(2_2)', '2', '((2_2)_1)', '(3_3)', '3', '4'
// E.g. {"5": 20830, "((2_2)_2)": 4508, "(((2_2)_1)_1)": 5276, "4": 3773, "(3_3)": 43117,
// "(4_2)": 28367, "6": 57530, "((3_2)_1)": 920, "(2_2)": 260, "((2_2)_1)": 2098, 
// "3": 216, "(3_2)": 739, "2": 2}
export const Forms=Object.freeze([
    "2",
    "3",
    "4",
    "(2_2)",
    "5",
    "(3_2)",
    "((2_2)_1)",
    "6",
    "(4_2)",
    "(3_3)",
    "((2_2)_2)",
    "((3_2)_1)",
    "(((2_2)_1)_1)",
]);


export class GameID{
    readonly grade: number;
    readonly goal: number;
    readonly form: string;
    readonly index: number;

    constructor(grade: number, goal: number, form: string, index: number) {
        this.grade = grade;
        this.goal = goal;
        this.form = form;
        this.index = index;
    }
  }

export class Move{
    opIndex: number;
    operandIndices: number[];

    constructor(opIndex: number, operandIndices: number[]) {
        this.opIndex = opIndex;
        this.operandIndices = operandIndices;
    }
}

export class GameState{
      solved: boolean;
      moves: Move[];
  
      constructor(solved: boolean, moves: Move[]) {
          this.solved = solved;
          this.moves = moves;
      }
    }

export class Game{
    id: GameID;
    readonly when_first_seen_ms: number;

    // Indices of seeds in deduped symbols.json["SEEDS"]
    readonly seedIndices: number[];

    state: GameState;

    constructor(id: GameID, when_first_seen_ms: number, seedIndices: number[], state: GameState) {
        this.id = id
        this.when_first_seen_ms = when_first_seen_ms;
        this.seedIndices = seedIndices;
        this.state = state;
    }
  }