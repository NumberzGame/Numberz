

import { intDecoder, getBitWidthsEncodingsAndDecodings } from 'sub_byte';

import { SEEDS, ALL_SEEDS, OP_SYMBOLS, randomPositiveInteger, takeNextN} from "./Core";
import { evalSolution, } from './solutionEvaluator';
import { Game, GradedGameID, GameState, numSeedsFromForm } from './Classes';



const seedsValueSets = [ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS];
const opsValueSets= [OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, ];

const [seedsBitWidths, seedsEncodings, seedsDecodings] = getBitWidthsEncodingsAndDecodings(seedsValueSets)
const [opsBitWidths, opsEncodings, opsDecodings] = getBitWidthsEncodingsAndDecodings(opsValueSets)

const bitWidths = seedsBitWidths.concat(opsBitWidths);

export function decodeSolsFromGoalFormAndBinaryData(goal: number, form: string, data: Uint8Array): [number[], number[]][] {
    const dataNums = Uint8Array.from(data);

    const dataIterator = dataNums[Symbol.iterator]() as IterableIterator<number>;

    const seedIndicesAndOpIndices: [number[], number[]][]  = [];

    const numSeeds = numSeedsFromForm(form);
    const numOps = numSeeds - 1;

    while (true) {

        const decodedSymbols = intDecoder(dataIterator, numSeeds + numOps, bitWidths);

        const seedIndices = Array.from(takeNextN(numSeeds, decodedSymbols));
        const opIndices = Array.from(takeNextN(numOps, decodedSymbols));
        
        const seeds = seedIndices.map(seedIndex => SEEDS[seedIndex]);
        const opSymbols = opIndices.map(opIndex => OP_SYMBOLS[opIndex]);
        if (seeds.length < numSeeds || opSymbols.length < numOps) {
        break;
        }

        if (evalSolution(form, seeds, opSymbols) !== goal) {
            throw new Error(`Invalid solution. Form: ${form}, seeds: ${seeds}, ops: ${opSymbols}`);
        }
        seedIndicesAndOpIndices.push([seedIndices, opIndices]);
    }

        return seedIndicesAndOpIndices;

    }


export function randomGameFromGradeGoalFormAndSols(
    grade: number,
    goal: number,
    form: string,
    seedIndicesAndOpIndices: [number[], number[]][],
    ): Game {

    const index = randomPositiveInteger(seedIndicesAndOpIndices.length);
    const id = new GradedGameID(grade, goal, form, index);


    const [seedIndices, opIndices] = seedIndicesAndOpIndices[index];

    const state = new GameState();
    const datetime_ms = Date.now();
    const game = new Game(id, datetime_ms, seedIndices, opIndices, state);

    return game;
}