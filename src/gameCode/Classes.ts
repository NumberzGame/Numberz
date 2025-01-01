
import {immerable} from "immer"

import { difficultyOfSum, difficultyOfProduct,
         difficultyOfDifference, difficultyOfLongDivision } from "additional_difficulty";

import { ALL_SEEDS, SEEDS, OP_SYMBOLS, OPS, INVALID_ARGS, NUM_REQUIRED_OPERANDS, BINARY_OP, GOAL_MIN } from './Core';
import { MAX_SEEDS, MAX_OPS, OP_RESULT, Operand, randomPositiveInteger } from "./Core";
import { solutions, EXPR_PATTERN } from './solverDFS';
import { solutionAsOperand } from "./solutionEvaluator";



type GRADER = (x: number, y: number, r?: number, c?: number) => number;

const GRADERS_LIST: GRADER[] = [
    difficultyOfSum,
    difficultyOfProduct,
    difficultyOfDifference,
    difficultyOfLongDivision,
]


const GRADERS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op, i) => [op, GRADERS_LIST[i]])));


export class GameIDBase{
    
    [immerable] = true;
    form: string | null;

    constructor() {
        if (this.constructor === GameIDBase) {
            throw new Error("Not enough info to identify a game uniquely.");
        }
        this.form = null;
    }


}

export class CustomGameID extends GameIDBase{
    [immerable] = true;
    seedIndices: number[];
    static readonly GAME_ID_TYPE_CODE = "C";
    goal: number;
    

    constructor(goal: number = GOAL_MIN, seedIndices: number[] = []) {
        super();
        this.goal = goal;
        this.seedIndices = seedIndices
    }
}


export class GradedGameID extends GameIDBase{
    [immerable] = true;
    readonly grade: number;
    // readonly form: string;
    readonly index: number;
    static readonly GAME_ID_TYPE_CODE = "G";
    readonly form: string;
    readonly goal: number;

    constructor(grade: number, goal: number, form: string, index: number) {
        super();
        this.goal = goal;
        this.grade = grade;
        this.form = form;
        this.index = index;
    }
  }


export type GameID = GradedGameID | CustomGameID;

export const HINT_UNDO = Symbol();

class MoveData{
    // A simple base class, only for holding data, 
    // e.g. for storing hints.
    [immerable] = true;
    opIndex: number | null ;
    operandIndices: number[];

    constructor(
        opIndex: number | null = null,
        operandIndices: number[] = [],) {

        this.opIndex = opIndex;
        this.operandIndices = operandIndices;
    }

    
    opSymbol(): string | null {
        if (this.opIndex === null) {
            return null;
        }
        return OP_SYMBOLS[this.opIndex];
    }

}

export class Move extends MoveData {
    submitted: boolean ;

    constructor(
        opIndex: number | null = null,
        submitted: boolean = false,
        operandIndices: number[] = [],
        ) {
        
        if (opIndex === null && submitted)  {
            throw new Error('Cannot submit a Move with no Op. '
                           +`Got: opIndex: ${opIndex}, submitted: ${submitted}, `
                           +`operandIndices: ${operandIndices}. `
            );  
        }
        super(opIndex, operandIndices);
        this.submitted = submitted;
    }


    op(): BINARY_OP | null {
        const opSymbol = this.opSymbol();
        if (opSymbol === null) {
            return null;
        }
        return OPS[opSymbol];
    }

    result(operands: number[]): OP_RESULT | null {
        const op = this.op();
        if (op === null) {
            return null;
        }
        const selected_operands = this.operandIndices.map(index => operands[index]);
        const [x, y] = selected_operands;
        const retval= op(x, y);

        if (retval === INVALID_ARGS) {
            return null;
        }

        return retval;
    }
}

export class GameState{
    [immerable] = true;
    solved: boolean;
    moves: Move[];

