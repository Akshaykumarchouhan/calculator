# Scientific Calculator Pro

A fully offline-capable, highly accessible, secure scientific calculator application built with Vanilla JS, HTML, and CSS.

## Features & UX
- **No `eval()`**: Implements a robust Tokenizer & Shunting-Yard Parser for secure parsing and execution.
- **Scientific Functions**: Trigonometry (DEG/RAD), Logarithms, Roots, Powers, Combinatorics (nPr, nCr), and Factorials.
- **Web Worker Engine**: Evaluates intensive equations (e.g. huge Factorials or complex groupings) off-thread to ensure the UI stays highly responsive without blocking.
- **Accessibility (A11y)**: Built using deep semantic HTML. Every button utilizes `aria-labels`, `tab-indexes` are correctly routed, and an ARIA live region acts as a screen-reader announcer for actions and calculation results.
- **History Panel**: Automatically records evaluated expressions with visual click-to-restore. Persisted in LocalStorage.
- **Memory Operations**: Supports MS, MR, M+, M-, MC with screen indicators.
- **Offline PWA**: Installable to desktop or mobile completely independent of a network connection. Provides a Service Worker out of the box.
- **Theming**: Sleek Dark and Light Modes with CSS custom properties.

## Keyboard Shortcuts
- `0`-`9`, `.`, `+`, `-`, `*`, `/`, `%`, `^`, `(`, `)` – Calculator inputs
- `Enter` / `=` – Evaluate calculation
- `Backspace` – Delete last character
- `Escape` – Clear All (`C` button)
- `R` – Toggle Angle Mode (DEG/RAD)
- `H` – Toggle History Sidebar (Mobile)
- `Ctrl + M` – Memory Recall (`MR`)
- `Shift + M` – Memory Store (`MS`)
- `Alt + M` – Memory Clear (`MC`)

## How to Run Locally
Because this project utilizes Web Workers which restrict loading from standard `file://` URIs due to browser CORS policies, you should serve this from lightly-hosted local directories.

1. Ensure you have Node.js or Python installed.
2. Serve the directory:
   - **Python 3:** `python -m http.server 8000`
   - **Node.js (npx):** `npx serve .` or `npx http-server -p 8000`
3. Traverse to `http://localhost:8000` in your browser.
4. (Optional): Add the page to your Desktop as an Installed PWA via your browser's address bar.

## Security Overview (CSP & Architecture)
This App strips all `onclick` inline-listeners and completely circumvents `eval()`.
Below is a recommended HTTP Content Security Policy layout (or `<meta>` equivalent) you can serve your pages with:
`Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; img-src 'self' data:;`
*(Note: Because no Webpack/Rollup exists here, the code uses standard decoupled ES-Modules and isolated context scripts).*
