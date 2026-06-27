// AUTO-GENERATED — bundled HTML for the 3 demo apps.
// Source files live in /tmp/agentos-appstore-clone/apps/* originally;
// they are committed to the catalog repo only when the user submits via the phone.

export const BUILT_APP_HTML: Record<string, string> = {
  "demo-todo": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
<meta name="theme-color" content="#0a0a0a" />
<title>Tasks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0a0a;
    --tile: rgba(255,255,255,0.05);
    --tile-edge: rgba(255,255,255,0.09);
    --text: #ffffff;
    --text-dim: rgba(255,255,255,0.55);
    --text-mute: rgba(255,255,255,0.30);
    --text-ghost: rgba(255,255,255,0.18);
    --mint: #7CE7C7;
    --serif: 'Instrument Serif', serif;
    --body: 'Manrope', system-ui, sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--body);
    min-height: 100vh;
    overscroll-behavior: contain;
  }
  body {
    padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 28px 24px 16px;
  }
  .kicker {
    font-family: var(--mono);
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 2.6px;
    color: var(--text-mute);
    text-transform: uppercase;
  }
  h1 {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 400;
    font-size: 56px;
    line-height: 1;
    letter-spacing: -1.6px;
    margin-top: 14px;
  }
  .meta {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 8px;
    letter-spacing: 0.4px;
  }
  .input-row {
    padding: 12px 24px 12px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  #task {
    flex: 1;
    background: var(--tile);
    border: 1px solid var(--tile-edge);
    border-radius: 16px;
    padding: 14px 18px;
    color: var(--text);
    font-family: var(--body);
    font-size: 15px;
    letter-spacing: 0.1px;
    outline: none;
    -webkit-appearance: none;
  }
  #task::placeholder { color: var(--text-ghost); }
  #task:focus { border-color: rgba(255,255,255,0.18); }
  #add {
    width: 46px;
    height: 46px;
    border-radius: 999px;
    background: #ffffff;
    color: var(--bg);
    border: none;
    font-family: var(--mono);
    font-size: 22px;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 100ms ease;
  }
  #add:active { transform: scale(0.92); }
  .filters {
    display: flex;
    gap: 6px;
    padding: 8px 24px 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .filters::-webkit-scrollbar { display: none; }
  .chip {
    padding: 7px 12px;
    border-radius: 999px;
    background: var(--tile);
    border: 1px solid var(--tile-edge);
    font-family: var(--mono);
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 1.6px;
    color: var(--text-dim);
    cursor: pointer;
    flex-shrink: 0;
  }
  .chip.active { background: #ffffff; border-color: #ffffff; color: var(--bg); }
  .list {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 8px 24px 100px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 4px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    animation: fadeIn 200ms ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .check {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    border: 1.5px solid var(--text-ghost);
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;
  }
  .item.done .check {
    background: var(--mint);
    border-color: var(--mint);
  }
  .check svg { opacity: 0; transition: opacity 150ms ease; }
  .item.done .check svg { opacity: 1; }
  .item-text {
    flex: 1;
    font-size: 15.5px;
    letter-spacing: 0.1px;
    color: var(--text);
    word-break: break-word;
    line-height: 1.4;
  }
  .item.done .item-text {
    color: var(--text-mute);
    text-decoration: line-through;
    text-decoration-color: var(--text-ghost);
  }
  .delete {
    background: none;
    border: none;
    color: var(--text-ghost);
    font-family: var(--mono);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    opacity: 0;
    transition: opacity 150ms ease;
  }
  .item:hover .delete, .item:active .delete { opacity: 1; }
  .empty {
    text-align: center;
    padding: 80px 32px;
    color: var(--text-mute);
  }
  .empty h2 {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 400;
    font-size: 36px;
    letter-spacing: -1px;
    color: var(--text);
    margin-bottom: 8px;
  }
  .empty p {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-dim);
  }
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, transparent, var(--bg) 30%);
    padding: 24px 24px calc(20px + env(safe-area-inset-bottom));
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;
  }
  .footer-counts {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-mute);
    letter-spacing: 1.4px;
    pointer-events: auto;
  }
  .clear {
    background: none;
    border: none;
    color: var(--text-dim);
    font-family: var(--mono);
    font-weight: 500;
    font-size: 9px;
    letter-spacing: 1.8px;
    cursor: pointer;
    pointer-events: auto;
  }
  .clear:disabled { opacity: 0.3; cursor: default; }
