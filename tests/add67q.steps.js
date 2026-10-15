(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); });
await p.tap('#q').catch(e => out.e1 = e.message.slice(0, 80)); await p.waitForTimeout(800);
out.st = await p.evaluate(() => ({ act: document.activeElement && (document.activeElement.id || document.activeElement.className), im: document.getElementById('q').getAttribute('inputmode'), kb: document.getElementById('kb').classList.contains('on'), open: [...document.querySelectorAll('.open')].map(x => x.id || x.className).slice(0, 6) }));
await p.screenshot({ path: '/workspace/logged-site/shots/r67_q.png' });
console.log('Q67 ' + JSON.stringify(out)); })()
