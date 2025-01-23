
import { immerable } from 'immer';
import {
  ALL_SEEDS,
  BINARY_OP,
  GOAL_MIN,
  INVALID_ARGS,
  MAX_OPS,
  MAX_SEEDS,
  MAX_MOVES,
  NUM_REQUIRED_OPERANDS,
  OP_RESULT,
  OP_SYMBOLS,
  Operand,
  OPS,
  randomPositiveInteger,
  SEEDS,
  GRADERS,
} from './Core';
import { solutionExpr } from './solutionEvaluator';
// import { solutions, EXPR_PATTERN } from './solverDFS';
import { EXPR_PATTERN } from './solverDFS';
import { makeCaches } from './Tnetennums/Cachebuilder';
import { find_solutions } from './Tnetennums/Solver';



export class GameIDBase {
  [immerable] = true;
  typeCode: string = '';
  constructor() {
    if (this.constructor === GameIDBase) {
      throw new Error('Not enough info to identify a game uniquely.');
    }
  }
}

export class CustomGameID extends GameIDBase {
  [immerable] = true;
  static readonly GAME_ID_TYPE_CODE = 'C';
  goal: number;
  seedIndices: number[];
  grade: number | null;
  form: string | null;

  constructor(
    goal: number = GOAL_MIN,
    seedIndices: number[] = [],
    grade: number | null = null,
    form: string | null = null
  ) {
    super();
    this.typeCode = CustomGameID.GAME_ID_TYPE_CODE;
    this.goal = goal;
    this.seedIndices = seedIndices;
    this.grade = grade;
    this.form = form;
  }

  seeds(): number[] {
    return Array.from(this.seedIndices.map((seedIndex) => SEEDS[seedIndex]));
  }
}

export class GradedGameID extends GameIDBase {
  [immerable] = true;
  readonly grade: number;
  // readonly form: string;
  readonly index: number;
  static readonly GAME_ID_TYPE_CODE = 'G';
  readonly form: string;
  readonly goal: number;

  constructor(grade: number, goal: number, form: string, index: number) {
    super();
    this.typeCode = GradedGameID.GAME_ID_TYPE_CODE;
    this.grade = grade;
    this.goal = goal;
    this.form = form;
    this.index = index;
  }
}

export type GameID = GradedGameID | CustomGameID;

export const HINT_UNDO = Symbol();

export class Move {
  // A simple base class, only for holding data,
  // e.g. for storing hints.
  [immerable] = true;
  opIndex: number | null;
  operandIndices: number[];
  readonly grade: number | null;

  constructor(
    opIndex: number | null = null,
    operandIndices: number[] = [],
    grade: number | null = null,
    ) {
    this.opIndex = opIndex;
    this.operandIndices = operandIndices;
    this.grade = grade;
  }

  opSymbol(): string | null {
    if (this.opIndex === null) {
      return null;
    }
    return OP_SYMBOLS[this.opIndex];
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
    const selected_operands = this.operandIndices.map((index) => operands[index]);
    const [x, y] = selected_operands;
    const retval = op(x, y);

    if (retval === INVALID_ARGS) {
      return null;
    }

    return retval;
  }

  codeUnit(): number {
      // There are only a hundred or so possibilities for Move's data, 
      // given 4 ops and a max of 6 operand indices, so we enumerate
      // them and produce a unique string code-point for each.

      // Belt and braces, add a double check in the encoding that 
      // fields are not null.
      // Zero if nullish
      let retval = ((this.operandIndices[0] ?? -1) + 1) * (MAX_SEEDS+1) * (OP_SYMBOLS.length+1);
      // +Zero if nullish.#
      retval +=    ((this.operandIndices[1] ?? -1) + 1) * (OP_SYMBOLS.length+1);
      // +Zero if nullish.
      // Use 5 pretend ops, instead of 4, and add 1 to encode nullish.
      retval += ((this.opIndex ?? -1) + 1);
      return retval

  }

  static fromCodeUnit(x: number, grade: number | null = null): Move {

      const opIndexPart = x % (OP_SYMBOLS.length + 1);
      const operandIndex1Part = x % ((OP_SYMBOLS.length + 1)*(MAX_SEEDS+1))- opIndexPart; 
      const operandIndex0Part = x - operandIndex1Part - opIndexPart;

      const opIndexVal = opIndexPart - 1;
      const operandIndex1Val = Math.floor(operandIndex1Part / (OP_SYMBOLS.length+1)) - 1
      const operandIndex0Val = Math.floor(operandIndex0Part / ((MAX_SEEDS+1) * (OP_SYMBOLS.length+1))) - 1;

      const opIndex = opIndexVal === -1 ? null : opIndexVal;
      const operandIndices = [];
      if (operandIndex0Val >= 0) {
          operandIndices.push(operandIndex0Val);
          if (operandIndex1Val >= 0) {
              operandIndices.push(operandIndex1Val);
          }
      }
      const move = new Move(opIndex,operandIndices,grade);
      return move;
  }
}

export type Hints = Record<string,Move | typeof HINT_UNDO>;

