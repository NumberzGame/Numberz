
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