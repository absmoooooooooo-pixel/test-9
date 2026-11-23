// Deep mobile probe: cycles categories, products, standards and sizes and
// checks the rendered SVG plus page overflow at each state.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9344;
const PAGE = 'http://127.0.0.1:8099/frontend/calculators/nut-bolt/index.html';
const OUT = 'C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\nb-mobile';
const widths = [320, 430];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(OUT, { recursive: true });

const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\nb-deep-${Date.now()}`,
  'about:blank'
], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 60; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const page = list.find((t) => t.type === 'page');
    if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch { /* wait */ }
  await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evalJs = async (script) => {
  const r = await send('Runtime.evaluate', { expression: script, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.result));
  return r.result.value;
};

// Same-URL navigation can resolve before the old document is replaced. A
// sentinel makes the readiness poll wait for the new document specifically.
const navigateFresh = async () => {
  await evalJs('window.__nbFresh = true');
  await send('Page.navigate', { url: PAGE });
  for (let i = 0; i < 60; i += 1) {
    const ready = await evalJs(`window.__nbFresh !== true && document.readyState === 'complete' && !!document.querySelector('#fastenerDiagramViews svg')`);
    if (ready === true) return;
    await sleep(250);
  }
  throw new Error('Page did not reload');
};

const inspect = `(async () => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const vw = window.innerWidth;
  const svg = document.querySelector('#fastenerDiagramViews svg');
  const vb = svg && svg.viewBox && svg.viewBox.baseVal;
  const texts = svg ? Array.from(svg.querySelectorAll('.fastener-label,.fastener-note,.fastener-view-title,.fastener-sheet-title')) : [];
  const sr = svg && svg.getBoundingClientRect();
  const scale = sr && vb ? vb.width / sr.width : 1;
  const boxes = texts.map((el) => { const r = el.getBoundingClientRect(); return {t: el.textContent.trim(), x: (r.left - sr.left) * scale, y: (r.top - sr.top) * scale, w: r.width * scale, h: r.height * scale}; });
  const outside = boxes.filter((b) => b.x < -0.5 || b.y < -0.5 || (vb && b.x + b.w > vb.width + 0.5) || (vb && b.y + b.h > vb.height + 0.5));
  let overlaps = 0;
  const labels = boxes.filter((b) => texts[boxes.indexOf(b)].classList.contains('fastener-label'));
  for (let i = 0; i < labels.length; i += 1) for (let j = i + 1; j < labels.length; j += 1) {
    const a = labels[i], b = labels[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps += 1;
  }
  const badWidth = Array.from(document.querySelectorAll('body *')).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
  }).slice(0, 5).map((el) => el.tagName + '.' + (el.getAttribute('class') || ''));
  const r = svg && svg.getBoundingClientRect();
  return {
    vw, hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    svgW: r && Math.round(r.width), svgH: r && Math.round(r.height),
    texts: texts.length, outside: outside.map((b) => b.t).slice(0, 6), overlaps,
    badWidth
  };
})()`;

const drive = `(async (cat, prod, std, size) => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const tab = document.querySelector('.category-tab[data-category="' + cat + '"]');
  if (tab && !tab.classList.contains('active')) tab.click();
  const p = document.getElementById('productSelect');
  if (p.value !== prod) { p.value = prod; p.dispatchEvent(new Event('change', {bubbles: true})); }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const s = document.getElementById('standardSelect');
  const opts = Array.from(s.options).map((o) => o.value);
  if (std && opts.indexOf(std) >= 0 && s.value !== std) { s.value = std; s.dispatchEvent(new Event('change', {bubbles: true})); }
  const sz = document.getElementById('sizeSelect');
  const szOpts = Array.from(sz.options).map((o) => o.value).filter(Boolean);
  if (size && szOpts.indexOf(size) >= 0 && sz.value !== size) { sz.value = size; sz.dispatchEvent(new Event('change', {bubbles: true})); }
  return {
    category: cat, product: p.value, productLabel: p.selectedOptions[0] && p.selectedOptions[0].textContent,
    standards: opts, sizes: szOpts
  };
})`;

const all = [];
for (const width of widths) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigateFresh();
  const cats = await evalJs(`Array.from(document.querySelectorAll('.category-tab')).map((t) => t.dataset.category)`);
  let states = 0;
  for (const cat of cats) {
    const products = await evalJs(`(() => { const t = document.querySelector('.category-tab[data-category="${cat}"]'); if (!t.classList.contains('active')) t.click(); return Array.from(document.getElementById('productSelect').options).map((o) => o.value); })()`);
    for (const prod of products) {
      const info = await evalJs(`(${drive})("${cat}","${prod}","","")`);
      let stds = info.standards.length ? info.standards : [''];
      for (const std of stds) {
        const st = await evalJs(`(${drive})("${cat}","${prod}","${std}","")`);
        const sizes = st.sizes.length ? [st.sizes[0], st.sizes[Math.floor(st.sizes.length / 2)], st.sizes[st.sizes.length - 1]] : [''];
        for (const size of sizes) {
          await evalJs(`(${drive})("${cat}","${prod}","${std}","${size}")`);
          const m = await evalJs(inspect);
          states += 1;
          if (m.outside.length || m.overlaps || m.badWidth.length || m.hScroll || !m.svgW) {
            all.push({ width, cat, prod, std, size, ...m });
          }
        }
      }
    }
  }
  console.log(JSON.stringify({ width, states, failuresSoFar: all.filter((f) => f.width === width).length }));
  // Reload so the calculation test starts from the page's default state.
  await navigateFresh();
  // Functional smoke test on this viewport.
  const functional = await evalJs(`(async () => {
    const p = document.getElementById('productSelect');
    const sz = document.getElementById('sizeSelect');
    const opt = Array.from(sz.options).find((o) => o.value && /M10/i.test(o.textContent));
    if (opt) { sz.value = opt.value; sz.dispatchEvent(new Event('change', {bubbles: true})); }
    const before = document.getElementById('totalWeight').textContent;
    document.getElementById('calculateBtn').click();
    await new Promise((r) => setTimeout(r, 900));
    const after = document.getElementById('totalWeight').textContent;
    document.getElementById('resetBtn').click();
    await new Promise((r) => setTimeout(r, 200));
    return {before, after, reset: document.getElementById('totalWeight').textContent,
            error: document.getElementById('error').textContent,
            visible: document.getElementById('results').classList.contains('visible')};
  })()`);
  console.log(JSON.stringify({ width, states, failures: all.filter((f) => f.width === width).length, functional }));
}
await writeFile(`${OUT}/deep-results.json`, JSON.stringify(all, null, 2));
console.log('total failures', all.length);
ws.close(); proc.kill();
