
import { enoughSeeds, opsAndLevelsResults, 
         opsCacheKey, OpsCacheKeyT, OpsCacheT, OpsCacheValT, 
         OperandT, Op, Result, ResultsAndGradesCacheT,
        } from './Core';



export function addOpsResultsToCaches(
    cache: ResultsAndGradesCacheT,
    a: OperandT,
    b: OperandT,
    symbolFunc: ((symbol: Op, operand?: OperandT, goal?: Result) => string) | null = null,
): void {
    // mutates ops_cache (used for memoisation)
    // results = core.ops_results(a,b)
    const resultsAndLevels = opsAndLevelsResults(a, b);
    // key = tuple(sorted((a,b)))

    // for symbol, result in zip(core.OPS, results):
    for (let [symbol, [result, level]] of Object.entries(resultsAndLevels)){
        // Assumes the only one that can return None: '//'
        // is the last, (zip is zip_shortest) so no ops are
        // missed and no results are misattributed.
        // if result in (a, b):
        //     continue
        let key: OpsCacheKeyT;
        let newSymbol;
        
        if (symbolFunc !== null) {  // a = goal = 100, b = seed = 2, result = 50, symbol = '//'
            // Mainly support switcheroo for reverse cache
            newSymbol = symbolFunc(symbol);
            key = opsCacheKey(result, b);  // e.g.  sub goal and seed
            result = a;  // i.e.  goal or sub_goal
        } else {
            key = opsCacheKey(a, b)
            newSymbol = symbol
        }

        if (!(result in cache)) {  // result is also a key, the first one
            cache[result] = new Map();
        }
        const resultsDict = cache[result];
        if (!resultsDict.has(key)) {
            // results_dict[key] = ''
            resultsDict.set(key, {});
        }

        if (!(newSymbol in resultsDict.get(key)!)) {
            // results_dict[key] += symbol

            // grader = core.DIFFICULTY_CALCULATORS[symbol]
            // try:
            // difficulty_level = grader(a, b) if a >= b else grader(b, a)
            // except AssertionError as e:
            //     print(f'{a=}, {b=}, {symbol=}, {key=}, {newSymbol=}')
            //     raise e
            // results_dict[key][newSymbol] = difficulty_level
        
            const symbolsAndGradesObj = resultsDict.get(key)!;
            symbolsAndGradesObj[newSymbol] = level;
        }
    }
}