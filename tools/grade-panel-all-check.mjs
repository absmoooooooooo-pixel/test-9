// Verify the shared grade panel on every calculator page.
import { spawn } from 'node:child_process';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9337;
const BASE = 'http://127.0.0.1:8099/frontend/calculators';
const PAGES = [
  'box-channel', 'c-channel', 'circular-plate', 'dish-ends', 'e-section',
  'flange-plate', 'hexagon-bar', 'hexagonal-bar-with-round-hole', 'i-channel',
  'l-channel', 'nut-bolt', 'pipe', 'plate', 'round-bar',
  'round-bar-with-hexagonal-hole', 'shell', 'solid-cone', 'sphere-ball',
  'square-bar', 't-channel', 'trapezium-bar', 'trapezoidal-bar',
  'triangular-bar', 'truncated-cone'
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--disable-extensions',
  '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\gpa-cdp-profile-${Date.now()}`,
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
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__gpaConsole=[];window.addEventListener('error',e=>window.__gpaConsole.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__gpaConsole.push(String(e.reason)));`
});
await send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 900, deviceScaleFactor: 1, mobile: true
});

const failures = [];
for (const slug of PAGES) {
  await send('Runtime.evaluate', { expression: 'window.__gpaFresh = true' });
  await send('Page.navigate', { url: `${BASE}/${slug}/index.html` });
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    const res = await send('Runtime.evaluate', {
      expression: "window.__gpaFresh !== true && document.readyState === 'complete' && document.querySelectorAll('.grade-card').length > 0",
      returnByValue: true
    });
    if (res.result && res.result.value === true) { ready = true; break; }
    await sleep(200);
  }
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const de = document.documentElement;
      return {
        heading: document.querySelector('.grades-heading h2')?.textContent.trim() || '',
        count: document.querySelectorAll('.grade-card').length,
        more: !!document.querySelector('.grades-more:not([hidden])'),
        old: document.body.innerText.includes('Material Density Reference'),
        overflow: de.scrollWidth > de.clientWidth + 1,
        errors: window.__gpaConsole || []
      };
    })()`,
    returnByValue: true
  });
  const d = res.result && res.result.value;
  const pageFailures = [];
  if (!ready) pageFailures.push('not ready');
  if (!d) pageFailures.push('no result');
  else {
    if (d.heading !== 'Material Grades and Applications') pageFailures.push('heading');
    if (d.count !== 2) pageFailures.push('cards=' + d.count);
    if (!d.more) pageFailures.push('no show more');
    if (d.old) pageFailures.push('old section');
    if (d.overflow) pageFailures.push('overflow');
    if (d.errors.length) pageFailures.push('errors: ' + d.errors.join(' | '));
  }
  if (pageFailures.length) failures.push({ slug, pageFailures });
  console.log(JSON.stringify({ slug, ...(d || {}), pageFailures }));
}
ws.close();
proc.kill();
if (failures.length) process.exitCode = 1;
