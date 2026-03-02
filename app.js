/**
 * app.js
 * Main UI Controller for Scientific Calculator
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- State & DOM Elements ---
    let expression = "";
    let lastResult = "";
    let settings = { angleMode: 'DEG', decimals: 'auto' };
    let memory = 0;
    let currentTheme = localStorage.getItem('theme') || 'dark';
    let history = JSON.parse(localStorage.getItem('calc-history') || '[]');
    let isCalculating = false;

    // Elements
    const elMainDisplay = document.getElementById('main-display');
    const elExprDisplay = document.getElementById('expression-display');
    const elSrAnnouncer = document.getElementById('sr-announcer');
    const elAngleIndicator = document.getElementById('angle-indicator');
    const elMemoryIndicator = document.getElementById('memory-indicator');
    const elLoadingIndicator = document.getElementById('loading-indicator');
    const elDecimalSelect = document.getElementById('decimal-setting');
    const btnAngle = document.getElementById('btn-angle');
    const historyList = document.getElementById('history-list');

    // Worker Setup
    let calcWorker = null;
    let workerCallbackId = 0;

    try {
        calcWorker = new Worker('worker.js');
    } catch (e) {
        console.warn("Web Worker blocked (likely file:// protocol). Falling back to main thread evaluation.");
    }

    // Formatting helper
    const numberFormatter = new Intl.NumberFormat(navigator.language, {
        maximumFractionDigits: 14,
        useGrouping: true
    });

    // --- Init ---
    initSettings();
    initTheme();
    renderHistory();
    updateDisplay();
    updateMemoryIndicator();

    // --- Event Listeners ---

    // Keypad Logic
    const keypad = document.querySelector('.keypad');
    if (keypad) {
        keypad.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            if (btn.dataset.insert !== undefined) {
                insertToExpression(btn.dataset.insert);
            } else if (btn.dataset.action !== undefined) {
                handleAction(btn.dataset.action);
            }
        });
    }

    // Controls Logic
    document.querySelector('.control-row').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;

        switch (action) {
            case 'angle':
                toggleAngleMode();
                break;
            case 'mc':
                memory = 0;
                updateMemoryIndicator();
                announce("Memory Cleared");
                break;
            case 'mr':
                insertToExpression(memory.toString());
                announce(`Memory Recalled: ${memory}`);
                break;
            case 'ms':
                if (lastResult && !isNaN(parseFloat(lastResult))) {
                    memory = parseFloat(lastResult);
                    updateMemoryIndicator();
                    announce(`Memory Stored: ${memory}`);
                }
                break;
            case 'm-plus':
                if (lastResult && !isNaN(parseFloat(lastResult))) {
                    memory += parseFloat(lastResult);
                    updateMemoryIndicator();
                    announce(`Added to Memory`);
                }
                break;
            case 'm-minus':
                if (lastResult && !isNaN(parseFloat(lastResult))) {
                    memory -= parseFloat(lastResult);
                    updateMemoryIndicator();
                    announce(`Subtracted from Memory`);
                }
                break;
        }
    });

    elDecimalSelect.addEventListener('change', (e) => {
        settings.decimals = e.target.value;
        localStorage.setItem('calc-decimals', settings.decimals);
        if (lastResult) {
            elMainDisplay.textContent = formatResult(parseFloat(lastResult)); // Reformat current display
        }
    });

    // Theme & Layout Logics
    document.getElementById('theme-toggle').addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
    });

    document.getElementById('history-toggle').addEventListener('click', () => {
        const panel = document.getElementById('history-panel');
        panel.classList.toggle('active');
    });

    document.getElementById('clear-history').addEventListener('click', () => {
        history = [];
        saveHistory();
        renderHistory();
        announce("History cleared");
    });

    // Keyboard Logic
    document.addEventListener('keydown', (e) => {
        // Prevent default actions for standard calculator bindings
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
            if (e.key === 'Enter' || e.key === ' ') return; // Let focus handle it
        }

        const key = e.key;
        if (/[0-9\.\+\-\*\/\%\(\)\^]/.test(key) && key.length === 1) {
            e.preventDefault();
            insertToExpression(key);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleAction('evaluate');
        } else if (key === 'Backspace') {
            e.preventDefault();
            handleAction('backspace');
        } else if (key === 'Escape') {
            e.preventDefault();
            handleAction('ac'); // All Clear
        } else if (key.toLowerCase() === 'h') {
            e.preventDefault();
            document.getElementById('history-toggle').click();
        } else if (key.toLowerCase() === 'r') {
            e.preventDefault();
            toggleAngleMode();
        } else if (e.key === 'm' || e.key === 'M') {
            if (e.ctrlKey) handleAction('mr');       // Ctrl+M: Recall
            else if (e.shiftKey) handleAction('ms'); // Shift+M: Store
            else if (e.altKey) handleAction('mc');   // Alt+M: Clear
        }
    });


    // --- Core Methods ---

    function initSettings() {
        const savedAngle = localStorage.getItem('calc-angle');
        if (savedAngle) {
            settings.angleMode = savedAngle;
            btnAngle.textContent = savedAngle;
            elAngleIndicator.textContent = savedAngle;
        }
        const savedDecs = localStorage.getItem('calc-decimals');
        if (savedDecs) {
            settings.decimals = savedDecs;
            elDecimalSelect.value = savedDecs;
        }
        const savedMem = localStorage.getItem('calc-memory');
        if (savedMem) memory = parseFloat(savedMem);
    }

    function initTheme() {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }

    function insertToExpression(val) {
        if (lastResult !== "" && expression === "") {
            // Continuation of calculation if operator is pressed
            if (['+', '-', '*', '/', '^', '%'].includes(val)) {
                expression = 'Ans ' + val;
            } else {
                expression = val;
            }
            lastResult = "";
        } else {
            expression += val;
        }
        updateDisplay();
    }

    function handleAction(action) {
        if (isCalculating) return; // Prevent input while worker is busy

        switch (action) {
            case 'ac': // All Clear
                expression = "";
                lastResult = "";
                elExprDisplay.textContent = "";
                updateDisplay();
                announce("Cleared");
                break;
            case 'ce': // Clear Entry (removes tail of expression)
                if (expression.length > 0) {
                    // Find logical separation (operator or parenthesis) to delete back to
                    const match = expression.match(/([a-zA-Z0-9\.]+)$/);
                    if (match) {
                        expression = expression.slice(0, -match[1].length);
                    } else {
                        expression = expression.slice(0, -1);
                    }
                }
                updateDisplay();
                break;
            case 'backspace':
                expression = expression.slice(0, -1);
                updateDisplay();
                break;
            case 'evaluate':
                evaluateExpression();
                break;
            case 'mr':
                insertToExpression(memory.toString());
                break;
            case 'mc':
                memory = 0;
                updateMemoryIndicator();
                break;
            case 'ms':
                // simulated via controls
                break;
        }
    }

    function toggleAngleMode() {
        settings.angleMode = settings.angleMode === 'DEG' ? 'RAD' : 'DEG';
        btnAngle.textContent = settings.angleMode;
        elAngleIndicator.textContent = settings.angleMode;
        localStorage.setItem('calc-angle', settings.angleMode);
        announce(`Angle mode: ${settings.angleMode}`);
    }

    function updateDisplay(val = null) {
        elExprDisplay.textContent = expression;
        if (val !== null) {
            elMainDisplay.textContent = val;
        } else {
            elMainDisplay.textContent = expression === "" ? "0" : expression;
        }

        // Scroll to end of input visually
        elMainDisplay.scrollLeft = elMainDisplay.scrollWidth;
        elExprDisplay.scrollLeft = elExprDisplay.scrollWidth;
    }

    function updateMemoryIndicator() {
        elMemoryIndicator.textContent = memory !== 0 ? 'M' : '';
        localStorage.setItem('calc-memory', memory);
    }

    function formatResult(num) {
        if (isNaN(num)) return "NaN";
        if (!isFinite(num)) return num > 0 ? "∞" : "-∞";

        let formattedStr;

        if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-7 && num !== 0)) {
            // Scientific notation for extreme sizes
            if (settings.decimals !== 'auto') {
                return num.toExponential(parseInt(settings.decimals));
            }
            return num.toExponential(6).replace(/\.?0+e/, 'e');
        }

        if (settings.decimals !== 'auto') {
            const dec = parseInt(settings.decimals);
            let pow = Math.pow(10, dec);
            let rounded = Math.round(num * pow) / pow;
            formattedStr = new Intl.NumberFormat(navigator.language, {
                minimumFractionDigits: dec,
                maximumFractionDigits: dec,
                useGrouping: true
            }).format(rounded);
        } else {
            // Auto formatting - clean up floating point errors, strip trailing zeros
            // JavaScript Number uses 64-bit float, accurate to about 15 decimal places.
            // We'll round slightly to avoid 0.30000000000000004
            const rounded = Math.round(num * 1e14) / 1e14;
            formattedStr = numberFormatter.format(rounded);
        }

        return formattedStr;
    }

    function announce(msg) {
        elSrAnnouncer.textContent = '';
        setTimeout(() => { elSrAnnouncer.textContent = msg; }, 50);
    }

    // --- Worker Integration ---

    function evaluateExpression() {
        if (!expression.trim()) return;

        // Check for basic format errors before sending
        const openParen = (expression.match(/\(/g) || []).length;
        const closeParen = (expression.match(/\)/g) || []).length;
        if (openParen > closeParen) {
            expression += ")".repeat(openParen - closeParen);
            elExprDisplay.textContent = expression;
        }

        isCalculating = true;
        const id = ++workerCallbackId;

        // Show loading if not instant
        const loadTimer = setTimeout(() => {
            elLoadingIndicator.classList.remove('hidden');
        }, 100);

        if (calcWorker) {
            calcWorker.postMessage({
                type: 'EVALUATE',
                id: id,
                expr: expression,
                settings: {
                    angleMode: settings.angleMode,
                    ans: lastResult ? parseFloat(lastResult) : 0
                }
            });

            // Setup response handler for this specific id
            const handler = (e) => {
                const data = e.data;
                if (data.id === id) {
                    clearTimeout(loadTimer);
                    elLoadingIndicator.classList.add('hidden');
                    isCalculating = false;

                    if (data.type === 'SUCCESS') {
                        const resultVal = data.result;
                        const displayStr = formatResult(resultVal);

                        lastResult = resultVal;
                        updateDisplay(displayStr);
                        announce(`Result: ${displayStr}`);

                        // Add to history
                        addToHistory(expression, displayStr);
                        expression = ""; // Reset expression for next input
                    } else if (data.type === 'ERROR') {
                        updateDisplay("Error");
                        elExprDisplay.textContent = expression + " = " + data.error;
                        announce(`Error: ${data.error}`);
                    }
                    calcWorker.removeEventListener('message', handler);
                }
            };

            calcWorker.addEventListener('message', handler);
        } else {
            // Main Thread Fallback Evaluation
            try {
                // Ensure MathEngine from engine.js is available
                if (typeof window.MathEngine === 'undefined') throw new Error("MathEngine not loaded.");

                const resultVal = window.MathEngine.evaluate(expression, {
                    angleMode: settings.angleMode,
                    ans: lastResult ? parseFloat(lastResult) : 0
                });

                clearTimeout(loadTimer);
                elLoadingIndicator.classList.add('hidden');
                isCalculating = false;

                const displayStr = formatResult(resultVal);
                lastResult = resultVal;
                updateDisplay(displayStr);
                announce(`Result: ${displayStr}`);

                // Add to history
                addToHistory(expression, displayStr);
                expression = ""; // Reset expression for next input
            } catch (err) {
                clearTimeout(loadTimer);
                elLoadingIndicator.classList.add('hidden');
                isCalculating = false;

                updateDisplay("Error");
                elExprDisplay.textContent = expression + " = " + err.message;
                announce(`Error: ${err.message}`);
            }
        }
    }

    // --- History Panel ---

    function addToHistory(expr, res) {
        history.unshift({ expr, res });
        if (history.length > 20) history.pop();
        saveHistory();
        renderHistory();
    }

    function saveHistory() {
        localStorage.setItem('calc-history', JSON.stringify(history));
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = `<div class="history-empty">No history yet</div>`;
            return;
        }

        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}" tabindex="0" aria-label="Reuse history: ${item.expr} equals ${item.res}">
                <div class="history-expr">${item.expr} =</div>
                <div class="history-res">${item.res}</div>
            </div>
        `).join('');

        // Add click to restore
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = item.dataset.index;
                const h = history[idx];
                expression = h.expr;
                lastResult = "";
                updateDisplay();
                announce(`Restored: ${expression}`);
            });
            // Also listen to enter key for accessibility
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    }

    // Auto register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('SW registered: ', registration.scope);
        }).catch(error => {
            console.log('SW registration failed: ', error);
        });
    }

});