</style>
</head>
<body>
  <header>
    <div class="kicker">TASKS · <span id="today"></span></div>
    <h1>Tasks</h1>
    <div class="meta" id="meta">0 open · 0 done</div>
  </header>

  <div class="input-row">
    <input id="task" type="text" placeholder="What needs doing?" autocomplete="off" autocapitalize="sentences" maxlength="140" />
    <button id="add" aria-label="Add task">+</button>
  </div>

  <div class="filters">
    <button class="chip active" data-filter="all">All</button>
    <button class="chip" data-filter="active">Active</button>
    <button class="chip" data-filter="done">Done</button>
  </div>

  <div class="list" id="list"></div>

  <div class="footer">
    <span class="footer-counts" id="counts"></span>
    <button class="clear" id="clear">CLEAR DONE</button>
  </div>

<script>
(function () {
  const STORAGE = 'agentos-tasks-v1';
  let state = {
    items: [],
    filter: 'all',
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) state.items = parsed.items;
      }
    } catch {}
  }
  function save() {
    try { localStorage.setItem(STORAGE, JSON.stringify({ items: state.items })); } catch {}
  }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function render() {
    const list = document.getElementById('list');
    list.innerHTML = '';

    const filtered = state.items.filter(i => {
      if (state.filter === 'active') return !i.done;
      if (state.filter === 'done') return i.done;
      return true;
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.innerHTML = state.items.length === 0
        ? '<h2>Nothing yet.</h2><p>Add a task above. It survives reloads.</p>'
        : '<h2>Clear.</h2><p>Nothing here matches the filter.</p>';
      list.appendChild(empty);
    } else {
      filtered.forEach(item => {
        const el = document.createElement('div');
        el.className = 'item' + (item.done ? ' done' : '');
        el.innerHTML = \`
          <div class="check" data-id="\${item.id}" role="checkbox" aria-checked="\${item.done}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="item-text">\${escape(item.text)}</div>
          <button class="delete" data-del="\${item.id}" aria-label="Delete">×</button>
        \`;
        list.appendChild(el);
      });
    }

    const open = state.items.filter(i => !i.done).length;
    const done = state.items.length - open;
    document.getElementById('meta').textContent = \`\${open} open · \${done} done\`;
    document.getElementById('counts').textContent = \`\${state.items.length} TOTAL\`;
    document.getElementById('clear').disabled = done === 0;

    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === state.filter);
    });
  }

  function escape(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function add(text) {
    const t = text.trim();
    if (!t) return;
    state.items.unshift({ id: id(), text: t, done: false, at: Date.now() });
    save();
    render();
  }
  function toggle(itemId) {
    const it = state.items.find(i => i.id === itemId);
    if (it) {
      it.done = !it.done;
      save();
      render();
    }
  }
  function remove(itemId) {
    state.items = state.items.filter(i => i.id !== itemId);
    save();
    render();
  }
  function clearDone() {
    state.items = state.items.filter(i => !i.done);
    save();
    render();
  }
  function setFilter(f) {
    state.filter = f;
    render();
  }

  document.getElementById('add').addEventListener('click', () => {
    const input = document.getElementById('task');
    add(input.value);
    input.value = '';
    input.focus();
  });
  document.getElementById('task').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      add(e.target.value);
      e.target.value = '';
    }
  });
  document.getElementById('list').addEventListener('click', e => {
    const check = e.target.closest('.check');
    if (check) return toggle(check.dataset.id);
    const del = e.target.closest('.delete');
    if (del) return remove(del.dataset.del);
  });
  document.getElementById('clear').addEventListener('click', clearDone);
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => setFilter(c.dataset.filter));
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  document.getElementById('today').textContent = today;

  load();
  render();
})();
</script>
</body>
</html>
`,
  "demo-calculator": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
<meta name="theme-color" content="#0a0a0a" />
<title>Calc</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0a0a;
    --tile: rgba(255,255,255,0.05);
    --tile-edge: rgba(255,255,255,0.09);
    --tile-press: rgba(255,255,255,0.12);
    --text: #ffffff;
    --text-dim: rgba(255,255,255,0.55);
    --text-mute: rgba(255,255,255,0.30);
    --text-ghost: rgba(255,255,255,0.18);
    --accent: #FFB54C;
    --serif: 'Instrument Serif', serif;
    --body: 'Manrope', system-ui, sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; user-select: none; }
  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--body);
    min-height: 100vh;
    overscroll-behavior: contain;
  }
  body {
    padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  header {
    padding: 28px 24px 12px;
  }
  .kicker {
    font-family: var(--mono);
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 2.6px;
    color: var(--text-mute);
    text-transform: uppercase;
  }
  h1 {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 400;
    font-size: 36px;
    line-height: 1;
    letter-spacing: -1px;
    margin-top: 10px;
  }
  .display {
    flex: 1;
    padding: 28px 24px 20px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
  }
  .history {
    font-family: var(--mono);
    font-size: 14px;
    color: var(--text-mute);
    letter-spacing: 0.3px;
    text-align: right;
    min-height: 22px;
    word-break: break-all;
  }
  .result {
    font-family: var(--body);
    font-weight: 500;
    font-size: 64px;
    color: var(--text);
    letter-spacing: -1.5px;
    text-align: right;
    line-height: 1.05;
    margin-top: 6px;
    word-break: break-all;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .result.short { font-size: 72px; }
  .result.long { font-size: 48px; }
  .result.xlong { font-size: 34px; }
  .pad {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    padding: 0 16px 16px;
  }
  button.key {
    aspect-ratio: 1;
    border: 1px solid var(--tile-edge);
    background: var(--tile);
    color: var(--text);
    border-radius: 22px;
    font-family: var(--body);
    font-weight: 500;
    font-size: 22px;
    letter-spacing: 0.2px;
    cursor: pointer;
    transition: background 80ms ease, transform 80ms ease;
  }
  button.key:active {
    background: var(--tile-press);
    transform: scale(0.94);
  }
  button.op {
    color: var(--accent);
    font-family: var(--mono);
    font-weight: 500;
    font-size: 24px;
  }
  button.op.active {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
  }
  button.mod {
    color: var(--text-dim);
    font-family: var(--mono);
    font-weight: 500;
    font-size: 18px;
  }
  button.eq {
    background: #ffffff;
    color: var(--bg);
    border-color: #ffffff;
    font-family: var(--mono);
    font-weight: 500;
    font-size: 26px;
  }
  button.zero {
    aspect-ratio: auto;
    grid-column: span 2;
    text-align: left;
    padding-left: 32px;
  }
</style>
</head>
<body>
  <header>
    <div class="kicker">AGENT/OS · CALCULATOR</div>
    <h1>Calc</h1>
  </header>

  <div class="display">
    <div class="history" id="history"></div>
    <div class="result short" id="result">0</div>
  </div>

  <div class="pad">
    <button class="key mod" data-act="clear">AC</button>
    <button class="key mod" data-act="sign">+/−</button>
    <button class="key mod" data-act="percent">%</button>
    <button class="key op" data-op="/">÷</button>

    <button class="key" data-num="7">7</button>
    <button class="key" data-num="8">8</button>
    <button class="key" data-num="9">9</button>
    <button class="key op" data-op="*">×</button>

    <button class="key" data-num="4">4</button>
    <button class="key" data-num="5">5</button>
    <button class="key" data-num="6">6</button>
    <button class="key op" data-op="-">−</button>

    <button class="key" data-num="1">1</button>
    <button class="key" data-num="2">2</button>
    <button class="key" data-num="3">3</button>
    <button class="key op" data-op="+">+</button>

    <button class="key zero" data-num="0">0</button>
    <button class="key" data-num=".">.</button>
    <button class="key eq" data-act="equals">=</button>
  </div>

<script>
(function () {
  let state = {
    display: '0',         // string being shown
    accumulator: null,    // first operand
    op: null,             // pending operator
    waitingForOperand: false,
    history: '',
  };

  function format(n) {
    if (n === null || n === undefined || isNaN(n)) return 'Error';
    if (!isFinite(n)) return '∞';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs > 1e12 || abs < 1e-6)) {
      return n.toExponential(6).replace('e+', 'e').replace(/(\\.\\d*?)0+e/, '$1e');
    }
    const rounded = Math.round(n * 1e10) / 1e10;
    return String(rounded);
  }

  function applyDisplaySize() {
    const r = document.getElementById('result');
    const len = r.textContent.length;
    r.classList.remove('short', 'long', 'xlong');
    if (len > 14) r.classList.add('xlong');
    else if (len > 9) r.classList.add('long');
    else r.classList.add('short');
  }

  function render() {
    document.getElementById('result').textContent = state.display;
    document.getElementById('history').textContent = state.history;
    document.querySelectorAll('.op').forEach(b => {
      b.classList.toggle('active', !!state.op && state.waitingForOperand && b.dataset.op === state.op);
    });
    applyDisplaySize();
  }

  function inputDigit(d) {
    if (state.waitingForOperand) {
      state.display = d === '.' ? '0.' : d;
      state.waitingForOperand = false;
    } else {
      if (d === '.') {
        if (!state.display.includes('.')) state.display += '.';
      } else {
        state.display = state.display === '0' ? d : (state.display.length < 12 ? state.display + d : state.display);
      }
    }
    render();
  }

  function compute(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function pressOp(op) {
    const current = parseFloat(state.display);
    if (state.accumulator === null) {
      state.accumulator = current;
    } else if (state.op && !state.waitingForOperand) {
      const result = compute(state.accumulator, current, state.op);
      state.accumulator = result;
      state.display = format(result);
    }
    state.op = op;
    state.waitingForOperand = true;
    const sym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];
    state.history = format(state.accumulator) + ' ' + sym;
    render();
  }

  function pressEquals() {
    if (state.op === null || state.accumulator === null) return;
    const current = parseFloat(state.display);
    const result = compute(state.accumulator, current, state.op);
    const sym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[state.op];
    state.history = format(state.accumulator) + ' ' + sym + ' ' + format(current) + ' =';
    state.display = format(result);
    state.accumulator = result;
    state.op = null;
    state.waitingForOperand = true;
    render();
  }

  function pressClear() {
    state.display = '0';
    state.accumulator = null;
    state.op = null;
    state.waitingForOperand = false;
    state.history = '';
    render();
  }

  function pressSign() {
    if (state.display === '0') return;
    state.display = state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display;
    render();
  }

  function pressPercent() {
    state.display = format(parseFloat(state.display) / 100);
    render();
  }

  document.querySelectorAll('.key').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.num !== undefined) inputDigit(b.dataset.num);
      else if (b.dataset.op !== undefined) pressOp(b.dataset.op);
      else if (b.dataset.act === 'equals') pressEquals();
      else if (b.dataset.act === 'clear') pressClear();
      else if (b.dataset.act === 'sign') pressSign();
      else if (b.dataset.act === 'percent') pressPercent();
    });
  });

  document.addEventListener('keydown', e => {
    if (/^\\d$/.test(e.key)) inputDigit(e.key);
    else if (e.key === '.') inputDigit('.');
    else if (e.key === '+' || e.key === '-') pressOp(e.key);
    else if (e.key === '*') pressOp('*');
    else if (e.key === '/') { e.preventDefault(); pressOp('/'); }
    else if (e.key === 'Enter' || e.key === '=') pressEquals();
    else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') pressClear();
    else if (e.key === '%') pressPercent();
  });

  render();
})();
</script>
</body>
</html>
`,
  "demo-tictactoe": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
<meta name="theme-color" content="#0a0a0a" />
<title>Tic Tac Toe</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0a0a;
    --tile: rgba(255,255,255,0.05);
    --tile-edge: rgba(255,255,255,0.09);
    --tile-press: rgba(255,255,255,0.12);
    --text: #ffffff;
    --text-dim: rgba(255,255,255,0.55);
    --text-mute: rgba(255,255,255,0.30);
    --text-ghost: rgba(255,255,255,0.18);
    --x: #FF7A4D;
    --o: #7CE7C7;
    --serif: 'Instrument Serif', serif;
    --body: 'Manrope', system-ui, sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; user-select: none; }
  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--body);
    min-height: 100vh;
    overscroll-behavior: contain;
  }
  body {
    padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  header {
    padding: 28px 24px 18px;
  }
  .kicker {
    font-family: var(--mono);
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 2.6px;
    color: var(--text-mute);
    text-transform: uppercase;
  }
  h1 {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 400;
    font-size: 48px;
    line-height: 1;
    letter-spacing: -1.4px;
    margin-top: 10px;
  }
  .scoreboard {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    padding: 0 24px 16px;
  }
  .score {
    background: var(--tile);
    border: 1px solid var(--tile-edge);
    border-radius: 16px;
    padding: 12px 14px;
    text-align: center;
  }
  .score.x { border-color: rgba(255,122,77,0.25); background: rgba(255,122,77,0.04); }
  .score.o { border-color: rgba(124,231,199,0.22); background: rgba(124,231,199,0.04); }
  .score-label {
    font-family: var(--mono);
    font-weight: 500;
    font-size: 9px;
    letter-spacing: 2px;
    color: var(--text-mute);
    margin-bottom: 6px;
  }
  .score.x .score-label { color: var(--x); }
  .score.o .score-label { color: var(--o); }
  .score-value {
    font-family: var(--serif);
    font-style: italic;
    font-size: 30px;
    line-height: 1;
    letter-spacing: -0.6px;
  }
  .score.x .score-value { color: var(--x); }
  .score.o .score-value { color: var(--o); }
  .turn-strip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 6px 24px 14px;
  }
  .turn-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--x);
  }
  .turn-dot.is-o { background: var(--o); }
  .turn-label {
    font-family: var(--mono);
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 2px;
    color: var(--text-dim);
  }
  .board-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 24px 24px;
  }
  .board {
    width: 100%;
    max-width: 360px;
    aspect-ratio: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 10px;
  }
  .cell {
    background: var(--tile);
    border: 1px solid var(--tile-edge);
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 100ms ease, transform 100ms ease;
    font-family: var(--serif);
    font-style: italic;
    font-size: 64px;
    line-height: 1;
    letter-spacing: -2px;
  }
  .cell:active:not(.filled) { background: var(--tile-press); transform: scale(0.96); }
  .cell.filled { cursor: default; }
  .cell.x { color: var(--x); }
  .cell.o { color: var(--o); }
  .cell.win {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.3);
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
    50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
  }
  .footer {
    padding: 0 24px 20px;
    display: flex;
    gap: 10px;
  }
  .btn {
    flex: 1;
    padding: 14px 18px;
    border-radius: 999px;
    border: 1px solid var(--tile-edge);
    background: var(--tile);
    color: var(--text);
    font-family: var(--mono);
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 1.8px;
    cursor: pointer;
    transition: opacity 100ms ease;
  }
  .btn.primary { background: #ffffff; color: var(--bg); border-color: #ffffff; }
  .btn:active { opacity: 0.7; }
  .banner {
    margin: 4px 24px 0;
    padding: 14px 16px;
    text-align: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--tile-edge);
    border-radius: 18px;
    font-family: var(--serif);
    font-style: italic;
    font-size: 22px;
    letter-spacing: -0.4px;
    display: none;
  }
  .banner.show { display: block; animation: fadeIn 200ms ease; }
  .banner .winner-x { color: var(--x); }
  .banner .winner-o { color: var(--o); }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
</head>
<body>
  <header>
    <div class="kicker">AGENT/OS · TIC TAC TOE</div>
    <h1>Tic Tac Toe</h1>
  </header>

  <div class="scoreboard">
    <div class="score x">
      <div class="score-label">X WINS</div>
      <div class="score-value" id="score-x">0</div>
    </div>
    <div class="score">
      <div class="score-label">DRAWS</div>
      <div class="score-value" id="score-d">0</div>
    </div>
    <div class="score o">
      <div class="score-label">O WINS</div>
      <div class="score-value" id="score-o">0</div>
    </div>
  </div>

  <div class="turn-strip">
    <div class="turn-dot" id="turn-dot"></div>
    <div class="turn-label" id="turn-label">X TO PLAY</div>
  </div>

  <div class="board-wrap">
    <div class="board" id="board"></div>
  </div>

  <div class="banner" id="banner"></div>

  <div class="footer">
    <button class="btn" id="reset-scores">RESET ALL</button>
    <button class="btn primary" id="new-round">NEW ROUND</button>
  </div>

<script>
(function () {
  const STORAGE = 'agentos-ttt-v1';
  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];

  let state = {
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    winLine: null,
    scores: { X: 0, O: 0, D: 0 },
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.scores) state.scores = p.scores;
      }
    } catch {}
  }
  function save() {
    try { localStorage.setItem(STORAGE, JSON.stringify({ scores: state.scores })); } catch {}
  }

  function checkWinner(b) {
    for (const line of WIN_LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line };
    }
    if (b.every(Boolean)) return { winner: 'D', line: null };
    return null;
  }

  function play(i) {
    if (state.board[i] || state.winner) return;
    state.board[i] = state.turn;
    const result = checkWinner(state.board);
    if (result) {
      state.winner = result.winner;
      state.winLine = result.line;
      state.scores[result.winner] = (state.scores[result.winner] || 0) + 1;
      save();
    } else {
      state.turn = state.turn === 'X' ? 'O' : 'X';
    }
    render();
  }

  function newRound() {
    state.board = Array(9).fill(null);
    state.winner = null;
    state.winLine = null;
    state.turn = 'X';
    render();
  }

  function resetAll() {
    state.scores = { X: 0, O: 0, D: 0 };
    save();
    newRound();
  }

  function render() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      const v = state.board[i];
      cell.className = 'cell' + (v ? ' filled ' + v.toLowerCase() : '') +
                       (state.winLine && state.winLine.includes(i) ? ' win' : '');
      cell.textContent = v || '';
      cell.addEventListener('click', () => play(i));
      board.appendChild(cell);
    }
    document.getElementById('score-x').textContent = state.scores.X;
    document.getElementById('score-o').textContent = state.scores.O;
    document.getElementById('score-d').textContent = state.scores.D;
    const dot = document.getElementById('turn-dot');
    dot.classList.toggle('is-o', state.turn === 'O');
    document.getElementById('turn-label').textContent = state.turn + ' TO PLAY';

    const banner = document.getElementById('banner');
    if (state.winner === 'D') {
      banner.innerHTML = '<em>A draw.</em>';
      banner.classList.add('show');
    } else if (state.winner) {
      const klass = state.winner === 'X' ? 'winner-x' : 'winner-o';
      banner.innerHTML = \`<span class="\${klass}">\${state.winner}</span> takes it.\`;
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
      banner.innerHTML = '';
    }
  }

  document.getElementById('new-round').addEventListener('click', newRound);
  document.getElementById('reset-scores').addEventListener('click', resetAll);

  load();
  render();
})();
</script>
</body>
</html>
`,
};

export function getBuiltHtml(id: string): string | undefined {
  return BUILT_APP_HTML[id];
}
