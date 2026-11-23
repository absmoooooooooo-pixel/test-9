// Headless Chrome CDP mobile-layout probe for the Nut & Bolt calculator.
// Usage: node tools/mobile-check.mjs [width ...]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const URL = 'http://127.0.0.1:8099/frontend/calculators/nut-bolt/index.html';
const OUT = 'C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\nb-mobile';
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean);
const widths = WIDTHS.length ? WIDTHS : [320, 360, 375, 390, 412, 430];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(OUT, { recursive: true });

const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--disable-extensions',
  '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\nb-cdp-profile-${Date.now()}`,
  'about:blank'
], { stdio: 'ignore' });

async function target() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not ready */ }
    await sleep(250);
  }
  throw new Error('Chrome CDP did not start');
}

const ws = new WebSocket(await target());
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

const measureScript = `(() => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const overflow = [];
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 0.5 || r.left < -0.5) {
      overflow.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute('class') || '').slice(0, 80),
        id: el.id || '',
        left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10,
        w: Math.round(r.width * 10) / 10,
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        minW: cs.minWidth,
        overflowX: cs.overflowX
      });
    }
  }
  const dv = document.getElementById('fastenerDiagramViews');
  const svg = dv && dv.querySelector('svg');
  const svgRect = svg && svg.getBoundingClientRect();
  const vb = svg && svg.viewBox && svg.viewBox.baseVal;
  const label = svg && svg.querySelector('.fastener-label');
  const labelRect = label && label.getBoundingClientRect();
  const labels = svg ? Array.from(svg.querySelectorAll('.fastener-label')) : [];
  const boxes = labels.map((el) => { const b = el.getBBox(); return {x: b.x, y: b.y, w: b.width, h: b.height, t: el.textContent}; });
  let labelOverlaps = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) labelOverlaps += 1;
    }
  }
  const outside = boxes.filter((b) => b.x < 0 || b.y < 0 || (vb && b.x + b.w > vb.width) || (vb && b.y + b.h > vb.height)).map((b) => b.t);
  const notes = svg ? Array.from(svg.querySelectorAll('.fastener-note, .fastener-view-title, .fastener-sheet-title')) : [];
  const noteBoxes = notes.map((el) => { const b = el.getBBox(); return {t: el.textContent, x: b.x, y: b.y, w: b.width, h: b.height}; });
  const notesOutside = noteBoxes.filter((b) => b.x < 0 || b.y < 0 || (vb && b.x + b.w > vb.width) || (vb && b.y + b.h > vb.height));
  return {
    vw,
    innerHeight: window.innerHeight,
    docScrollW: de.scrollWidth,
    bodyScrollW: document.body.scrollWidth,
    clientW: de.clientWidth,
    hasHScroll: de.scrollWidth > de.clientWidth + 1,
    container: (() => { const r = document.querySelector('.container').getBoundingClientRect(); return {left: r.left, right: r.right, w: r.width}; })(),
    card: (() => { const r = document.querySelector('.card').getBoundingClientRect(); return {left: r.left, right: r.right, w: r.width}; })(),
    diagram: dv ? {w: dv.getBoundingClientRect().width, scrollW: dv.scrollWidth, clientW: dv.clientWidth, overflowX: getComputedStyle(dv).overflowX, minWidthOfSvg: svg ? getComputedStyle(svg).minWidth : ''} : null,
    svg: svgRect ? {left: svgRect.left, right: svgRect.right, w: svgRect.width, h: svgRect.height, vbW: vb && vb.width, vbH: vb && vb.height} : null,
    label: labelRect ? {w: labelRect.width, h: labelRect.height, fontSize: label && getComputedStyle(label).fontSize} : null,
    labels: {count: labels.length, overlaps: labelOverlaps, outside: outside.slice(0, 10), notesOutside: notesOutside.slice(0, 10), noteSizes: notes.slice(0, 3).map((n) => getComputedStyle(n).fontSize)},
    overflowCount: overflow.length,
    overflow: overflow.slice(0, 30)
  };
})()`;

await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__nbConsole = []; window.addEventListener('error', function (e) { window.__nbConsole.push(String(e.message)); }); window.addEventListener('unhandledrejection', function (e) { window.__nbConsole.push(String(e.reason)); });`
});

const results = [];
for (const width of widths) {
  await send('Emulation.setDeviceMetricsOverride', {
    width, height: 900, deviceScaleFactor: 1, mobile: true
  });
  await send('Runtime.evaluate', { expression: 'window.__nbFresh = true' });
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 60; i += 1) {
    const ready = await send('Runtime.evaluate', {
      expression: "window.__nbFresh !== true && document.readyState === 'complete' && !!document.getElementById('fastenerDiagramViews') && !!document.querySelector('#fastenerDiagramViews svg')",
      returnByValue: true
    });
    if (ready.result && ready.result.value === true) break;
    await sleep(250);
  }
  const res = await send('Runtime.evaluate', { expression: measureScript, returnByValue: true });
  const data = res.result && res.result.value;
  if (!data) { console.log(width, JSON.stringify(res).slice(0, 2000)); continue; }
  const func = await send('Runtime.evaluate', {
    expression: `(async () => {
      const sz = document.getElementById('sizeSelect');
      const opt = Array.from(sz.options).find((o) => o.value && /M10/i.test(o.textContent));
      if (opt) { sz.value = opt.value; sz.dispatchEvent(new Event('change', {bubbles: true})); }
      const before = document.getElementById('totalWeight').textContent;
      document.getElementById('calculateBtn').click();
      await new Promise((r) => setTimeout(r, 1200));
      const after = document.getElementById('totalWeight').textContent;
      const lbs = document.getElementById('totalPounds').textContent;
      const visible = document.getElementById('results').classList.contains('visible');
      document.getElementById('resetBtn').click();
      const afterReset = document.getElementById('results').classList.contains('visible');
      const tabs = Array.from(document.querySelectorAll('.category-tab'));
      const switched = [];
      for (const t of tabs) { t.click(); switched.push(t.classList.contains('active')); }
      tabs[0].click();
      return {
        before, after, lbs, visible, afterReset,
        tabsSwitched: switched.every(Boolean),
        error: document.getElementById('error').textContent
      };
    })()`,
    returnByValue: true, awaitPromise: true
  });
  const errs = await send('Runtime.evaluate', { expression: 'window.__nbConsole || []', returnByValue: true });
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  if (!shot || !shot.data) { console.log('screenshot failed', width, JSON.stringify(shot)); continue; }
  await writeFile(path.join(OUT, `nut-bolt-${width}.png`), Buffer.from(shot.data, 'base64'));
  results.push({ width, ...data, functional: func.result && func.result.value, errors: errs.result && errs.result.value });
  console.log(JSON.stringify({ width, scrollW: data.docScrollW, clientW: data.clientW, hasHScroll: data.hasHScroll, overflowCount: data.overflowCount, functional: func.result && func.result.value, errors: errs.result && errs.result.value }));
}
await writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
ws.close();
proc.kill();
