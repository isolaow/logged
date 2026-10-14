(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); });
const who = await p.evaluate(() => me());
await p.evaluate(() => navTap('stats')); await p.waitForTimeout(800);
out.cab = await p.evaluate(() => { const c = document.getElementById('cab'); return { cbdv: (c.querySelector('.cbdv') || {}).innerText, who: c.dataset.who, h: c.querySelector('h3').innerText, order: [...c.querySelectorAll('h4')].map(h => h.innerText.replace(/\s+/g, ' ')), top: [...c.querySelectorAll('.cbt b')].map(b => b.innerText), stats: [...c.querySelectorAll('.cbst small')].map(s => s.innerText) }; });
out.dupStats = await p.evaluate(() => { const L = [...document.querySelectorAll('#v-stats h3,#v-stats h4,#v-stats .cbst small')].map(e => e.innerText.trim().toUpperCase()).filter(Boolean); return L.filter((t, i) => L.indexOf(t) !== i); });
await p.screenshot({ path: '/workspace/logged-site/shots/r49_camp_' + who + '.png' });
await p.tap('#cab [data-ot="edit"]'); await p.waitForTimeout(300); await p.tap('#cab [data-ot="rm:0"]').catch(() => {}); await p.waitForTimeout(300); out.ourTopAfterRm = await p.evaluate(() => (OT58.o && OT58.o.list) || 'auto'); 
// hearts picker above overlays
const heartTest = async (label, openFn) => { await p.evaluate(openFn); await p.waitForTimeout(500); await p.evaluate(() => { R56.noHeart = 0; intSet('r:Dune', '', {}); }); await p.waitForTimeout(300);
  await p.evaluate(() => intSet('r:Dune', 'y', { t: 'Dune' })); await p.waitForSelector('#arch.archh.open [data-archi]', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
  const top = await p.evaluate(() => { const b = document.querySelector('#arch.archh [data-archi="1"]'); if (!b) return 'no-arc'; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return (e === b || b.contains(e)) ? 'topmost' : 'covered by ' + (e && (e.id || e.className)); });
  if (top === 'topmost') { await p.tap('#arch.archh [data-archi="1"]'); await p.waitForTimeout(400); } const h = await p.evaluate(() => heartsOf('r:Dune'));
  if (label === 'trailer') await p.screenshot({ path: '/workspace/logged-site/shots/r49_hearts_over_trailer.png' }); out['hearts_' + label] = top + ' saved=' + h; await p.evaluate(() => { try { archClose(); trlClose && trlClose(); ytnClose && ytnClose(); closeDetail && closeDetail(); } catch (e) {} }); await p.waitForTimeout(300); };
await heartTest('plain', () => navTap('home'));
await heartTest('trailer', () => trlPlay('dQw4w9WgXcQ', 'Dune trailer'));
await heartTest('ytplayer', () => { YTO.tap = Date.now(); ytnOpen('aqz-KE-bpKQ', 'x'); });
await heartTest('details', () => openDetail(rows.find(r => r.title === 'Dune')));
await p.evaluate(() => navTap('navInt')); await p.waitForTimeout(800);
out.intTab = await p.evaluate(() => ({ heartsOnPosters: document.querySelectorAll('#v-int .xhrt, .xhrt').length, sortChip: !!document.querySelector('[data-xt="sort:hearts"]'), filterChips: document.querySelectorAll('[data-xt^="h:"]').length }));
await p.screenshot({ path: '/workspace/logged-site/shots/r49_int_hearts_' + who + '.png' });
console.log(who.toUpperCase(), JSON.stringify(out, null, 1)); console.log('errors', JSON.stringify(errs)); })()
