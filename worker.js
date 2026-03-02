/**
 * worker.js
 * Offloads mathematical evaluation to prevent blocking the main thread.
 * Ideal for factorial or permutation functions handling large amounts of data.
 */

// Import the parser and evaluator
importScripts('engine.js');

self.addEventListener('message', function (e) {
    const data = e.data;
    if (data.type === 'EVALUATE') {
        const { id, expr, settings } = data;

        try {
            // Engine exposed via window/self global from importScripts
            const result = self.MathEngine.evaluate(expr, settings);
            self.postMessage({ id, type: 'SUCCESS', result });
        } catch (error) {
            self.postMessage({ id, type: 'ERROR', error: error.message });
        }
    }
});
