(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); const n = Date.now(); localStorage.lg_ythist = JSON.stringify({ a: { id: 'aqz-KE-bpKQ', t: 'F1 Monaco Grand Prix highlights', ch: 'FORMULA 1', at: n }, b: { id: 'R6MlUcmOul8', t: 'Minecraft hardcore day 100', ch: 'Grian', at: n - 1000 }, c: { id: 'eRsGyueVLvQ', t: 'Formula 1 onboard lap', ch: 'FORMULA 1', at: n - 2000 } }); });
await p.evaluate(() => navTap('home')); await p.waitForTimeout(400); await p.tap('#ytTile'); await p.waitForTimeout(1500);
const chips = () => p.evaluate(() => [...document.querySelectorAll('#ytpage .ytrib .chip')].map(c => c.innerText.trim()));
out.chips = await chips(); out.bars = await p.evaluate(() => [...document.querySelectorAll('#ytpage .ytrib,#ytpage .ytchips')].filter(e => e.offsetParent).length);
await p.screenshot({ path: '/workspace/logged-site/shots/r50_yt_chips.png', clip: { x: 0, y: 0, width: 393, height: 330 } });
await p.tap('#ytpage .ytrib .p59'); await p.waitForTimeout(1200); out.afterTap = await p.evaluate(() => ({ q: (document.querySelector('#ytHomeQ [name=q]') || document.querySelector('#ytHomeQ input') || {}).value, q59: YH.q59, calls: (window.__ytq || '') }));
/* history changes → chips refresh */
await p.evaluate(() => { const n = Date.now(); localStorage.lg_ythist = JSON.stringify({ z: { id: 'aqz-KE-bpKQ', t: 'BLACKPINK live K-pop stage', ch: 'BLACKPINK', at: n } }); YH.res = null; YH.q59 = ''; R57.sec = ''; ytDraw(); }); await p.waitForTimeout(500); out.refreshed = await chips();
console.log('CHIPS ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
