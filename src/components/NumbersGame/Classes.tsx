
const Forms=[
    "2",
    "3",
    "4",
    "(2, 2)",
    "5",
    "(3, 2)",
    "(1, (2, 2))",
    "6",
    "(4, 2)",
    "(3, 3)",
    "(2, (2, 2))",
    "(1, (3, 2))",
    "(1, (1, (2, 2)))",
    // {"5": 20830, "((2_2)_2)": 4508, "(((2_2)_1)_1)": 5276, "4": 3773, "(3_3)": 43117, "(4_2)": 28367, "6": 57530, "((3_2)_1)": 920, "(2_2)": 260, "((2_2)_1)": 2098, "3": 216, "(3_2)": 739, "2": 2}
];


export class GameID{
    readonly grade: number;
    readonly goal: number;
    readonly form: number;
    readonly index: number;

    constructor(grade: number, goal: number, form: number, index: number) {
        this.grade = grade;
        this.goal = goal;
        this.form = form;
        this.index = index;
    }
  }

class Move{
    Op: string;
    Operands: [number];

    constructor(Op: string, Operands: [number]) {
        this.Op = Op;
        this.Operands = Operands;
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

export class GameData{
    readonly timestamp_ms: number;
    readonly state: GameState;

    constructor(timestamp_ms: number, state: GameState) {
        this.timestamp_ms = timestamp_ms;
        this.state = state;
    }
  }