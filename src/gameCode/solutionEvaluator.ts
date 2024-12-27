


import { OPS, SEEDS, INVALID_ARGS, OP_SYMBOLS, Operand } from './Core';





export const evalSolution = function(
    form: string,
    seeds: Iterable<number>,
    opSymbols: Iterable<string>,
    ): number | null {


    const throwIfInvalidArgsOrNull = function(
        result: number | null | typeof INVALID_ARGS,
        arg1: any = null,
        arg2: any = null,
        ) {
        
        if (result === INVALID_ARGS) {
            throw new Error(
                `Could not evaluate solution.  Indivisible. `
                +`arg1: ${arg1}, arg2: ${arg2} `
                +`form: ${form}, seeds: ${seeds}, opSymbols: ${opSymbols}. `
            );
        } 

        if (result === null) {

            throw new Error(
                `Could not evaluate solution.  Null.  (Empty brackets or 0 seeds). `
                +`arg1: ${arg1}, arg2: ${arg2}`
                +`form: ${form}, seeds: ${seeds}, opSymbols: ${opSymbols}. `
            );
        }

    }


    const formCharsIterator = form[Symbol.iterator]();
    const seedIterator = seeds[Symbol.iterator]();
    const opSymbolIterator = opSymbols[Symbol.iterator]();

    const nextSeed = () => seedIterator.next().value;
    const nextOp = () => OPS[opSymbolIterator.next().value];
    // const nextOp = () => {const opSymbol = opSymbolIterator.next().value;
    //                       console.log(opSymbol);
    //                       return OPS[opSymbol];
    //                      }

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
                    throwIfInvalidArgsOrNull(result, valSoFar, subsolutionVal);
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
                    throwIfInvalidArgsOrNull(result, valOfStraight, seed)
                    valOfStraight = result as number;
                }

                if (outerOp === null) {
                    valSoFar = valOfStraight
                } else {
                    const result = outerOp(valSoFar!, valOfStraight);
                    throwIfInvalidArgsOrNull(result, valSoFar, valOfStraight);
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


export const solutionAsOperand = function(
    form: string,
    seeds: Iterable<number>,
    opSymbols: Iterable<string>,): Operand {

    const val = evalSolution(form, seeds, opSymbols);
    if (val === null) {
        throw new Error(`Solution evaluated to null, for: ${form}, ${seeds}, ${opSymbols}`);
    }

    const expr = solutionExpr(form, seeds, opSymbols);

    return new Operand(val, expr);

    }

// deno run --unstable-sloppy-imports --allow-read --allow-env solutionEvaluator.tsx 
// or:
// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=solutionEvaluator.tsx 



// const form = '(((2_2)_1)_1)';
// const seeds = [10, 10, 1, 50, 100, 5]
// const opSymbols = ['+', '*', '+', '+', '//']

// console.log(evalSolution(form, seeds, opSymbols));
// console.log(solutionExpr(form, seeds, opSymbols));

// import NUM_SOLS_OF_ALL_GRADES from '../../../public/grades_goals_solutions_forms/num_sols_of_each_grade.json' with { type: "json" };
// import NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../../public/grades_goals_solutions_forms/num_of_sols_of_each_grade_and_form.json' with { type: "json" };

// console.log(Object.values(NUM_SOLS_OF_ALL_GRADES).reduce((x, y) => x+y));