    constructor(
        solved: boolean = false,
        moves: Move[] = [new Move()],
    ) {

        if (moves.length === 0) {
            // To ensure simple destringification,
            // using a no-op move for padding, 
            // is unambiguous.
            throw new Error(`moves cannot be empty.  Got: ${moves}`);
        }

        this.solved = solved;
        this.moves = moves;
    }

    // lastMove(): Move {
    //     const moves = this.moves;
    //     const len = moves.length;
    //     if (len > 0) {
    //         return moves[len-1];
    //     }
    //     const move = new Move();
    //     moves.push(move)
    //     return move;
    // }
}





const randomlyOrderedIndices = function(num: number): number[] {
    const indices = Array(num).fill(undefined).map((x, i) => i);
    const retval = [];
    while (indices.length) {
        const indexOfIndex = randomPositiveInteger(indices.length);
        retval.push(indices[indexOfIndex]);
        indices.splice(indexOfIndex, 1);
    }
    return retval
}



function getRedHerringIndices(seedIndices: number[]): number[]{

    const unusedSeeds = Array.from(ALL_SEEDS);
    // Can't use Array1.filter((x) => Array2.includes(x)) as that would remove all occurences from
    // ALL_SEEDS (which contains duplicates of small numbers).
    for (const seedIndex of seedIndices) {
        const usedSeedindex = unusedSeeds.indexOf(SEEDS[seedIndex]);
        // Delete first occurence of SEEDS[seedIndex] in unusedSeeds
        unusedSeeds.splice(usedSeedindex, 1);
    }

    const retval = [];
    // If MAX_SEEDS > ALL_SEEDS.length, there are no more seeds to use as red herrings.
    for (let i = seedIndices.length; i < MAX_SEEDS; i++) {
        const redHerringIndex = randomPositiveInteger(unusedSeeds.length);
        const redHerring = unusedSeeds[redHerringIndex];
        // Don't use same red Herring twice - delete it from unusedSeeds
        unusedSeeds.splice(redHerringIndex, 1);
        const index = SEEDS.indexOf(redHerring);
        retval.push(index);
        unusedSeeds.splice(redHerringIndex, 1);
    }
    return retval;
}


