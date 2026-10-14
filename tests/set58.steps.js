(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const arc = () => p.evaluate(() => [...document.querySelectorAll('#arch [data-archi]')].map(b => ({ t: b.innerText.trim().replace(/\s+/g, ' '), x: Math.round(b.getBoundingClientRect().left), m: b.classList.contains('main58') })).sort((a, b) => a.x - b.x).map(o => o.t + (o.m ? '*' : '')));
await p.evaluate(() => navTap('all')); await p.waitForTimeout(400);
await p.tap('#nav [data-v=home]'); await p.waitForTimeout(400); out.exArc = await arc(); await p.screenshot({ path: '/workspace/logged-site/shots/r49_arc_explore.png' });
await p.tap('#nav [data-v=home]'); await p.waitForTimeout(500); out.exAgain = await p.evaluate(() => ({ view, arc: !!document.getElementById('arch') }));
await p.tap('#nav [data-v=stats]'); await p.waitForTimeout(400); out.campArc = await arc(); await p.screenshot({ path: '/workspace/logged-site/shots/r49_arc_camp.png' });
await p.tap('#nav [data-v=home]'); await p.waitForTimeout(400); out.oneAtATime = await arc();
await p.evaluate(() => archClose()); await p.tap('#nav [data-v=stats]'); await p.waitForTimeout(400);
const idx = await p.evaluate(() => [...document.querySelectorAll('#arch [data-archi]')].findIndex(b => /SETTINGS/.test(b.innerText))); await p.tap('#arch [data-archi="' + idx + '"]'); await p.waitForSelector('#set58.open');
out.groups = await p.evaluate(() => [...document.querySelectorAll('#set58 .sg58 h4')].map(h => h.innerText)); await p.screenshot({ path: '/workspace/logged-site/shots/r49_settings_v2.png' });
const before = S.calls.length; await p.tap('#set58 [data-set="rm"] + i'); await p.waitForTimeout(400); out.rm = await p.evaluate(() => document.body.classList.contains('rm58'));
await p.selectOption('#set58 [data-setsel="fs"]', '110'); await p.waitForTimeout(300); out.zoom = await p.evaluate(() => document.querySelector('body>main').style.zoom);
await p.tap('#set58 [data-set="qOn"] + i'); await p.waitForTimeout(400); out.quietSelects = await p.evaluate(() => !!document.querySelector('#set58 [data-setsel="qFrom"]'));
out.saves = S.calls.slice(before).filter(c => c === 'setSettings').length; out.persist = await p.evaluate(() => JSON.parse(localStorage['lg_set_' + me()]));
await p.evaluate(() => { document.getElementById('set58').scrollTop = 1e6; }); await p.waitForTimeout(200); await p.screenshot({ path: '/workspace/logged-site/shots/r49_settings_bottom.png' });
out.overflow = await p.evaluate(() => { const x = document.getElementById('set58'); return x.scrollWidth <= x.clientWidth; });
await p.tap('#set58 [data-seta="close"]'); await p.waitForTimeout(300); out.closed = await p.evaluate(() => !document.getElementById('set58').classList.contains('open'));
await p.tap('#set58 [data-set]').catch(() => {}); console.log(JSON.stringify(out, null, 1)); console.log('errors', JSON.stringify(errs)); })()
