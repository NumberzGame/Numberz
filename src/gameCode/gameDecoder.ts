import { getBitWidthsEncodingsAndDecodings, intDecoder } from 'sub_byte';
import { Game, GameState, GradedGameID, numSeedsFromForm } from './Classes';
import { ALL_SEEDS, OP_SYMBOLS, randomPositiveInteger, SEEDS, takeNextN } from './Core';
import { evalSolution, solutionExpr } from './solutionEvaluator';

const bitWidthsFromNumSeeds = function (numSeeds: number): number[] {
  const numOps = numSeeds - 1;

  const seedsValueSets = Array(numSeeds).fill(ALL_SEEDS);
  const opsValueSets = Array(numOps).fill(OP_SYMBOLS);

  const [seedsBitWidths, seedsEncodings, seedsDecodings] =
    getBitWidthsEncodingsAndDecodings(seedsValueSets);
  const [opsBitWidths, opsEncodings, opsDecodings] =
    getBitWidthsEncodingsAndDecodings(opsValueSets);

  return seedsBitWidths.concat(opsBitWidths);
};

export function decodeSolsFromGoalFormAndBinaryData(
  goal: number,
  form: string,
  data: Uint8Array
): [[number[], number[]][], [number[], string[]][], string[]] {
  const dataIterator = data[Symbol.iterator]() as IterableIterator<number>;

  const seedIndicesAndOpIndices: [number[], number[]][] = [];
  const solSymbols: [number[], string[]][] = [];
  const solStrings: string[] = [];

  const numSeeds = numSeedsFromForm(form);
  const numOps = numSeeds - 1;

  const bitWidths = bitWidthsFromNumSeeds(numSeeds);

  const numBytesPerSol = Math.ceil((bitWidths[0] * numSeeds + bitWidths[numSeeds] * numOps) / 8);

  for (let p = 0; p <= data.length - numBytesPerSol; p += numBytesPerSol) {
    // while (true) {

    const decodedSymbols = intDecoder(dataIterator, numSeeds + numOps, bitWidths);

    const seedIndices = Array.from(takeNextN(numSeeds, decodedSymbols));
    const opIndices = Array.from(takeNextN(numOps, decodedSymbols));

    const seeds = seedIndices.map((seedIndex) => SEEDS[seedIndex]);
    const opSymbols = opIndices.map((opIndex) => OP_SYMBOLS[opIndex]);
    if (seeds.length < numSeeds || opSymbols.length < numOps) {
      break;
    }

    if (evalSolution(form, seeds, opSymbols) !== goal) {
      throw new Error(`Invalid solution. Form: ${form}, seeds: ${seeds}, ops: ${opSymbols}`);
    }
    seedIndicesAndOpIndices.push([seedIndices, opIndices]);
    solSymbols.push([seeds, opSymbols]);
    solStrings.push(solutionExpr(form, seeds, opSymbols));
  }

  return [seedIndicesAndOpIndices, solSymbols, solStrings];
}

export function randomGameFromGradeGoalFormAndSols(
  grade: number,
  goal: number,
  form: string,
  seedIndicesAndOpIndices: [number[], number[]][]
): Game {
  const index = randomPositiveInteger(seedIndicesAndOpIndices.length);
  const id = new GradedGameID(grade, goal, form, index);

  const [seedIndices, opIndices] = seedIndicesAndOpIndices[index];

  const state = new GameState();
  const datetime_ms = Date.now();
  const game = new Game(id, datetime_ms, seedIndices, opIndices, state);

  return game;
}
