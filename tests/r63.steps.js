(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const who = await p.evaluate(() => me());
/* hearts: open the arc for a title, tap 2 then 3; the reply for 2 is slow and arrives last */
const k = await p.evaluate(() => { const r = rows.filter(x => !isYT(x))[1]; window.H63 = rKey(r); intSet(H63, 'y', { t: r.title, h: 1 }); return H63; });
await p.waitForTimeout(800);
S.slowInt = [1500, 0];
const tapH = async (n) => { await p.evaluate(k => heartPick(k, 'x'), k); await p.waitForTimeout(250); const t0 = Date.now(); await p.tap('#arch.archh [data-archi="' + (n - 1) + '"]', { timeout: 3000 }).catch(e => out['tapErr' + n] = e.message.slice(0, 80)); return p.evaluate(k => heartsOf(k), k); };
out.after2 = await tapH(2); await p.waitForTimeout(450); out.after3 = await tapH(3);
await p.waitForTimeout(2600); out.settled = await p.evaluate(k => [heartsOf(k), intPending63()], k); out.server = (S.int[who][k] || {}).h;
/* instant: state changes on pointerdown, before click */
out.instant = await p.evaluate(async (k) => { heartPick(k, 'x'); await new Promise(r => setTimeout(r, 250)); const b = document.querySelector('#arch.archh [data-archi="0"]'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); return heartsOf(k); }, k);
await p.waitForTimeout(800);
/* trailer from details → Logged player; BACK → same details, same scroll */
await p.evaluate(() => { const r = rows.filter(x => !isYT(x) && x.type === 'Movie')[0]; window.T63 = r.row; openDetail(r); });
await p.waitForTimeout(800); await p.evaluate(() => { const D = document.getElementById('detail'); D.scrollTop = 220; const sh = D.querySelector('.sh'); if (sh) sh.scrollTop = 220; });
await p.evaluate(() => { const a = document.querySelector('#detail a[data-trl]'); a && a.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200);
const sc0 = await p.evaluate(() => { const D = document.getElementById('detail'), sh = D.querySelector('.sh'); return Math.max(D.scrollTop, sh ? sh.scrollTop : 0); });
await p.evaluate(() => { window.__wo = 0; window.open = () => { window.__wo++; return null; }; });

await p.tap('#detail a[data-trl]', { timeout: 4000 }).catch(e => out.trlErr = e.message.slice(0, 100)); await p.waitForTimeout(1500);
out.player = await p.evaluate(() => ({ open: document.getElementById('ytp').classList.contains('open'), id: YTX.id, ext: window.__wo, trl: document.getElementById('trl').classList.contains('open'), href: location.pathname }));
await p.tap('#ytp .yback', { timeout: 3000 }).catch(e => out.backErr = e.message.slice(0, 100)); await p.waitForTimeout(700);
out.back = await p.evaluate((sc0) => { const D = document.getElementById('detail'), sh = D.querySelector('.sh'); return { player: document.getElementById('ytp').classList.contains('open'), detail: D.classList.contains('open'), row: editing && editing.row === T63, scroll: Math.max(D.scrollTop, sh ? sh.scrollTop : 0), want: sc0, view: view }; }, sc0);
console.log('R63 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
