/**
 * engine.js
 * A custom Math Expression Evaluator using Tokenization and Shunting-Yard Algorithm.
 * Works independently of DOM and runs in main thread or Web Worker.
 */

const MathEngine = (function () {

    const Constants = {
        'π': Math.PI,
        'e': Math.E
    };

    function factorial(n) {
        if (n < 0 || !Number.isInteger(n)) throw new Error("Domain Error: Factorial");
        if (n > 170) throw new Error("Out of range: Too large");
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    function nPr(n, r) {
        if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) throw new Error("Domain Error: nPr");
        if (r > n) return 0;
        let res = 1;
        for (let i = n; i > n - r; i--) res *= i;
        return res;
    }

    function nCr(n, r) {
        if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r)) throw new Error("Domain Error: nCr");
        if (r > n) return 0;
        if (r > n / 2) r = n - r;
        let res = 1;
        for (let i = 1; i <= r; i++) {
            res = (res * (n - i + 1)) / i;
        }
        return res;
    }

    // Supported functions
    const Functions = {
        sin: (x, deg) => {
            if (deg && x % 180 === 0) return 0;
            return Math.sin(deg ? x * Math.PI / 180 : x);
        },
        cos: (x, deg) => {
            if (deg && x % 90 === 0 && x % 180 !== 0) return 0;
            return Math.cos(deg ? x * Math.PI / 180 : x);
        },
        tan: (x, deg) => {
            if (deg && x % 90 === 0 && x % 180 !== 0) throw new Error("Domain Error: tan");
            return Math.tan(deg ? x * Math.PI / 180 : x);
        },
        asin: (x, deg) => {
            if (x < -1 || x > 1) throw new Error("Domain Error: asin");
            return deg ? Math.asin(x) * 180 / Math.PI : Math.asin(x);
        },
        acos: (x, deg) => {
            if (x < -1 || x > 1) throw new Error("Domain Error: acos");
            return deg ? Math.acos(x) * 180 / Math.PI : Math.acos(x);
        },
        atan: (x, deg) => deg ? Math.atan(x) * 180 / Math.PI : Math.atan(x),
        ln: (x) => { if (x <= 0) throw new Error("Domain Error: ln"); return Math.log(x); },
        log: (x) => { if (x <= 0) throw new Error("Domain Error: log10"); return Math.log10(x); },
        exp: (x) => Math.exp(x),
        sqrt: (x) => { if (x < 0) throw new Error("Domain Error: √ negative"); return Math.sqrt(x); },
        cbrt: (x) => Math.cbrt(x),
    };

    // Operators precedence and associativity
    const Operators = {
        '#': { prec: 6, assoc: 'R', arity: 1, fn: (a) => -a }, // Unary Minus
        '@': { prec: 6, assoc: 'R', arity: 1, fn: (a) => a },  // Unary Plus
        '!': { prec: 6, assoc: 'L', arity: 1, fn: (a) => factorial(a) }, // Factorial (Postfix)
        '%': { prec: 6, assoc: 'L', arity: 1, fn: (a) => a / 100 }, // Percent (Postfix)
        '^': { prec: 5, assoc: 'R', arity: 2, fn: (a, b) => Math.pow(a, b) },
        'yroot': {
            prec: 5, assoc: 'R', arity: 2, fn: (a, b) => {
                if (b < 0 && a % 2 === 0) throw new Error("Domain Error: nthRoot");
                return (b < 0 ? -1 : 1) * Math.pow(Math.abs(b), 1 / a); // Evaluate b^(1/a). Format is "y yroot x" meaning "y-th root of x"
            }
        },
        'P': { prec: 4, assoc: 'L', arity: 2, fn: (a, b) => nPr(a, b) },
        'C': { prec: 4, assoc: 'L', arity: 2, fn: (a, b) => nCr(a, b) },
        '*': { prec: 3, assoc: 'L', arity: 2, fn: (a, b) => a * b },
        '/': { prec: 3, assoc: 'L', arity: 2, fn: (a, b) => { if (b === 0) throw new Error("Division by zero"); return a / b; } },
        '+': { prec: 2, assoc: 'L', arity: 2, fn: (a, b) => a + b },
        '-': { prec: 2, assoc: 'L', arity: 2, fn: (a, b) => a - b },
    };

    function tokenize(expr) {
        let tokens = [];
        let i = 0;

        // Clean expressions: replace fancy operators
        expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        expr = expr.replace(/²/g, '^2').replace(/³/g, '^3');

        while (i < expr.length) {
            let ch = expr[i];

            if (/\s/.test(ch)) { i++; continue; }

            // Numbers
            if (/[0-9\.]/.test(ch)) {
                let numStr = '';
                let hasDot = false;
                while (i < expr.length && /[0-9\.]/.test(expr[i])) {
                    if (expr[i] === '.') {
                        if (hasDot) throw new Error("Syntax Error: Multiple decimals");
                        hasDot = true;
                    }
                    numStr += expr[i];
                    i++;
                }
                // Handle scientific E notation closely attached
                if (i < expr.length && (expr[i] === 'e' || expr[i] === 'E')) {
                    numStr += expr[i]; i++;
                    if (i < expr.length && (expr[i] === '+' || expr[i] === '-')) {
                        numStr += expr[i]; i++;
                    }
                    while (i < expr.length && /[0-9]/.test(expr[i])) {
                        numStr += expr[i]; i++;
                    }
                }
                tokens.push({ type: 'number', value: parseFloat(numStr) });
                continue;
            }

            // Identifiers: Functions or Constants or Operators named with letters (P, C, yroot)
            if (/[a-zA-Z]/.test(ch) || ch === 'π') {
                let nameStr = '';
                if (ch === 'π') {
                    nameStr = 'π'; i++;
                } else {
                    while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) {
                        nameStr += expr[i]; i++;
                    }
                }

                if (Constants.hasOwnProperty(nameStr) || nameStr === 'Ans') {
                    tokens.push({ type: 'name', value: nameStr });
                } else if (Functions.hasOwnProperty(nameStr)) {
                    tokens.push({ type: 'func', value: nameStr });
                } else if (nameStr === 'P' || nameStr === 'C' || nameStr === 'yroot') {
                    tokens.push({ type: 'op', value: nameStr });
                } else if (nameStr === 'e') {
                    tokens.push({ type: 'name', value: 'e' });
                } else {
                    throw new Error(`Syntax Error: Unknown identifier '${nameStr}'`);
                }
                continue;
            }

            // Single character operators & grouping
            if ("+-*/%^()!".includes(ch)) {
                tokens.push({ type: ch === '(' || ch === ')' ? 'paren' : 'op', value: ch });
                i++;
                continue;
            }

            // Special symbols
            if (ch === '√') {
                tokens.push({ type: 'func', value: 'sqrt' }); i++; continue;
            }
            if (ch === '∛') {
                tokens.push({ type: 'func', value: 'cbrt' }); i++; continue;
            }

            throw new Error(`Syntax Error: Unknown character '${ch}'`);
        }

        return processTokens(tokens);
    }

    function processTokens(tokens) {
        // 1. Identify Unary Minus/Plus
        for (let j = 0; j < tokens.length; j++) {
            const t = tokens[j];
            if (t.type === 'op' && (t.value === '-' || t.value === '+')) {
                // It's unary if it's the first token, or follows an operator or left paren
                if (j === 0 || (tokens[j - 1].type === 'op' && tokens[j - 1].value !== '!' && tokens[j - 1].value !== '%') || (tokens[j - 1].type === 'paren' && tokens[j - 1].value === '(')) {
                    t.value = t.value === '-' ? '#' : '@'; // Assign special internal unary symbols
                }
            }
        }

        // 2. Insert implicit multiplication
        let newTokens = [];
        for (let i = 0; i < tokens.length; i++) {
            newTokens.push(tokens[i]);
            if (i < tokens.length - 1) {
                let t1 = tokens[i];
                let t2 = tokens[i + 1];
                let implicit = false;

                // Cases where implicit multiplication occurs:
                // Number followed by Name/Func/(
                // ) followed by Number/Name/Func/(
                // Postfix operator (!, %) followed by Number/Name/Func/(
                // Name (Constant) followed by Number/Name/Func/(

                const isLeftEligible = t1.type === 'number' ||
                    (t1.type === 'name' && t1.value !== 'P' && t1.value !== 'C' && t1.value !== 'yroot') ||
                    (t1.type === 'paren' && t1.value === ')') ||
                    (t1.type === 'op' && (t1.value === '!' || t1.value === '%'));

                const isRightEligible = t2.type === 'number' ||
                    t2.type === 'func' ||
                    t2.type === 'name' ||
                    (t2.type === 'paren' && t2.value === '(');

                if (isLeftEligible && isRightEligible) {
                    implicit = true;
                }

                if (implicit) {
                    newTokens.push({ type: 'op', value: '*' });
                }
            }
        }
        return newTokens;
    }

    function shuntingYard(tokens) {
        let output = [];
        let operators = [];

        for (let t of tokens) {
            if (t.type === 'number' || t.type === 'name') {
                output.push(t);
            } else if (t.type === 'func') {
                operators.push(t);
            } else if (t.type === 'op') {
                const op1 = t.value;
                const op1Info = Operators[op1];

                while (operators.length > 0) {
                    let top = operators[operators.length - 1];
                    if (top.type === 'paren' && top.value === '(') break;

                    if (top.type === 'func') {
                        output.push(operators.pop());
                        continue;
                    }

                    if (top.type === 'op') {
                        const op2 = top.value;
                        const op2Info = Operators[op2];

                        if ((op1Info.assoc === 'L' && op1Info.prec <= op2Info.prec) ||
                            (op1Info.assoc === 'R' && op1Info.prec < op2Info.prec)) {
                            output.push(operators.pop());
                        } else {
                            break;
                        }
                    }
                }
                operators.push(t);
            } else if (t.type === 'paren' && t.value === '(') {
                operators.push(t);
            } else if (t.type === 'paren' && t.value === ')') {
                while (operators.length > 0 && operators[operators.length - 1].value !== '(') {
                    output.push(operators.pop());
                }
                if (operators.length === 0) throw new Error("Syntax Error: Mismatched parentheses");
                operators.pop(); // discard '('

                if (operators.length > 0 && operators[operators.length - 1].type === 'func') {
                    output.push(operators.pop());
                }
            }
        }

        while (operators.length > 0) {
            let op = operators.pop();
            if (op.type === 'paren') throw new Error("Syntax Error: Mismatched parentheses");
            output.push(op);
        }

        return output;
    }

    function evaluateRPN(rpn, settings) {
        let stack = [];
        let isDeg = settings.angleMode === 'DEG';

        for (let t of rpn) {
            if (t.type === 'number') {
                stack.push(t.value);
            } else if (t.type === 'name') {
                if (t.value === 'Ans') {
                    if (typeof settings.ans !== 'number') throw new Error("Invalid Ans");
                    stack.push(settings.ans);
                } else {
                    stack.push(Constants[t.value]);
                }
            } else if (t.type === 'func') {
                let fn = Functions[t.value];
                if (stack.length < 1) throw new Error(`Syntax Error: Missing argument for ${t.value}`);
                let arg = stack.pop();
                let res = fn(arg, isDeg);
                if (isNaN(res) || !isFinite(res)) {
                    if (Number.isNaN(res)) throw new Error(`Domain Error: ${t.value}`);
                    // return Infinity
                }
                stack.push(res);
            } else if (t.type === 'op') {
                const opInfo = Operators[t.value];
                if (stack.length < opInfo.arity) throw new Error("Syntax Error: Invalid expression");

                let res;
                if (opInfo.arity === 1) {
                    let a = stack.pop();
                    res = opInfo.fn(a);
                } else if (opInfo.arity === 2) {
                    let b = stack.pop();
                    let a = stack.pop();
                    res = opInfo.fn(a, b);
                }
                stack.push(res);
            }
        }

        if (stack.length !== 1) throw new Error("Syntax Error: Invalid expression (malformed)");
        return stack[0];
    }

    // Main exports
    return {
        evaluate: function (exprStr, settings = { angleMode: 'DEG', ans: 0 }) {
            if (!exprStr || exprStr.trim() === '') return 0;
            const tokens = tokenize(exprStr);
            if (tokens.length === 0) return 0;
            const rpn = shuntingYard(tokens);
            const res = evaluateRPN(rpn, settings);

            // Fix small floating point issues (e.g. 0.1 + 0.2)
            if (Math.abs(res) < 1e-14) return 0;
            return res; // Final formatting should happen in the view layer
        }
    };

})();

// Export for Node/Tests or Module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathEngine;
} else if (typeof self !== 'undefined') {
    self.MathEngine = MathEngine;
}
