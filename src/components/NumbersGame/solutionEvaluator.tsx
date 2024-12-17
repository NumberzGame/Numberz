


import { InvalidEvent } from 'react';
import { OPS, SEEDS, INVALID_ARGS, OP_SYMBOLS } from './Core';


const throwIfInvalidArgsOrNull = function(result: number | null | typeof INVALID_ARGS) {
    
    if (result === INVALID_ARGS) {
        throw new Error(`Could not evaluate solution.  Indivisible. `);
    } 

    if (result === null) {

        throw new Error(`Could not evaluate solution.  Null.  (Empty brackets or 0 seeds). `);
    }

}


export const evalSolution = function(
    form: string,
    seeds: Iterable<number>,
    opSymbols: Iterable<string>,
    ): number | null {

    const formCharsIterator = form[Symbol.iterator]();
    const seedIterator = seeds[Symbol.iterator]();
    const opSymbolIterator = opSymbols[Symbol.iterator]();

    const nextSeed = () => seedIterator.next().value;
    const nextOp = () => OPS[opSymbolIterator.next().value];

    const evalSolutionFromIterators = function(
        valSoFar: number | null = null,
        until: string = '',
        ): number | null {
        for (const char of formCharsIterator) {
            // Ignore whitespace, 0s and underscores.
            if (!char.trim() || '_0'.includes(char)) {
                continue;
            }

            if (char === until) {
                return valSoFar;
            }

            if (char === '(') {
                if (valSoFar === null) {
                    valSoFar = evalSolutionFromIterators(valSoFar, ')');
                } else {
                    const op = nextOp();

                    const subsolutionVal = evalSolutionFromIterators(valSoFar, ')')
                    throwIfInvalidArgsOrNull(subsolutionVal);

                    const result = op(valSoFar, subsolutionVal as number);
                    // console.log('After bracketed sub-solution, result: ', result);
                    throwIfInvalidArgsOrNull(result)
                    valSoFar = result as number;

                }
            }

            if ('123456789'.includes(char)) {
                
                let outerOp = null;
                if (valSoFar !== null) {
                    outerOp = nextOp()
                }

                let num = parseInt(char);

                let valOfStraight = nextSeed();
                
                for (let i=1; i < num; i++) {
                    const op = nextOp();
                    const seed = nextSeed()
                    // console.log('Value so far: ',valSoFar,' Seed: ',seed);
                    const result = op(valOfStraight, seed);
                    
                    // console.log('In for loop, result: ',result);
                    throwIfInvalidArgsOrNull(result)
                    valOfStraight = result as number;
                }

                if (outerOp === null) {
                    valSoFar = valOfStraight
                } else {
                    const result = outerOp(valSoFar!, valOfStraight);
                    throwIfInvalidArgsOrNull(result);
                    valSoFar = result as number;
                }

                
            }
        }

        // Only needed if there weren't enough closing brackets?
        return valSoFar;
    }


    return evalSolutionFromIterators(null);
};


export const solutionExpr = function(
    form: string,
    seeds: Iterable<number>,
    opSymbols: Iterable<string>,
    ): string {

    const seedIterator = seeds[Symbol.iterator]();
    const opSymbolIterator = opSymbols[Symbol.iterator]();

    const nextSeedStr = () => seedIterator.next().value.toString();
    const nextOpSymbol = () => ` ${opSymbolIterator.next().value} `;

    const opExpr = ' o ';
    const seedExpr = '1';
    let retval = form.replaceAll('_', opExpr);
    for (let i = 6; i > 1; i--) {
        retval = retval.replaceAll(i.toString(),`(${i-1}${opExpr}${seedExpr})`);
    }

    retval = retval.replaceAll(opExpr, nextOpSymbol);
    retval = retval.replaceAll(seedExpr, nextSeedStr);
    retval = retval.replaceAll('//', '/');

    return retval;
}

// const form = '(((2_2)_1)_1)';
// const seeds = [10, 10, 1, 50, 100, 5]
// const opSymbols = ['+', '*', '+', '+', '//']

// console.log(evalSolution(form, seeds, opSymbols));
// console.log(solutionExpr(form, seeds, opSymbols));