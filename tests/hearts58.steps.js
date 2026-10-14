(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); });
const arcUp = async () => { await p.waitForTimeout(600); return p.evaluate(() => { const b = document.querySelector('#arch.archh [data-archi="1"]'); if (!b) return 'no arc'; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return (e === b || b.contains(e)) ? 'topmost' : 'covered'; }); };
const pick = () => p.tap('#arch.archh [data-archi="1"]').catch(() => {});
/* swipe deck: real ♥ button */
await p.evaluate(() => { navTap('navInt'); }); await p.waitForTimeout(600);
const deck = await p.evaluate(() => { IP.tab = 'new'; IP.fresh = [{ id: 777, title: 'Deck Test Film', tv: false, year: '2024', poster: '' }]; try { if (typeof ipOpen === 'function') ipOpen(); else document.querySelector('[data-intpage]') && document.querySelector('[data-intpage]').click(); } catch (e) {} renderInterest && renderInterest(); const c = ipDeck()[0]; return c ? c.k : JSON.stringify(rows.slice(-1).map(r=>[untouched(r), intGet(rKey(r))])); });
if (deck) { await p.evaluate(() => { const b = document.querySelector('#ipage.open .ipy'); if (b) b.click(); else ipDecide('y'); }); out.deck = await arcUp(); await pick(); await p.waitForTimeout(300); out.deckSaved = await p.evaluate(k => heartsOf(k), deck); } else out.deck = 'no deck cards';
await p.evaluate(() => { try { archClose(); document.querySelectorAll('.open').forEach(x => x.id !== 'nav' && x.classList.remove('open')); } catch (e) {} });
/* Mood Pick "♥ ADD TO INTERESTED" */
const t = 'Mood Test Film';
await p.evaluate(t => { MPD.tmp = { __tmdb: { title: t, id: 9, tv: false } }; const b = document.createElement('button'); b.id = 'mpdT'; b.dataset.mpdadd = '1'; b.textContent = 'ADD'; b.style.cssText = 'position:fixed;top:300px;left:100px;z-index:99999;width:120px;height:50px'; document.body.appendChild(b); MPH58 = null; }, t);
await p.tap('#mpdT'); 
await p.evaluate(t => { document.getElementById('mpdT').remove(); const tmp = { row: 1e9, title: t, type: 'Movie', samWatched: 'Not yet', lewyWatched: 'Not yet' }; rows.push(tmp); finishAdd(tmp, t, { row: 999 }); }, t);
await p.waitForTimeout(800); out.moodInt = await p.evaluate(t => JSON.stringify(intGet('r:' + t)), t); out.mood = await arcUp(); await pick(); await p.waitForTimeout(300); out.moodSaved = await p.evaluate(t => { const r = rows.filter(x => x.title === t)[0]; return r ? heartsOf(rKey(r)) : 'norow'; }, t);
console.log('HEARTS ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
