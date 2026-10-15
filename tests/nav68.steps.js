(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const who = await p.evaluate(() => me()); out.who = who;
const arc = async (label) => { await p.tap('#nav [data-v=stats]', { timeout: 4000 }); await p.waitForTimeout(500); const ok = await p.evaluate(l => { const b = [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)); if (!b) return false; return true; }, label); if (!ok) return 'no item'; await p.evaluate(l => { [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)).click(); }, label); await p.waitForTimeout(900); };
const song = (n, a) => JSON.stringify({ n, a, sp: 'sp' + n, art: 'https://i.scdn.co/image/ab67616d00001e02255e131abc1410833be95673', pv: 'https://p.scdn.co/mp3-preview/' + n.toLowerCase().replace(/\W/g, '') });
S.prof = Object.assign({}, S.prof || {}); S.prof.sam = Object.assign({}, S.prof.sam || {}, { ps: song('Baby Blue', 'Badfinger') }); S.prof.lewy = Object.assign({}, S.prof.lewy || {}, { ps: song('Bones', 'Imagine Dragons') });
await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); await arc('PROFILE'); await p.waitForTimeout(1200);
const st = () => p.evaluate(() => ({ mode: OXS.mode, paused: OXA.paused }));
out.onProfile = await st();
await p.evaluate(() => campPage59('badges')); await p.waitForTimeout(400); out.badges = await st();
await p.evaluate(() => campPage59('profile')); await p.waitForTimeout(800); out.back = await st();
await p.tap('#nav [data-v=stats]').catch(() => {}); await p.waitForTimeout(400); out.arc = await st(); await p.evaluate(() => archClose()); await p.waitForTimeout(600); out.arcClosed = await st();
await p.evaluate(() => campPage59('stats')); await p.waitForTimeout(400); out.stats = await st(); await p.evaluate(() => campPage59('profile')); await p.waitForTimeout(800);
await p.evaluate(() => show('home')); await p.waitForTimeout(400); out.home = await st(); await p.evaluate(() => campPage59('profile')); await p.waitForTimeout(800); out.back2 = await st();
const mb = await p.evaluate(() => { const b = document.querySelector('[data-ps64m]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); await p.touchscreen.tap(mb[0], mb[1]); await p.waitForTimeout(200); out.muted = await st(); out.muteKey = await p.evaluate(() => Object.keys(localStorage).filter(k => /psmute/.test(k)).map(k => k + '=' + localStorage.getItem(k)));
await p.evaluate(() => { campPage59('badges'); }); await p.waitForTimeout(300); await p.evaluate(() => campPage59('profile')); await p.waitForTimeout(800); out.stillMuted = await st();
console.log('NAV68 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