export class GameState {
  [immerable] = true;
  solved: boolean;
  submittedMoves: Move[];
  hints: Hints;
  currentMove: Move;

  constructor(
    solved: boolean = false,
    submittedMoves: Move[] = [],
    hints: Hints = {},
    currentMove: Move = new Move(),
    ) {
    this.solved = solved;
    this.submittedMoves = submittedMoves;
    this.hints = hints;
    this.currentMove = currentMove;
  }


  static _makeHintKey(moves: Move[]): string {
    return moves.map((move) => String.fromCharCode(move.codeUnit())).join("");
  }


  _hintKey(testMoves: Move[] | null = null): string {
      // Using this key means it is possible, if the hint is not taken,
      // for the player to receive a duplicate hint, but have the
      // score deducted by the hint's grade twice.  So be it!
      const moves = testMoves ?? this.submittedMoves;
      return GameState._makeHintKey(moves);
  }

  _getHint(): Move | typeof HINT_UNDO {
      return this.hints[this._hintKey()];
  }

  setHint(hint: Move | typeof HINT_UNDO): void {
      this.hints[this._hintKey()] = hint;
  }

  _hasHint(): boolean {
      return this._hintKey() in this.hints
  }

  hintAvailable(): boolean {
      return this._hasHint();
  }


  getHint(): Move | typeof HINT_UNDO | undefined{
      return this._getHint();
  }


  submitLatestMove(): void {
    
    if (this.submittedMoves.length < MAX_MOVES) {
      this.submittedMoves.push(this.currentMove);
      this.currentMove = new Move();
    }
  }

  undoLastSubmittedMove(): void {
  
    this.submittedMoves.pop();

    // Overwrite previous current Move.  Its 
    // operand indices could no longer refer to the
    // correct operands, after the Undo restores
    // two new operands.
    this.currentMove = new Move();
  }
}

const randomlyOrderedIndices = function (num: number): number[] {
  const indices = Array(num)
    .fill(undefined)
    .map((_x, i) => i);
  const retval = [];
  while (indices.length) {
    const indexOfIndex = randomPositiveInteger(indices.length);
    retval.push(indices[indexOfIndex]);
    indices.splice(indexOfIndex, 1);
  }
  return retval;
};

