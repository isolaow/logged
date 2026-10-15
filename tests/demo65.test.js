const { webkit, devices } = require('/tmp/pw/node_modules/playwright-core');
(async () => { const b = await webkit.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  const hits = [], errs = []; c.on('request', r => { if (/script\.google|ntfy\.sh/.test(r.url())) hits.push(r.url()); });
  p.on('pageerror', e => errs.push(String(e.message)));
  await p.goto(process.env.URL + '?demo=1', { waitUntil: 'load', timeout: 30000 }); await p.waitForTimeout(4000);
  const o = {}; o.tag = await p.evaluate(() => { const t = document.getElementById('demo65t'); return t && t.innerText.replace(/\n/g, ' '); });
  o.setup = await p.evaluate(() => !!document.querySelector('#setup.open, .setup:not([hidden])'));
  o.who = await p.evaluate(() => me()); o.rows = await p.evaluate(() => rows.length); o.realLS = await p.evaluate(() => window.localStorage.getItem('lg_token'));
  await p.screenshot({ path: '/workspace/logged-site/shots/r65_demo_sam.png' });
  await p.tap('#demo65t [data-iam61="lewy"]'); await p.waitForTimeout(1500); o.who2 = await p.evaluate(() => me()); o.tag2 = await p.evaluate(() => document.querySelector('#demo65t .on').innerText);
  /* a write goes to memory only */
  o.save = await p.evaluate(() => new Promise(r => run('saveProfile', ['lewy', Object.assign({}, profiles.lewy || {}, { bg: 'demo-bg' })], x => r('ok'), e => r('fail ' + e))));
  await p.screenshot({ path: '/workspace/logged-site/shots/r65_demo_lewy.png' });
  /* real storage untouched: open a non-demo page in same context and check */
  const p2 = await c.newPage(); await p2.goto(process.env.URL.replace('index.html', 'manifest.json')); o.realStoreAfter = await p2.evaluate(() => [localStorage.getItem('lg_token'), localStorage.length]);
  console.log('DEMO65 ' + JSON.stringify(o)); console.log('serverHits', JSON.stringify(hits)); console.log('errors', JSON.stringify(errs)); await b.close(); })();