export const getHintsAndGrades = function*(expr: string): IterableIterator<[string,number, number, number,string,number]>{
    const matches = expr.matchAll(EXPR_PATTERN);
    for (const match of matches) {
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


export const calcGrade = function(solution: Operand): number {
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



const getRedHerringIndicesWithoutMakingEasier = function(
    seedIndices: number[],
    goal: number,
    grade: number,
    ): number[] {

    let redHerrings;
    while (true) {
        redHerrings = getRedHerringIndices(seedIndices);
        const seedIndicesAndRedHerrings = seedIndices.concat(redHerrings);
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
    return redHerrings;
}


export const numSeedsFromForm = function(form: string): number {
    let total = 0;
    for (const match of form.matchAll(/\d+/g)) {
        total += parseInt(match[0]);
    }
    return total
}


export class Game{
    [immerable] = true;
    id: GameID;

    // Date-time (milli seconds since 1970)
    // when this GameIDBase was first shown.
    readonly timestamp_ms: number;

    // Indices of seeds in deduped symbols.json["SEEDS"]
    readonly seedIndices: number[];

    // The game's solution, together with the form in the GameID
    // and the ordered seeds in seedIndices
    readonly opIndices: number[] | null;

    
    // (MAX_SEEDS - seedIndices.length) number of decoy seed indices
    readonly redHerrings: number[];

    // E.g. a random permutation of [0, ..., MAX_SEEDS - 1]
    readonly seedsDisplayOrder: number[];

    state: GameState;


    constructor(id: GameID,
                timestamp_ms: number,
                seedIndices: number[],
                opIndices: number[] | null,
                state: GameState,
                // redHerrings: number[] = getRedHerringIndicesWithoutMakingEasier(seedIndices, id.goal, id.grade),
                redHerrings: number[] = getRedHerringIndices(seedIndices),
                seedsDisplayOrder: number[] = randomlyOrderedIndices(MAX_SEEDS),
               ) {
        this.id = id;
        this.timestamp_ms = timestamp_ms;
        this.seedIndices = seedIndices;
        this.opIndices = opIndices;
        this.state = state;
        this.redHerrings = redHerrings;

        if (seedsDisplayOrder.length !== redHerrings.length + seedIndices.length) {
            throw new Error(
                 `Too many or too few indices of seed indices to display: ${seedsDisplayOrder} `
                +`for seed indices: ${seedIndices} and red herrings: ${redHerrings}. `
            );
        }

        this.seedsDisplayOrder = seedsDisplayOrder

    }


    seedsAndDecoyIndices(): number[] {
        return this.seedIndices.concat(this.redHerrings)
    }

    seeds(): number[] {
        return this.seedIndices.map((i) => SEEDS[i]);
    }

    seedsAndDecoys(): number[] {
        return this.seedsAndDecoyIndices().map((i) => SEEDS[i]);
    }

    currentOperandsDisplayOrder(testUnsubmittedMoves: boolean = false): number[] {

        const seedsAndDecoys = this.seedsAndDecoys();
        const operands= this.seedsDisplayOrder.map(i => seedsAndDecoys[i]);

        for (const move of this.state.moves) {

            
            const op_symbol = move.opSymbol();

            const result = move.result(operands);
            // Submitted valid moves must be at the start of state.moves
            if (op_symbol === null || result === null || (!move.submitted && !testUnsubmittedMoves)) {
                break;
            }


            if (move.operandIndices.length === NUM_REQUIRED_OPERANDS[op_symbol]) {
                if (result === INVALID_ARGS) {
                    throw new Error(`Invalid operands: ${operands} for move: ${move}`);
                } else {
                    const [i, j] = move.operandIndices;
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

    solved(testUnsubmittedMoves: boolean = false): boolean {
        const operands = this.currentOperandsDisplayOrder(testUnsubmittedMoves);
        return operands.includes(this.id.goal);
    }


    getHints(): MoveData | typeof HINT_UNDO {
            let easiestSolution = null;
            let easiestGrade = Infinity;
            const operands = this.currentOperandsDisplayOrder();
            // return new MoveData(OP_SYMBOLS.indexOf('+'), [operands.indexOf(1), operands.indexOf(2)]);
            // if (this.opIndices && this.id.form !== null && operands.length === numSeedsFromForm(this.id.form!)) {
            if (this.opIndices && this.id.form !== null && this.state.moves.findLastIndex((move) => move.submitted) === -1) {
                easiestSolution = solutionAsOperand(this.id.form as string, this.seeds(), this.opIndices!.map((i) => OP_SYMBOLS[i]));
            } else {
                for (const solution of solutions(this.id.goal, operands)) {
                    const grade = calcGrade(solution);
                    // We could break here on finding the first valid solution,
                    // and give the user the first hint that works,
                    // (not necessarily a hint compatible with the 
                    // easiest method).
                    if (grade < easiestGrade) {
                        easiestGrade = grade;
                        easiestSolution = solution;
                    }
                }
                if (easiestSolution === null) {
                    // No solution found. 
                    return HINT_UNDO;
                    // if (game.state.moves.length >= 1) {
                    //   Highlight undo button
                    // } else {
                    // Tell user no solution found.  Prompt to select new game.
                }
            }

            // console.log(`easiestSolution: ${easiestSolution?.expr ?? "Null"}`);
            const [subExpr, val, operand1, operand2, opSymbol, subGrade] = getHintsAndGrades(easiestSolution.expr).next().value;

            const opIndex = OP_SYMBOLS.indexOf(opSymbol);
            const index1 = operands.indexOf(operand1);
            const index2 = operands.lastIndexOf(operand2);
            return new MoveData(opIndex, [index1, index2]);
    }

    lastMove(): Move {
        return this.state.moves.at(-1)!
    }

    lastMoveOperandIndices(): number[] {
        return this.lastMove().operandIndices;
    }

  }