export function getRedHerringIndices(seedIndices: number[]): number[] {
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

export const getHintsAndGrades = function* (
  expression: string
): IterableIterator<[string, number, number, number, string, number]> {
  let expr = expression;
  const matches = expr.matchAll(EXPR_PATTERN);
  for (const match of matches) {
    if (!match?.groups) {
      continue;
    }
    const seed1 = parseInt(match!.groups.seed1, 10);
    const seed2 = parseInt(match!.groups.seed2, 10);
    const opSymbol = match!.groups.op;

    const op = OPS[opSymbol];
    const val = op(seed1, seed2);
    if (val === INVALID_ARGS || val === null) {
      continue;
    }
    expr = expr.replace(match[0], val.toString());

    const grade = GRADERS[opSymbol](seed1, seed2);

    yield [match[0], val, seed1, seed2, opSymbol, grade];
  }
};

export const calcGrade = function (solution: Operand): number {
  let grade = 0;
  let expr = solution.expr;

  for (let i = 0; i < MAX_OPS; i++) {
    for (const [subExpr, val, _seed1, _seed2, _opSymbol, subGrade] of getHintsAndGrades(expr)) {
      expr = expr.replace(subExpr, val.toString(10));

      grade += subGrade;
    }
  }

  return grade;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getRedHerringIndicesWithoutMakingEasier = function (
  seedIndices: number[],
  goal: number,
  grade: number
): number[] {
  let redHerrings;
  while (true) {
    redHerrings = getRedHerringIndices(seedIndices);
    const seedIndicesAndRedHerrings = seedIndices.concat(redHerrings);

    makeCaches(seedIndicesAndRedHerrings, [goal]);

    let redHerringMakesGametooEasy = false;
    for (const solution of find_solutions(
      seedIndicesAndRedHerrings.map((i) => SEEDS[i]),
      goal,
      'all'
    )) {
      if (solution.grade < grade) {
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
};

export const numSeedsFromForm = function (form: string): number {
  let total = 0;
  for (const match of form.matchAll(/\d+/g)) {
    total += parseInt(match[0], 10);
  }
  return total;
};

export class Game {
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

  constructor(
    id: GameID,
    timestamp_ms: number,
    seedIndices: number[],
    opIndices: number[] | null,
    state: GameState,
    // redHerrings: number[] = getRedHerringIndicesWithoutMakingEasier(seedIndices, id.goal, id.grade),
    redHerrings: number[] = getRedHerringIndices(seedIndices),
    seedsDisplayOrder: number[] = randomlyOrderedIndices(MAX_SEEDS)
  ) {
    this.id = id;
    this.timestamp_ms = timestamp_ms;
    this.seedIndices = seedIndices;
    this.opIndices = opIndices;
    this.state = state;
    this.redHerrings = redHerrings;

    if (seedsDisplayOrder.length !== redHerrings.length + seedIndices.length) {
      throw new Error(
        `Too many or too few indices of seed indices to display: ${seedsDisplayOrder} ` +
          `for seed indices: ${seedIndices} and red herrings: ${redHerrings}. `
      );
    }

    this.seedsDisplayOrder = seedsDisplayOrder;
  }

  seedsAndDecoyIndices(): number[] {
    return this.seedIndices.concat(this.redHerrings);
  }

  seeds(): number[] {
    return this.seedIndices.map((i) => SEEDS[i]);
  }

  seedsAndDecoys(): number[] {
    return this.seedsAndDecoyIndices().map((i) => SEEDS[i]);
  }

  currentOperandsDisplayOrder(
    
    // Allow the player to resume the game, and press submit to see
    // the win screen as many times as they like.
    testUnsubmittedMoves: boolean = false,
    ): number[] {
    const seedsAndDecoys = this.seedsAndDecoys();
    const operands = this.seedsDisplayOrder.map((i) => seedsAndDecoys[i]);

    const moves = Array.from(this.state.submittedMoves);

    if (testUnsubmittedMoves) {
        moves.push(this.state.currentMove);
    }

    for (const move of moves) {
      const op_symbol = move.opSymbol();

      const result = move.result(operands);
      // Submitted valid moves must be at the start of state.submittedMoves
      if (op_symbol === null || result === null) {
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
      } else if (move.operandIndices.length < NUM_REQUIRED_OPERANDS[op_symbol]) {
        break;
      } else {
        throw new Error(`Too many operands: ${move.operandIndices} in move ${move}`);
      }
    }

    return operands;
  }

  solved(
    // Allows the player can resume and press submit to see
    // the win screen as many times as they like.
    testUnsubmittedMoves: boolean = false,
    ): boolean {
    const operands = this.currentOperandsDisplayOrder(testUnsubmittedMoves);
    return operands.includes(this.id.goal);
  }

  _newHint(): Move | typeof HINT_UNDO {
    let easiestSolution = null;
    let easiestGrade = Infinity;
    const operands = this.currentOperandsDisplayOrder();
    const goal = this.id.goal;
    const form = this.id.form;
    const seeds = this.seeds();

    let expr: string;

    makeCaches(operands, [goal]);

    if (
      this.opIndices &&
      form !== null &&
      this.state.submittedMoves.length === 0
    ) {
      const ops = this.opIndices!.map((i) => OP_SYMBOLS[i]);
      // easiestSolution = solutionAsOperand(form, seeds, ops);
      // console.log('Decoding sol expr from game (ops and form are known)');
      // console.log(`form: ${form}, seeds: ${seeds}, ops: ${ops}, seed indices: ${this.seedIndices}`);
      expr = solutionExpr(form, seeds, ops);
      // solutionAsOperand(this.id.form as string, this.seeds(), this.opIndices!.map((i) => OP_SYMBOLS[i]));
    } else {
      // for (const solution of solutions(goal, operands)) {
      // console.log('Calculating solutions expr from game');
      for (const solution of find_solutions(operands, goal, 'all')) {
        // const grade = calcGrade(solution);
        const grade = solution.grade;
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
        // if (game.state.submittedMoves.length >= 1) {
        //   Highlight undo button
        // } else {
        // Tell user no solution found.  Prompt to select new game.
      }
      expr = easiestSolution.encodable;
    }

    // console.log(`easiestSolution: ${easiestSolution?.expr ?? "Null"}`);
    const [_subExpr, _val, operand1, operand2, opSymbol, _subGrade] =
      getHintsAndGrades(expr).next().value;

    const opIndex = OP_SYMBOLS.indexOf(opSymbol);
    // console.log(`expr: ${expr}`);
    // console.log(`operands: ${operands}, operand1: ${operand1}, operand2: ${operand2}`);
    // console.log(`subExpr: ${subExpr}, val: ${val}, opSymbol: ${opSymbol}, subGrade: ${subGrade}`);
    const index1 = operands.indexOf(operand1);
    const index2 = operands.lastIndexOf(operand2);
    const grade = GRADERS[opSymbol](operand1, operand2);
    return new Move(opIndex, [index1, index2], grade);
  }

  // mutates game state.  Only call from within an immer producer.
  addHint(): void {
    if (this.state.hintAvailable()) {
        return;
    }
    this.state.setHint(this._newHint());
    
  }

  getPoints(): number {

    let gameScore = this.id.grade ?? 0;

    for (const hint of Object.values(this.state.hints)) {
        if (hint === null || hint === HINT_UNDO) {
            continue;
        }
        gameScore -= 2*(hint.grade ?? 0);
    }
    // console.log(`gameScore: ${gameScore}`);
    return Math.max(1, gameScore);
  }

  getScore(): number {
      // console.log(`getScore called.  Grade: ${this.id.grade}.  Solved: ${this.solved(true)}`);
      if (this.id.grade === null || !this.solved(true)) {
        return 0;
      }

      return this.getPoints();
            
  }

}
