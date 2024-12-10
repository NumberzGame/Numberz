import { SEEDS, OP_SYMBOLS, OPS, INVALID_ARGS, NUM_REQUIRED_OPERANDS } from './Core';


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

    // Date-time (milli seconds since 1970)
    // when this GameID was first shown.
    readonly timestamp_ms: number;

    // Indices of seeds in deduped symbols.json["SEEDS"]
    readonly seedIndices: number[];

    // The game's solution
    readonly opIndices: number[];

    state: GameState;

    constructor(id: GameID,
                timestamp_ms: number,
                seedIndices: number[],
                opIndices: number[],
                state: GameState,
               ) {
        this.id = id;
        this.timestamp_ms = timestamp_ms;
        this.seedIndices = seedIndices;
        this.state = state;
        this.opIndices = opIndices;
    }


    // TODO:  COMPLETE!
    currentOperands(): number[] {
        const operands = Array.from(this.seedIndices.map(index => SEEDS[index]));

        for (const move of this.state.moves) {

            // Every Move is required to have an opIndex
            const op_symbol = OP_SYMBOLS[move.opIndex];

            if (move.operandIndices.length === NUM_REQUIRED_OPERANDS[op_symbol]) {
                const op = OPS[op_symbol];
                const [i, j] = move.operandIndices;
                const selected_operands = move.operandIndices.map(index => operands[index]);
                const [x, y] = selected_operands;
                const result = op(x, y);
                if (result === INVALID_ARGS) {
                    throw new Error(`Invalid operands: ${selected_operands} for op ${op}. Unsupported move: ${move}`);
                } else {
                    // replace first operand with result
                    operands[i] = result;
                    // delete second operand
                    operands.splice(j, 1);
                }

            } else if  (move.operandIndices.length < NUM_REQUIRED_OPERANDS[op_symbol]){
                break
            } else {
                throw new Error(`Too many operands: ${move.operandIndices} in move ${move}`); 
            }

        }

        return operands;
    }

    solved(): Boolean {
        const operands = this.currentOperands();
        return operands.includes(this.id.goal);
    }
  }