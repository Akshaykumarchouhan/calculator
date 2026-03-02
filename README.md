# ✨ Scientific Calculator Pro ✨

A robust, fully offline-capable, and highly accessible scientific calculator built entirely with **Vanilla JavaScript, HTML, and CSS**. This project takes a simple web calculator and elevates it to a professional-grade Progressive Web App (PWA) with a custom mathematics engine! 🚀

---

## 🌟 Key Features

### 🛡️ Secure Engine (No `eval()`)
Security is paramount. Instead of relying on JavaScript's dangerous `eval()` function, this calculator implements a **Custom Tokenizer and Shunting-Yard Parser algorithm**. This mathematically verifies inputs, respects operator precedence (BODMAS/PEMDAS), and safely formats the result.

### 🧮 Advanced Mathematical Functions
While it features a clean **5x5 grid layout** for standard calculations, under the hood it supports advanced operations:
- **Trigonometry** (Sin, Cos, Tan, Asin, Acos, Atan - in DEG or RAD)
- **Logarithms** (Natural Log, Log Base 10)
- **Exponentials & Roots** (Powers, Square Roots, Cube Roots)
- **Combinatorics** (Permutations `nPr`, Combinations `nCr`)
- **Factorials** (`!`)

### ⚡ Web Worker Architecture
Intensive calculations (like massive recursions on factorials or large exponents) can freeze a browser. This app offloads heavy computational logic to a **background Web Worker** (`worker.js`). Your UI remains smooth, responsive, and blazing fast, regardless of the math involved! 

### 🎨 Beautiful, Responsive UI & Theming
- **Sleek Layout**: Specifically modeled to feature a highly intuitive 5x5 keypad grid.
- **Dark & Light Mode**: Seamlessly toggle between themes using CSS Custom Properties. State is saved via LocalStorage! 🌙 ☀️
- **History Panel**: Automatically records evaluated expressions. You can click any past calculation in the sidebar to seamlessly re-insert it! 📜

### ♿ Accessibility First (A11y)
Built utilizing deep semantic HTML tags so that everyone can use it:
- Native `<button>` elements equipped with proper `aria-label` mapping.
- Correct `tab-index` routing for keyboard-only navigation.
- An invisible ARIA live region (`aria-live="polite"`) that acts as a screen-reader hook to vocally announce results and errors! 🗣️

### 📱 Progressive Web App (PWA)
Install this calculator directly to your Desktop or Mobile device!
Equipped with a `manifest.json` and a fully caching `sw.js` (Service Worker), this app works **100% offline**. If you lose network connectivity, the calculator loads identically. 📲

---

## ⌨️ Keyboard Shortcuts

Power users can control the calculator entirely via their keyboard:

- `0`-`9`, `.`, `+`, `-`, `*`, `/`, `%` – Standard Numbers & Operators
- `Enter` / `=` – Evaluate calculation 🧮
- `Backspace` – Delete last character ⬅️
- `Escape` – Clear All (`C`) 🧹
- `R` – Toggle Angle Mode (DEG ↔ RAD) 📐
- `H` – Toggle History Sidebar (Mobile) 🕒
- **Memory Controls**:
  - `Ctrl + M` – Memory Recall (`MR`)
  - `Shift + M` – Memory Store (`MS`)
  - `Alt + M` – Memory Clear (`MC`)

---

## 🛠️ Installation & Running Locally

Because this project utilizes **Web Workers** (which browsers strictly block from loading over standard local `file://` URIs due to CORS security policies), you must serve this project over a local HTTP server.

**Step 1:** Clone the repository.
**Step 2:** Serve the directory using your preferred environment:

*Using Python (3.x):*
```bash
python -m http.server 8000
```

*Using Node.js (npx):*
```bash
npx serve .
# OR
npx http-server -p 8000
```

**Step 3:** Open your browser and navigate to `http://localhost:8000`.

*(Note: There is a built-in fallback system! If the Web Worker is blocked, the engine will gracefully fall back to the main UI thread to ensure you are never stranded!)*

---

## 🔒 Security Overview (CSP & Architecture)

This App strips all `onclick` inline-listeners and completely circumvents `eval()`. 
For deployment, below is a recommended HTTP Content Security Policy (CSP) layout you can serve your pages with to guarantee lock-down security:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; img-src 'self' data:;
```

*No Webpack, Babel, or Rollup needed. Pure ES-Modules and isolated context scripts!* 💻✨
