const { webkit, devices } = require('/tmp/pw/node_modules/playwright-core');
(async () => { const b = await webkit.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e.message))); global.p = p;
  await p.goto((process.env.URL || 'http://localhost:8765/app/index.html') + '?demo=1' + (process.env.Q || ''), { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const shot = n => p.screenshot({ path: '/tmp/pt/' + n + '.png' });
  const ev = f => p.evaluate(f);
  try { await eval('(async () => {' + require('fs').readFileSync(process.env.S, 'utf8') + '})()'); } catch (e) { console.log('ERR', e.message.slice(0, 300)); }
  console.log('errors', JSON.stringify(errs)); await b.close(); })();
