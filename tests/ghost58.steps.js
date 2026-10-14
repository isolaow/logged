(async () => { await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); navTap('navYT'); }); await p.waitForSelector('#ytBody [data-ytv][data-ytid]');
const cards = await p.evaluate(() => [...document.querySelectorAll('#ytBody [data-ytv][data-ytid]')].slice(0, 2).map((c, i) => { c.id = 'gc' + i; return c.dataset.ytid; }));
const box = await p.evaluate(() => { const r = document.getElementById('gc0').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await p.touchscreen.tap(box.x, box.y); await p.waitForTimeout(150);
await p.evaluate(() => { try { ytDraw(); } catch (e) {} const a = document.querySelector('#ytBody [data-ytv][data-ytid]:not(#gc0)'); }); // re-render shifts list
await p.evaluate(() => { const c = [...document.querySelectorAll('#ytBody [data-ytv][data-ytid]')].find(x => x.dataset.ytid !== document.getElementById('ytp').dataset.v); const r = c.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 5, r.top + 5); (el || c).click(); }); // delayed ghost click on a different card
await p.waitForTimeout(800); const r = await p.evaluate(want => ({ src: ((document.querySelector('#ytp .yvb iframe') || document.querySelector('#trlV iframe') || {}).src || '').match(/[?&]v=([\w-]+)/)?.[1], want, log: YTO.log.map(x => x.k + ':' + x.id + (x.ok ? '' : ' X')) }), cards[0]);
console.log((r.src === r.want ? 'PASS' : 'FAIL') + ' ghost tap ignored ' + JSON.stringify(r)); console.log('errors', JSON.stringify(errs)); })()
