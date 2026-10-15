(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const who = await p.evaluate(() => me()); out.who = who;
const arc = async (label) => { await p.tap('#nav [data-v=stats]', { timeout: 4000 }); await p.waitForTimeout(500); const ok = await p.evaluate(l => { const b = [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)); if (!b) return false; return true; }, label); if (!ok) return 'no item'; await p.evaluate(l => { [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)).click(); }, label); await p.waitForTimeout(900); };
const ord = () => p.evaluate(() => [...document.querySelectorAll('#cab > [data-sec]')].map(x => x.dataset.sec));
const up = async k => { const bx = await p.evaluate(k => { const b = document.querySelector('[data-arr64="up:' + k + '"]'); if (!b || b.disabled) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, k); if (!bx) return false; await p.touchscreen.tap(bx[0], bx[1]); await p.waitForTimeout(150); return true; };
S.prof = Object.assign({}, S.prof || {}); S.prof[who] = Object.assign({}, S.prof[who] || {}, { lay: ['STATS', 'MOVIES'] }); /* partial, like a save before Our Top 5 loaded */
await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); await arc('PROFILE'); await p.waitForTimeout(2500);
out.partial = await ord();
await p.evaluate(() => document.querySelector('#cab [data-arr64="toggle"]').click()); await p.waitForTimeout(400);
/* stale server reply: the save answers with the OLD order */
let n = 0; global.MOCKX = (fn, args) => { if (fn === 'saveProfile' && n++ === 0) { S.prof[args[0]] = Object.assign({}, args[1], { lay: ['STATS', 'MOVIES'] }); return Object.assign({}, args[1], { lay: ['STATS', 'MOVIES'] }); } };
out.m1 = []; for (let i = 0; i < 3; i++) { await up('QUOTES'); out.m1.push((await ord()).indexOf('QUOTES')); }
await p.waitForTimeout(1500); out.afterStale = await ord();
/* a poll brings old profiles back */
await p.evaluate(() => { profiles[me()] = Object.assign({}, profiles[me()], { lay: ['STATS', 'MOVIES'] }); renderStats(); }); await p.waitForTimeout(300); out.afterPoll = await ord();
out.m2 = []; for (let i = 0; i < 3; i++) { await up('YOUTUBE'); out.m2.push((await ord()).indexOf('YOUTUBE')); }
/* another profile edit (no lay) must not wipe it */
await p.evaluate(() => run('saveProfile', [me(), { tv: [], mv: [] }], () => {}, () => {})); await p.waitForTimeout(1500);
out.final = await ord(); out.server = S.prof[who].lay;
global.MOCKX = null; await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); await arc('PROFILE'); await p.waitForTimeout(2500);
out.reload = await ord(); out.persist = JSON.stringify(out.reload) === JSON.stringify(out.final);
console.log('ARR67 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
