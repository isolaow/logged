(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const who = await p.evaluate(() => me()), o = who === 'sam' ? 'lewy' : 'sam';
const open = () => p.evaluate(() => { IP.tab = 'new'; IP.picked = 1; IP.fresh = [{ id: 990063, title: 'Demo Swipe Film', year: 2024, poster: '', tv: false, overview: 'x', vote: 7 }]; renderInterest(); document.getElementById('ipage').classList.add('open'); });
await open(); await p.waitForTimeout(400);
const c = await p.evaluate(() => { const c = ipDeck()[0]; return c ? { k: c.k, t: c.t } : null; }); out.card = c && c.t;
if (!c) { console.log('SW63 ' + JSON.stringify(out)); return; }
/* other person: interested ♥♥ */
await p.evaluate(([o, k]) => { INT[o] = INT[o] || {}; INT[o][k] = { v: 'y', h: 2, at: Date.now() }; }, [o, c.k]); await open(); await p.waitForTimeout(300);
out.heart = await p.evaluate(() => { const b = document.querySelector('#ipc .ob63'); return b ? [b.innerText.replace(/\n/g, ' '), b.className, getComputedStyle(b).backgroundColor] : null; });
await p.screenshot({ path: '/workspace/logged-site/shots/r55_swipe_badge_' + who + '.png' });
/* other person: not for me (hidden only for them; still in MY deck, with a badge) */
await p.evaluate(([o, k, t]) => { delete INT[o][k]; NFM[o] = (NFM[o] || []).concat([t]); }, [o, c.k, c.t]); await open(); await p.waitForTimeout(300);
out.stillInMyDeck = await p.evaluate(t => ipDeck().some(x => x.t === t), c.t);
out.nfm = await p.evaluate(() => { const b = document.querySelector('#ipc .ob63'); return b ? b.innerText.replace(/\n/g, ' ') : null; });
/* nothing from the other → no badge */
await p.evaluate(([o, t]) => { NFM[o] = (NFM[o] || []).filter(x => x !== t); }, [o, c.t]); await open(); await p.waitForTimeout(300);
out.none = await p.evaluate(() => !document.querySelector('#ipc .ob63'));
console.log('SW63 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
