// Headless verification of the Portuguese Plate Dimensions labels.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const URL = 'http://127.0.0.1:8000/frontend/calculators/plate/index.html';
const OUT = 'C:\\Users\\sansk\\AppData\\Local\\Temp\\opencode\\plate-pt-verify';
const log = (m) => console.error('[verify]', m);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(OUT, { recursive: true });

const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--disable-extensions',
  '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${OUT}\\cdp-profile-${Date.now()}`,
  'about:blank'
], { stdio: 'ignore' });
log('chrome launched');

try {
  let ws;
  let debuggerUrl;
  for (let i = 0; i < 80 && !debuggerUrl; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) debuggerUrl = page.webSocketDebuggerUrl;
    } catch { /* not ready */ }
    if (!debuggerUrl) await sleep(250);
  }
  if (!debuggerUrl) throw new Error('Chrome CDP did not start');
  ws = new WebSocket(debuggerUrl);
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
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout: ' + label)), ms))
  ]);
  const send = (method, params = {}) => {
    const id = ++seq;
    return withTimeout(new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    }), 15000, method);
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
    width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false
  });
  await send('Page.navigate', { url: URL });
  log('navigated');
  let ready = false;
  for (let i = 0; i < 120; i += 1) {
    ready = await evaluate("return document.readyState !== 'loading' && !!window.MW_I18N && !!window.MW_I18N_DICTIONARIES;");
    if (ready) { log('page ready after ' + (i * 0.5).toFixed(1) + 's'); break; }
    await sleep(500);
  }
  if (!ready) log('WARNING: page never became ready');
  await sleep(1000);
  log('diagnostics: ' + JSON.stringify(await evaluate(`
    return {
      href: location.href, ready: document.readyState, title: document.title,
      scripts: document.scripts.length,
      hasI18n: !!window.MW_I18N, hasDicts: !!window.MW_I18N_DICTIONARIES,
      hasJQuery: !!window.jQuery,
      bodyText: document.body ? document.body.textContent.trim().slice(0, 120) : null
    };
  `)));

  const read = () => evaluate(`
    const labels = ['length','width','thickness'].map((id) => {
      const el = document.querySelector('label[for="' + id + '"]');
      const cs = el ? getComputedStyle(el) : null;
      return { id, text: el && el.textContent.trim(), fontSize: cs && cs.fontSize, fontWeight: cs && cs.fontWeight, color: cs && cs.color };
    });
    const widthInput = document.getElementById('width');
    const paragraph = 'Sim, ambos os nomes descrevem a mesma seção em forma de L';
    const section = document.querySelector('.input-grid');
    const exampleLabels = Array.from(document.querySelectorAll('.example-value-label'))
      .map((e) => e.textContent.trim()).filter((t) => /Width|Largura/.test(t));
    return {
      language: window.MW_I18N.language,
      labels,
      placeholder: widthInput && widthInput.placeholder,
      inputExists: !!widthInput,
      exampleLabels,
      paragraphInSection: section ? section.textContent.includes(paragraph) : null,
      paragraphInBody: document.body.textContent.includes(paragraph),
      bodyHasParagraphText: document.body.textContent.includes('fabricantes dizem')
    };
  `);

  const initial = await read();
  log('english snapshot taken');
  await evaluate("await window.MW_I18N.switchTo('pt'); return true;", true);
  const portuguese = await read();
  log('portuguese snapshot taken');
  await evaluate("await window.MW_I18N.switchTo('en'); await window.MW_I18N.switchTo('pt'); return true;", true);
  const roundTrip = await read();
  log('round-trip snapshot taken');

  const rect = await evaluate(`
    const r = document.querySelector('.input-grid').getBoundingClientRect();
    return { x: Math.max(0, Math.floor(r.left - 24)), y: Math.max(0, Math.floor(r.top - 70)),
             width: Math.ceil(r.width + 48), height: Math.ceil(r.height + 150), scale: 1 };
  `);
  const shot = await send('Page.captureScreenshot', {
    format: 'png', clip: rect, captureBeyondViewport: false
  });
  await writeFile(`${OUT}\\plate-dimensions-pt.png`, Buffer.from(shot.data, 'base64'));
  await writeFile(`${OUT}\\result.json`, JSON.stringify({ initial, portuguese, roundTrip }, null, 2));
  log('screenshot + result written');

  console.log(JSON.stringify({ initial, portuguese, roundTrip }, null, 2));
  const p = roundTrip;
  const failures = [];
  if (p.labels[1].text !== 'Largura (W)') failures.push('Width label is not Largura (W)');
  if (p.labels[0].text !== 'Comprimento (L)') failures.push('Length label changed');
  if (p.labels[2].text !== 'Espessura (T)') failures.push('Thickness label changed');
  if (p.placeholder !== 'Insira a largura') failures.push('Placeholder changed');
  if (!p.inputExists) failures.push('Width input missing');
  if (p.paragraphInSection || p.bodyHasParagraphText) failures.push('Long paragraph still visible');
  if (new Set(p.labels.map((l) => `${l.fontSize}|${l.fontWeight}|${l.color}`)).size !== 1) {
    failures.push('Label styling differs');
  }
  console.log(failures.length ? 'FAIL: ' + failures.join('; ') : 'PASS: all Portuguese label checks passed');
  if (failures.length) process.exitCode = 1;
  if (ws) ws.close();
} finally {
  proc.kill();
}
