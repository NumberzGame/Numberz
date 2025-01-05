
import { enoughSeeds, opsAndLevelsResults, resultsAndGradesCaches,
         opsCacheKey, OpsCacheKeyT, OpsCacheT, OpsCacheValT, 
         OperandT, Op, Result, ResultsAndGradesCacheT, GOALS,
         inverseOp
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

        cache[result] ??= new Map();

        const resultsDict = cache[result];
        if (!resultsDict.has(key)) {
            // results_dict[key] = ''
            resultsDict.set(key, {});
        }


        const symbolsAndGradesObj = resultsDict.get(key)!;
        symbolsAndGradesObj[newSymbol] ??= level;
    }
}


export function addTriplesToReverseCache(
    forwardCache=resultsAndGradesCaches.forward,
    reverseCache=resultsAndGradesCaches.reverse,
    goals=GOALS,
    ): void {
        
    
    reverseCache[3] ??= {};

    const numMessages = 5;
    const numGoalTripleVals = goals.length*Object.entries(forwardCache[3]!).length; 
    const iterationsPerMessage = Math.max(numGoalTripleVals / numMessages, 1);
    let i = 0;

    for (const goal of goals) {
        for (const tripleVal of Object.keys(forwardCache[3]).map(k => parseInt(k))) {
            addOpsResultsToCaches(
                reverseCache[3],
                goal,
                tripleVal,
                (op: Op) => inverseOp(op, goal, tripleVal),
                )

            if (i++ % iterationsPerMessage === 0) {
                console.log(
                    `${i}/${numGoalTripleVals}, cached triple-triples for ${goal}, ${tripleVal}, ${Math.floor(100*i / numGoalTripleVals)}% done`
                )
            }
        }
    }
}