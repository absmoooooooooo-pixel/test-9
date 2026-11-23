// Headless DOM verification of the global section swap.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { get as httpGet } from 'node:http';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9337;
const BASE = 'http://127.0.0.1:8011';
const OUT = 'C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\section-order-verify';
const WORKSPACE = 'A:\\SAN\\P2\\NEW 23-11-2026\\START 23-11-2026';
const PAGES = ['plate', 'round-bar', 'pipe', 'flange-plate', 'dish-ends', 'nut-bolt'];
const log = (m) => console.error('[verify]', m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (url) => new Promise((resolve, reject) => {
  httpGet(url, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
  }).on('error', reject);
});
await mkdir(OUT, { recursive: true });

const server = spawn('python', ['-m', 'http.server', '8011', '--bind', '127.0.0.1'], {
  cwd: WORKSPACE, stdio: 'ignore'
});
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--disable-extensions',
  '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${OUT}\\cdp-profile-${Date.now()}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = '';
chrome.stderr.on('data', (d) => { chromeErr += String(d); });

try {
  let serverReady = false;
  for (let i = 0; i < 60 && !serverReady; i += 1) {
    try { serverReady = (await fetch(BASE + '/')).ok; } catch { /* not ready */ }
    if (!serverReady) await sleep(250);
  }
  if (!serverReady) throw new Error('static server did not start');
  log('static server ready');

  let debuggerUrl;
  for (let i = 0; i < 80 && !debuggerUrl; i += 1) {
    try {
      const list = await getJson(`http://127.0.0.1:${PORT}/json`);
      const page = list.find((t) => t.type === 'page');
      if (page) debuggerUrl = page.webSocketDebuggerUrl;
    } catch { /* not ready */ }
    if (!debuggerUrl) await sleep(250);
  }
  if (!debuggerUrl) throw new Error('Chrome CDP did not start; chrome stderr: ' + chromeErr.slice(0, 800));
  const ws = new WebSocket(debuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  log('cdp connected');

  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  };
  const withTimeout = (promise, ms, label) => Promise.race([
    promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout: ' + label)), ms))
  ]);
  const send = (method, params = {}) => {
    const id = ++seq;
    return withTimeout(new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    }), 20000, method);
  };
  const evaluate = async (expression, promise = false) => {
    const wrapper = promise ? `(async () => { ${expression} })()` : `(() => { ${expression} })()`;
    const r = await send('Runtime.evaluate', {
      expression: wrapper, returnByValue: true, awaitPromise: promise
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result && r.result.value;
  };

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false
  });

  const readOrder = () => evaluate(`
    const gradesRoot = document.querySelector('[data-calculator-grade-panel]');
    const gradesTitle = document.getElementById('calcGradesTitle');
    const formulaTitle = document.querySelector('h2[id$="FormulaTitle"], #methodTitle');
    const formulaCard = formulaTitle && formulaTitle.closest('section');
    const how = Array.from(document.querySelectorAll('h3'))
      .find((e) => /How to Calculate/i.test(e.textContent || ''));
    const example = document.getElementById('methodExample')
      || Array.from(document.querySelectorAll('h3'))
        .find((e) => /Calculation Example/i.test(e.textContent || ''));
    const before = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top + scrollY), height: Math.round(r.height) };
    };
    return {
      gradesRootCount: document.querySelectorAll('[data-calculator-grade-panel]').length,
      formulaTitleCount: document.querySelectorAll('h2[id$="FormulaTitle"], #methodTitle').length,
      gradesText: gradesTitle && gradesTitle.textContent.trim(),
      formulaText: formulaTitle && formulaTitle.textContent.trim(),
      howText: how && how.textContent.trim(),
      exampleText: example && (example.textContent || '').trim().slice(0, 40),
      order: {
        gradesBeforeFormula: before(gradesRoot, formulaCard),
        formulaBeforeHow: before(formulaCard, how),
        howBeforeExample: before(how, example),
        gradesBeforeExample: before(gradesRoot, example)
      },
      boxes: { grades: box(gradesRoot), formula: box(formulaCard) },
      formulaHidden: formulaCard ? formulaCard.hidden : null
    };
  `);

  const results = [];
  for (const name of PAGES) {
    await send('Page.navigate', { url: `${BASE}/frontend/calculators/${name}/index.html` });
    let ready = false;
    for (let i = 0; i < 100; i += 1) {
      ready = await evaluate(`
        return document.readyState !== 'loading'
          && !!document.querySelector('[data-calculator-grade-panel]')
          && !!document.getElementById('calcGradesTitle')
          && !!document.querySelector('h2[id$="FormulaTitle"], #methodTitle');
      `);
      if (ready) break;
      await sleep(300);
    }
    if (!ready) throw new Error(`${name}: page did not finish rendering`);
    await sleep(400);
    const data = await readOrder();
    results.push({ page: name, ...data });
    log(`${name}: ${JSON.stringify(data.order)}`);

    if (name === 'plate' || name === 'round-bar') {
      const clip = await evaluate(`
        const g = document.querySelector('[data-calculator-grade-panel]').getBoundingClientRect();
        const f = document.querySelector('h2[id$="FormulaTitle"]').closest('section').getBoundingClientRect();
        const top = Math.max(0, Math.floor(g.top + scrollY + g.height - 260));
        const bottom = Math.ceil(f.top + scrollY + 180);
        return { x: 0, y: top, width: 1440, height: Math.max(300, bottom - top), scale: 1 };
      `);
      const shot = await send('Page.captureScreenshot', {
        format: 'png', clip, captureBeyondViewport: false
      });
      await writeFile(`${OUT}\\${name}-section-boundary.png`, Buffer.from(shot.data, 'base64'));
    }
  }

  await writeFile(`${OUT}\\result.json`, JSON.stringify(results, null, 2));
  log('screenshots + result written');
  console.log(JSON.stringify(results, null, 2));

  const failures = [];
  for (const r of results) {
    if (r.gradesRootCount !== 1) failures.push(`${r.page}: grades root count ${r.gradesRootCount}`);
    if (r.formulaTitleCount !== 1) failures.push(`${r.page}: formula title count ${r.formulaTitleCount}`);
    if (r.gradesText !== 'Material Grades and Applications') failures.push(`${r.page}: grades heading ${r.gradesText}`);
    if (r.formulaText !== 'Weight Calculation Formula') failures.push(`${r.page}: formula heading ${r.formulaText}`);
    if (!r.howText) failures.push(`${r.page}: How-to heading missing`);
    if (!r.exampleText) failures.push(`${r.page}: example missing`);
    for (const [key, ok] of Object.entries(r.order)) {
      if (!ok) failures.push(`${r.page}: ${key} is false`);
    }
    if (r.boxes.grades && r.boxes.formula && !r.formulaHidden
        && r.boxes.grades.top >= r.boxes.formula.top) {
      failures.push(`${r.page}: rendered grades not above formula`);
    }
  }
  console.log(failures.length ? 'FAIL: ' + failures.join('; ') : 'PASS: rendered section order verified on all sampled pages');
  if (failures.length) process.exitCode = 1;
  ws.close();
} finally {
  chrome.kill();
  server.kill();
}
