
import { enoughSeeds, opsAndLevelsResults, resultsAndGradesCaches,
         opsCacheKey, OpsCacheKeyT, OpsCacheT, OpsCacheValT, 
         OperandT, Op, Seed, Result, ResultsAndGradesCacheT, GOALS,
         inverseOp, AllDepthsCacheT, Goal, GOALS_T, Grade,
         combinations, permutations, 
        } from './Core';

import { ALL_SEEDS, HashTable } from '../Core';



export function addOpsResultsToCaches(
    cache: ResultsAndGradesCacheT,
    a: OperandT,
    b: OperandT,
    symbolFunc: ((symbol: Op, operand?: OperandT, goal?: Result) => string) | null = null,
): void {

    const resultsAndLevels = opsAndLevelsResults(a, b);

    for (let [symbol, [result, level]] of Object.entries(resultsAndLevels)){

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

        cache[result] ??= new HashTable<OpsCacheKeyT,Record<Op,Grade>>();

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
    forwardCache: AllDepthsCacheT =resultsAndGradesCaches.forward,
    reverseCache: AllDepthsCacheT=resultsAndGradesCaches.reverse,
    goals: GOALS_T=GOALS,
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
                (op: Op) => inverseOp(op, tripleVal, goal),
                )

            // if (i++ % iterationsPerMessage === 0) {
            //     console.log(
            //         `${i}/${numGoalTripleVals}, cached triple-triples for ${goal}, ${tripleVal}, ${Math.floor(100*i / numGoalTripleVals)}% done`
            //     )
            // }
        }
    }
}



