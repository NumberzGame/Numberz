import { argv } from "node:process";


const [goal, ...seeds] = argv.slice(2).map((x) => parseInt(x, 10));


const INVALID_ARGS = Symbol();

console.log(`Goal: ${goal}`);
console.log(`Seeds: ${seeds}`);

function* allPairsFrom(arr) {
    for (const [i, first_item] of arr.slice(0,-1).entries()) {
        for (const [j,second_item] of arr.slice(i+1).entries()) {
            yield [[i,first_item], [i+1+j,second_item]];
        }
    }
}




const OPS = {
    '+' : (x, y) => x+y,
    '*' : (x, y) => x*y,
    '-' : (x, y) => Math.abs(x-y),
    '/' : (x, y) => x % y === 0 ? x / y : 
                      y % x === 0 ? y / x : 
                        INVALID_ARGS,
};




function makeSubSolExpr(x, y, op) {
    return `(${x.expr} ${op} ${y.expr})`
}


function makeValidSubSolExpr(x, y, op) {
    // Ensure x >= y for abs (x - y) and /
    return x.val >= y.val ? makeSubSolExpr(x, y, op) : makeSubSolExpr(y, x, op);
}


function makeOperandObject(val, expr = null) {             
    return {"val": val, "expr": expr ?? val.toString(10)};
}


function* allOperandsFrom(operands, maxDepth= 6) {
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
            const resultOperand = makeOperandObject(result, subSolExpr);
            const nextOperands = remainingOperands.concat(resultOperand);
            yield nextOperands;
            for (const moreOperands of allOperandsFrom(nextOperands, maxDepth-1)) {
                yield moreOperands;
            }
        }
    }

}


const operandsFromSeeds = function() {
    return allOperandsFrom(seeds.map((seed) => makeOperandObject(seed, null)));
}



for (const operands of operandsFromSeeds()) {
    // console.log(`operands: ${Array.from(operands.map(op => op.expr))}`);
    // continue;
    for (const operand of operands) {
        if (operand.val === goal) {
            console.log(operand.expr);
        }
    }
}
