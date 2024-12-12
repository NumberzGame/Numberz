import { argv } from "node:process";


const [goal, ...seeds] = argv.slice(2).map((x) => parseInt(x, 10));


const INVALID_ARGS = Symbol();

console.log(`Goal: ${goal}`);
console.log(`Seeds: ${seeds}`);

function* allPairsFrom<T>(arr: T[]): IterableIterator<[[number,T],[number,T]]> {
    for (const [i, first_item] of arr.slice(0,-1).entries()) {
        for (const [j,second_item] of arr.slice(i+1).entries()) {
            yield [[i,first_item], [i+1+j,second_item]];
        }
    }
}




const OPS = {
    '+' : (x: number, y: number) => x+y,
    '*' : (x: number, y: number) => x*y,
    '-' : (x: number, y: number) => Math.abs(x-y),
    '/' : (x: number, y: number) => x % y === 0 ? x / y : 
                      y % x === 0 ? y / x : 
                        INVALID_ARGS,
};



class Operand {
    readonly val: number;
    readonly expr: string;
    
    constructor(val: number, expr: string | null = null) {
        this.val = val;
        this.expr = expr ?? val.toString(10);
    }
}

function makeSubSolExpr(x: Operand, y: Operand, op: string): string {
    return `(${x.expr} ${op} ${y.expr})`
}


function makeValidSubSolExpr(x: Operand, y: Operand, op: string): string {
    // Ensure x >= y for abs (x - y) and /
    return x.val >= y.val ? makeSubSolExpr(x, y, op) : makeSubSolExpr(y, x, op);
}





function* allOperandsFrom(operands: Operand[], maxDepth: number = 6): IterableIterator<Operand[]> {
    if (maxDepth ===0 || operands.length === 1) {
        return;
    }

    for (const [[i,x], [j,y]] of allPairsFrom(operands)) {

        const before = operands.slice(0,i); 
        const between = operands.slice(i+1,j);
        const after = operands.slice(j+1);
        const remainingOperands = before.concat(between, after); 

        for (const [symbol, op] of Object.entries(OPS)) {
            const result = op(x.val, y.val);
            if (result === INVALID_ARGS) {
                continue;
            }
            const subSolExpr = makeValidSubSolExpr(x, y, symbol);
            const resultOperand = new Operand(result, subSolExpr);
            const nextOperands = remainingOperands.concat(resultOperand);
            yield nextOperands;
            for (const moreOperands of allOperandsFrom(nextOperands, maxDepth-1)) {
                yield moreOperands;
            }
        }
    }

}


const operandsFromSeeds = function(): IterableIterator<Operand[]>  {
    return allOperandsFrom(seeds.map((seed) => new Operand(seed, null)));
}


export const solutions = function*(goal: number): IterableIterator<Operand> {
    for (const operands of operandsFromSeeds()) {
        // console.log(`operands: ${Array.from(operands.map(op => op.expr))}`);
        // continue;
        for (const operand of operands) {
            if (operand.val === goal) {
                yield operand;
            }
        }
    }
}
