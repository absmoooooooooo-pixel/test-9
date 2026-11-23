// CDP probe for the shared calculator Material Grades and Applications panel.
// Usage: node tools/grade-panel-check.mjs [url]
import { spawn } from 'node:child_process';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;
const URL = process.argv[2] || 'http://127.0.0.1:8099/frontend/calculators/plate/index.html';
const WIDTHS = [390, 1280];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--disable-extensions',
  '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\gp-cdp-profile-${Date.now()}`,
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
  source: `window.__gpConsole=[];window.addEventListener('error',e=>window.__gpConsole.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__gpConsole.push(String(e.reason)));`
});

const probe = `(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const root = document.querySelector('[data-calculator-grade-panel]');
  const heading = root.querySelector('.grades-heading h2');
  const list = root.querySelector('.grades-list');
  const more = root.querySelector('.grades-more');
  const moreText = root.querySelector('#calcGradesMoreText');
  const select = root.querySelector('#calcMaterialGrades');
  const info = root.querySelector('.grade-info');
  const db = window.MW_GRADE_DATABASE;
  const material = db.materials.find(m => m.key === select.value);
  const total = material.grades.length;
  const expectedInitial = window.matchMedia('(min-width: 901px)').matches ? 4 : 2;
  const names = () => Array.from(list.querySelectorAll('.grade-card')).map(c => c.getAttribute('data-grade'));

  const headingText = heading.textContent.trim();
  const densityRefGone = !document.body.innerText.includes('Material Density Reference');
  const initialCount = list.querySelectorAll('.grade-card').length;
  const initialLabel = moreText.textContent.trim();
  const listOverflow = getComputedStyle(list).overflowY;
  const listClipped = list.scrollHeight > list.clientHeight + 2;

  list.querySelector('.grade-card').click();
  await wait(30);
  const infoWorks = !info.hidden && /Grade Overview|Material Density|Chemical Composition/.test(info.textContent);

  more.click();
  await wait(50);
  const expandedCount = list.querySelectorAll('.grade-card').length;
  const expandedLabel = moreText.textContent.trim();
  const expandedAria = more.getAttribute('aria-expanded');
  const expandedClipped = list.scrollHeight > list.clientHeight + 2;
  more.click();
  await wait(50);
  const collapsedCount = list.querySelectorAll('.grade-card').length;

  const otherKey = select.value === 'carbon-steel' ? 'stainless-steel' : 'carbon-steel';
  select.value = otherKey;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await wait(50);
  const switchedCount = list.querySelectorAll('.grade-card').length;
  const other = db.materials.find(m => m.key === otherKey);
  const switchedNames = names();
  const switchedMatches = switchedNames.length === Math.min(expectedInitial, other.grades.length) &&
    switchedNames.every(n => other.grades.some(g => g.name === n));
  const noMixedGrades = switchedNames.every(n => !material.grades.some(g => g.name === n));
  more.click();
  await wait(50);
  const switchedExpanded = list.querySelectorAll('.grade-card').length;
  const switchedAllMatch = switchedExpanded === other.grades.length;

  let languageLabel = '';
  let languageHeading = '';
  if (window.MW_I18N && typeof window.MW_I18N.switchTo === 'function') {
    try {
      await window.MW_I18N.switchTo('hi');
      await wait(250);
      languageLabel = moreText.textContent.trim();
      languageHeading = heading.textContent.trim();
      await window.MW_I18N.switchTo('en');
      await wait(250);
    } catch (e) {
      languageLabel = 'ERROR:' + String(e);
    }
  }

  const de = document.documentElement;
  return {
    vw: window.innerWidth,
    heading: headingText,
    densityRefGone,
    total,
    expectedInitial,
    initialCount,
    initialLabel,
    infoWorks,
    expandedCount,
    expandedLabel,
    expandedAria,
    expandedClipped,
    collapsedCount,
    switchedCount,
    switchedMatches,
    noMixedGrades,
    switchedExpanded,
    switchedAllMatch,
    languageLabel,
    languageHeading,
    listOverflow,
    listClipped,
    hasHScroll: de.scrollWidth > de.clientWidth + 1,
    scrollW: de.scrollWidth,
    clientW: de.clientWidth,
    errors: window.__gpConsole || []
  };
})()`;

const results = [];
for (const width of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width, height: 900, deviceScaleFactor: 1, mobile: width < 900
  });
  await send('Runtime.evaluate', { expression: 'window.__gpFresh = true' });
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 80; i += 1) {
    const ready = await send('Runtime.evaluate', {
      expression: "window.__gpFresh !== true && document.readyState === 'complete' && document.querySelectorAll('.grade-card').length > 0 && !!window.MW_GRADE_DATABASE",
      returnByValue: true
    });
    if (ready.result && ready.result.value === true) break;
    await sleep(250);
  }
  const res = await send('Runtime.evaluate', { expression: probe, returnByValue: true, awaitPromise: true });
  const data = res.result && res.result.value;
  if (!data) {
    console.log(width, 'PROBE FAILED', JSON.stringify(res).slice(0, 2000));
    results.push({ width, failed: true });
    continue;
  }
  const failures = [];
  if (!data.densityRefGone) failures.push('old density reference still present');
  if (data.heading !== 'Material Grades and Applications') failures.push('heading mismatch');
  if (data.initialCount !== data.expectedInitial) failures.push('initial card count');
  if (!/Show More Grades/.test(data.initialLabel)) failures.push('initial button label');
  if (!data.infoWorks) failures.push('grade detail panel');
  if (data.expandedCount !== data.total) failures.push('expanded card count');
  if (!/Show Less/.test(data.expandedLabel)) failures.push('expanded button label');
  if (data.expandedAria !== 'true') failures.push('expanded aria');
  if (data.collapsedCount !== data.expectedInitial) failures.push('collapsed card count');
  if (data.switchedCount !== data.expectedInitial) failures.push('switched initial count');
  if (!data.switchedMatches) failures.push('switched grade names');
  if (!data.noMixedGrades) failures.push('mixed grades');
  if (!data.switchedAllMatch) failures.push('switched expanded count');
  if (!data.languageLabel || /ERROR/.test(data.languageLabel)) failures.push('language label');
  if (data.languageLabel === data.expandedLabel) failures.push('language did not change button');
  if (data.listOverflow !== 'visible') failures.push('list overflow not visible');
  if (data.listClipped || data.expandedClipped) failures.push('list clipped');
  if (data.hasHScroll) failures.push('horizontal scroll');
  if (data.errors.length) failures.push('page errors: ' + data.errors.join(' | '));
  results.push({ width, ...data, failures });
  console.log(JSON.stringify({ width, initial: data.initialCount, expanded: data.expandedCount, switched: data.switchedCount, language: data.languageLabel, failures }));
}
ws.close();
proc.kill();
if (results.some(r => r.failed || (r.failures && r.failures.length))) process.exitCode = 1;
