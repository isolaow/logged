(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); await p.waitForTimeout(2200);
out.prompt = await p.evaluate(() => !!document.getElementById('who61')); out.before = await p.evaluate(() => me());
await p.tap('#who61 [data-iam61="lewy"]', { timeout: 4000 }).catch(e => out.e1 = e.message.slice(0, 80)); await p.waitForTimeout(400);
out.after = await p.evaluate(() => [me(), localStorage.lg_who, localStorage.lg_who62, !!document.getElementById('who61')]);
await p.reload(); await p.waitForTimeout(2500); out.promptAgain = await p.evaluate(() => !!document.getElementById('who61'));
/* Settings > Profile picker */
await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); setOpen58(); }); await p.waitForTimeout(500);
out.picker = await p.evaluate(() => [...document.querySelectorAll('#set58 .who62 .ui-btn')].map(b => b.innerText + (b.classList.contains('on') ? '*' : '')));
await p.tap('#set58 .who62 [data-iam61="sam"]', { timeout: 4000 }).catch(e => out.e2 = e.message.slice(0, 80)); await p.waitForTimeout(400);
out.switched = await p.evaluate(() => [me(), [...document.querySelectorAll('#set58 .who62 .ui-btn.on')].map(b => b.innerText)]);
await p.screenshot({ path: '/workspace/logged-site/shots/r54_settings_who.png' });
console.log('WHO62 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
