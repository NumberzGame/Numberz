
import {immerable} from "immer"

import { difficultyOfSum, difficultyOfProduct,
         difficultyOfDifference, difficultyOfLongDivision } from "additional_difficulty";

import { ALL_SEEDS, SEEDS, OP_SYMBOLS, OPS, INVALID_ARGS, NUM_REQUIRED_OPERANDS } from './Core';
import { MAX_SEEDS, MAX_OPS } from "./Core";
import { solutions, Operand, EXPR_PATTERN } from './solverDFS';


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



type GRADER = (x: number, y: number, r?: number, c?: number) => number;

const GRADERS_LIST: GRADER[] = [
    difficultyOfSum,
    difficultyOfProduct,
    difficultyOfDifference,
    difficultyOfLongDivision,
]


const GRADERS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op, i) => [op, GRADERS_LIST[i]])));


export class GameID{
    [immerable] = true;
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
    [immerable] = true;
    opIndex: number | null ;
    submitted: boolean ;
    operandIndices: number[];

    constructor(
        opIndex: number | null = null,
        submitted: boolean = false,
        operandIndices: number[] = []) {

        if (opIndex === null && submitted)  {
            throw new Error('Cannot submit a Move with no Op. '
                           +`Got: opIndex: ${opIndex}, submitted: ${submitted}, `
                           +`operandIndices: ${operandIndices}. `
            );  
        }

        this.opIndex = opIndex;
        this.submitted = submitted;
        this.operandIndices = operandIndices;
    }
}

export class GameState{
    [immerable] = true;
    solved: boolean;
    moves: Move[];

    constructor(solved: boolean = false, moves: Move[] = [new Move()]) {
        this.solved = solved;
        this.moves = moves;
    }
}


function randomIndexInto<Item>(sized: Item[]): number {
    return Math.floor(Math.random()*sized.length);
}


function* shuffle<T>(arr:T[]) {
    const itemsToYield = Array.from(arr);
    while (itemsToYield.length) {
        const index = randomIndexInto(itemsToYield);
        yield itemsToYield[index];
        // Delete the item at index from itemsToYield.
        itemsToYield.splice(index, 1);
    }
}


function addRedHerrings(seedIndices: number[]): number[]{

    const unusedSeeds = Array.from(ALL_SEEDS);
    // Can't use Array1.filter((x) => Array2.includes(x)) as that would remove all occurences from
    // ALL_SEEDS (which contains duplicates of small numbers).
    for (const seedIndex of seedIndices) {
        // Delete first occurence of SEEDS[seedIndex] in unusedSeeds
        const usedSeedindex = unusedSeeds.indexOf(SEEDS[seedIndex]);
        unusedSeeds.splice(usedSeedindex, 1);
    }

    const retval = [...seedIndices];
    // If MAX_SEEDS > ALL_SEEDS.length, there are no more seeds to use as red herrings.
    for (let i = seedIndices.length; i < MAX_SEEDS; i++) {
        const redHerringIndex = randomIndexInto(unusedSeeds);
        const redHerring = unusedSeeds[redHerringIndex];
        retval.push(redHerring);
        unusedSeeds.splice(redHerringIndex, 1);
    }
    return retval;
}


const getHintsAndGrades = function*(expr: string): IterableIterator<[string,number, number, number,string,number]>{
    for (const match of expr.matchAll(EXPR_PATTERN)) {
        const match = expr.match(EXPR_PATTERN);
        if (!match?.groups) {
            continue;
        }
        const seed1 = parseInt(match!.groups['seed1']);
        const seed2 = parseInt(match!.groups['seed2']);
        const opSymbol = match!.groups['op'];

        const op = OPS[opSymbol];
        const val = op(seed1, seed2);
        if (val === INVALID_ARGS) {
            continue
        }
        expr = expr.replace(match[0], val.toString());

        const grade = GRADERS[opSymbol](seed1, seed2);

        yield [match[0], val, seed1, seed2, opSymbol, grade];
    }
}


const calcGrade = function(solution: Operand): number {
    let grade = 0;
    let expr = solution.expr;

    for (let i=0; i < MAX_OPS; i++) {
        for (const [subExpr, val, seed1, seed2, opSymbol, subGrade] of getHintsAndGrades(expr)) {
            expr = expr.replace(subExpr, val.toString(10));

            grade += subGrade;
        }
    }

    return grade
}


const addRedHerringsWithoutMakingEasier = function(
    seedIndices: number[],
    goal: number,
    grade: number,
    ): number[] {

    let seedIndicesAndRedHerrings;
    while (true) {
        seedIndicesAndRedHerrings = addRedHerrings(seedIndices);
        let redHerringMakesGametooEasy = false;
        for (const solution of solutions(goal, seedIndicesAndRedHerrings.map((i) => SEEDS[i]))) {
            if (calcGrade(solution) < grade) {
                redHerringMakesGametooEasy = true;
                
                // break inner for loop
                break; 
            }
        }
        if (redHerringMakesGametooEasy) {
            continue;
        }
        break;
    }
    return seedIndicesAndRedHerrings;
}


export class Game{
    [immerable] = true;
    id: GameID;

    // Date-time (milli seconds since 1970)
    // when this GameID was first shown.
    readonly timestamp_ms: number;

    // Indices of seeds in deduped symbols.json["SEEDS"]
    readonly seedIndicesSolutionOrder: number[];

    // The game's solution, together with the form in the GameID
    // and the ordered seeds in seedIndicesSolutionOrder
    readonly opIndices: number[];

    // Shuffled, and containing decoys.  Else for forms of 
    // rank <= 5, the latter seeds will always be unused.
    // TODO: Make sure decoys don't make the solution easier.
    readonly seedIndices: number[];

    state: GameState;

    constructor(id: GameID,
                timestamp_ms: number,
                seedIndices: number[],
                opIndices: number[],
                state: GameState,
               ) {
        this.id = id;
        this.timestamp_ms = timestamp_ms;
        this.seedIndicesSolutionOrder = seedIndices;
        this.opIndices = opIndices;

        // seedIndices = addRedHerringsWithoutMakingEasier(
        //     seedIndices,
        //     this.id.goal,
        //     this.id.grade);

        this.seedIndices = Array.from(shuffle(seedIndices));
        this.state = state;

    }


    // TODO:  COMPLETE!
    currentOperands(): number[] {
        const operands = Array.from(this.seedIndices.map(index => SEEDS[index]));

        for (const move of this.state.moves) {

            // Submitted valid moves must be at the start of state.moves
            if (move.opIndex === null || !move.submitted) {
                break;
            }

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
                break;
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