export function makeCaches(
    seeds: Seed[] = ALL_SEEDS,
    goals: GOALS_T = GOALS,
    maxDepth: number = 6,
    forwardCache: AllDepthsCacheT = resultsAndGradesCaches.forward,
    reverseCache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
): [AllDepthsCacheT, AllDepthsCacheT] {
    // # maxDepth = min(maxDepth, 4)
    // console.log(`Max depth: ${maxDepth}`);



    const numIterations = 1086665;
    // console.log(`numIterations=${numIterations}`);

    function* triple_seeds(
        triple_operands: [OperandT, OperandT],
    ): IterableIterator<Seed[]>{
        let [a, b] = triple_operands;
        if (!(b in forwardCache[2])){
            [a, b] = [b, a];
        }

        // # TODO: If (somehow) neither of (a, b) are a known pair,
        // # should this return [Sentinel] where Sentinel
        // # is never in Seeds, to exclude further cache
        // # entries based on them?
        for (const pair_seeds of (forwardCache[2]?.[b] ?? new HashTable<OpsCacheKeyT, OpsCacheValT>()).keys()){
            yield [a, ...pair_seeds] as Seed[];
        }
    }

    function* seedsGen(): IterableIterator<[number, OperandT, OperandT]>{
        forwardCache[2] ??= {};

        for (const pair of combinations(2, seeds)) {
            const [a, b] = pair;
            yield [2, a, b];
        }


        if (maxDepth >= 3) {
            forwardCache[3] ??= {};

            for (const [pairResult, pairsMap] of Object.entries(forwardCache[2])) {
                for (const seed of seeds) {
                    if (pairsMap.keys().every((operands) =>
                        !enoughSeeds(operands.concat(seed), seeds)
                    )) {
                        continue;
                    }
                    yield [3, parseInt(pairResult), seed];
                }
            }
        }

        if (maxDepth >= 4) {
            forwardCache[4] ??= {};

            for (const [tripleResult, triplesMap] of Object.entries(forwardCache[3])) {
                for (const seed of seeds) {
                    if (triplesMap.keys().every(
                            (operands) => Array.from(permutations(2,operands)).filter(
                                    ([tripleSeed, pair], i, arr) => seeds.includes(tripleSeed)
                                    ).every(
                                        // If the pair is not in forwardCache[2],
                                        // then it can't be made from any pair of seeds
                                        // that we've tried to build the cache with so far.
                                        //
                                        // If so, only the pair that is in forwardCache[2] 
                                        // should determine whether we skip tripleResult 
                                        // from forwardCache[4] or not
                                        //
                                        // .every on an empty array defaults to true:
                                        // > let m = new HashTable<OpsCacheKeyT, OpsCacheValT>()
                                        // undefined
                                        // > m.keys().every((x) => false)
                                        // true
                                        ([tripleSeed, pair], i, arr) => pair in forwardCache[2] && forwardCache[2][pair].keys().every(
                                            (pairSeeds) => !enoughSeeds(pairSeeds.concat([tripleSeed, seed]),seeds)
                                            )
                                        )
                            )
                        ) {
                        continue;
                    }
                    // if (all(
                    //     not enough_seeds(pair_seeds + (triple_seed, seed), seeds)
                    //     for operands in triplesMap
                    //     for pair, triple_seed in itertools.permutations(operands, 2)
                    //     for pair_seeds in forwardCache[2].get(pair, {})
                    //     if triple_seed in seeds
                    // )) {
                    //     continue;
                    // }
                    yield [4, parseInt(tripleResult), seed];
                }
            }

            
            for (const [pairItemA, pairItemB] of 
                    combinations(2, Object.entries(forwardCache[2]))) {
                const [pairA, pairAMap] = pairItemA;
                const [pairB, pairBMap] = pairItemB;



                if (pairAMap.keys().every(
                        (operandsA) => pairBMap.keys().every(
                            (operandsB) => !enoughSeeds(operandsA.concat(operandsB), seeds)
                            )
                        )
                    ) {
                    continue;
                }

                yield [4, parseInt(pairA), parseInt(pairB)];
            }
        }

        if (maxDepth >= 5) {
            forwardCache[5] ??= {};
            for (const pairItem of Object.entries(forwardCache[2])) {
                
                const [pair, pairMap] = pairItem;
                for (const tripleItem of Object.entries(forwardCache[3])) {
                    const [triple, tripleMap] = tripleItem;
                    if (pairMap.keys().every(
                            (pairOperands) => tripleMap.keys().every(
                                (tripleOperands) => 
                                    Array.from(triple_seeds(tripleOperands)).every(
                                        triple_seeds => !enoughSeeds([...pairOperands,...triple_seeds], seeds)
                                        )
                                
                                )
                            )       
                        ) {
                        continue;
                    }

                    yield [5, parseInt(triple), parseInt(pair)];
                }
            }
        }
    }


    function* goalsReverseGen(): IterableIterator<[number, OperandT, OperandT]> {
        if (maxDepth >= 5) {
            reverseCache[1] ??= {};
            for (const goal of goals) {
                for (const seed of seeds) {
                    yield [1, goal, seed]; //) for goal in goals for seed in seeds)
                }
            }
        }

        if (maxDepth >= 6) {
            reverseCache[2] ??= {};
            for (const [goal, goalMap] of Object.entries(reverseCache[1])) {
                for (let [subGoal, seed] of goalMap.keys()) {
                    if (!seeds.includes(seed)) {
                        [subGoal, seed] = [seed, subGoal];
                    }
                    for (const nextSeed of seeds) {
                        if (!enoughSeeds([nextSeed, seed], seeds)) {
                            continue;
                        }
                        yield [2, subGoal, nextSeed];
                    }
                }
            }
            for (const goal of goals) {
                for (const pair of Object.keys(forwardCache[2])) {
                    yield [2, goal, parseInt(pair)];
                }
            }
        }
    }

    const numMessages = 10
    const iterationsPerMessage = Math.max(numIterations / numMessages, 1)
    let i = 0

    for (const [depth, a, b] of seedsGen()) {
        addOpsResultsToCaches(forwardCache[depth], a, b, null);
        // if (i++ % iterationsPerMessage == 0) {
        //     console.log(
        //         `i=${i}, calculating depth ${depth}, [a,b]=${[a,b]}, ${Math.floor(100*i / numIterations)}% done`
        //     )
        // }
    }

    // console.log(`i=${i}`);


    // console.log("Building reverse cache...");
    let k = 0;

    for (const [depth, goal, operand] of goalsReverseGen()) {
        addOpsResultsToCaches(
            reverseCache[depth],
            goal,
            operand,
            (symbol) => inverseOp(symbol, operand, goal),
        );
        // if (k++ % iterationsPerMessage == 0) {
        //     const progress = `${Math.floor(100*k / numIterations)}`;
        //     console.log(`k=${k}, depth=${depth}, [goal, operand]=${[goal,operand]}, ${progress} done`)
        // }
    }

    // console.log(`k=${k}`);
    if (maxDepth >= 6) {
        // console.log(`Caching reverse triples...`);
        addTriplesToReverseCache(forwardCache, reverseCache, goals)
    }

    return [forwardCache, reverseCache];
}