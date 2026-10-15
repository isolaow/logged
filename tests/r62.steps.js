(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const who = await p.evaluate(() => me()); out.who = who;
const arc = async (label) => { await p.tap('#nav [data-v=stats]', { timeout: 4000 }); await p.waitForTimeout(500); const ok = await p.evaluate(l => { const b = [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)); if (!b) return false; return true; }, label); if (!ok) return 'no item'; await p.evaluate(l => { [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)).click(); }, label); await p.waitForTimeout(900); };
/* 4 auto soundtracks on the shelf, nothing saved */
await p.evaluate(() => { const R = rows.filter(x => !isYT(x)); [['Baby Blue', 'Badfinger'], ['Bones', 'Imagine Dragons'], ['Hold On', 'Chord Overstreet'], ['Heroes', 'David Bowie']].forEach((s, i) => { R[i].themeL = { [me()]: [{ n: s[0], a: s[1], sc: 'show' }] }; }); });
await arc('PROFILE'); await p.waitForTimeout(500);
out.autoShelf = await p.evaluate(() => document.querySelectorAll('#cab .cbsnd li').length);
const counts = {};
for (const k of ['snd', 'mv', 'tv', 'yt']) { const sel = k === 'snd' ? '#cab [data-sndedit]' : '#cab [data-fav="' + k + '"]'; await p.tap(sel, { timeout: 4000 }).catch(e => counts[k + 'Err'] = e.message.slice(0, 80)); await p.waitForTimeout(300);
  const q = { snd: 'baby', mv: 'oppen', tv: 'oppen', yt: 'rick' }[k]; await p.fill('#ed61q', q, { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(900);
  counts[k] = await p.evaluate(() => ({ cur: ED61cur(), full: /Full/.test(document.querySelector('#ed61 .e61r').innerText), adds: document.querySelectorAll('#ed61 .e61r [data-e61^=add]').length }));
  if (counts[k].adds) { await p.tap('#ed61 .e61r [data-e61^=add]').catch(() => {}); await p.waitForTimeout(500); counts[k].after = await p.evaluate(() => ({ cur: ED61cur(), full: /Full/.test(document.querySelector('#ed61 .e61r').innerText) })); }
  await p.tap('#ed61 [data-e61x]').catch(() => {}); await p.waitForTimeout(400); }
out.counts = counts;
/* mini player */
await p.evaluate(() => { const r = rows.filter(x => !isYT(x))[0]; r.themeL = { [me()]: [{ n: 'Baby Blue', a: 'Badfinger', pv: 'https://p.scdn.co/mp3-preview/bb', art: 'https://i.scdn.co/image/ab67616d00001e02255e131abc1410833be95673', sc: 'show' }, { n: 'Bones', a: 'Imagine Dragons', pv: 'https://p.scdn.co/mp3-preview/bo', sc: 'show' }] }; openDetail(r); window.PL = []; HTMLMediaElement.prototype.play = function () { PL.push({ src: this.src, ev: window.event && window.event.type }); return Promise.resolve(); }; });
await p.waitForTimeout(1200);
await p.tap('[data-tlp="' + who + ':0"]', { timeout: 4000 }).catch(e => out.playErr = e.message.slice(0, 100)); await p.waitForTimeout(500);
await p.waitForTimeout(1200); out.mini67 = await p.evaluate(() => { const a = document.querySelector('#thm .m62a'); if (!a) return null; const i = a.querySelector('img'), s = a.querySelector('.sa61'); return { cls: s && s.className, src: i && i.src.slice(0, 70), filt: i && getComputedStyle(i).filter, ir: i && getComputedStyle(i).imageRendering, op: i && getComputedStyle(i).opacity, mode: OXS.mode }; });
out.inTap = await p.evaluate(() => PL.filter(x => x.src === OXA.src).map(x => x.ev));
await p.evaluate(() => { try { document.querySelector('#detail .x, [data-close=detail]')?.click(); } catch (e) {} });
out.mini = await p.evaluate(() => { const x = document.getElementById('thm'), n = document.getElementById('nav'); if (!x) return 'none'; const r = x.getBoundingClientRect(), nr = n.getBoundingClientRect();
  return { v62: x.classList.contains('mp62'), h: Math.round(r.height), aboveNav: r.bottom <= nr.top + 1, navVisible: nr.height > 0, btns: [...x.querySelectorAll('.m62c button')].filter(b => b.offsetParent).map(b => b.dataset.spc + ':' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)), title: x.querySelector('.m62m b')?.innerText, artist: x.querySelector('.m62m small')?.innerText, cover: !!x.querySelector('.m62a .sa61'), prog: !!x.querySelector('.m62p i') }; });
await p.evaluate(() => { Object.defineProperty(OXA, 'duration', { configurable: true, get: () => 30 }); Object.defineProperty(OXA, 'currentTime', { configurable: true, get: () => 15, set: () => {} }); OXA.dispatchEvent(new Event('timeupdate')); });
out.progress = await p.evaluate(() => document.querySelector('#thm .m62p i')?.style.width);
await p.screenshot({ path: '/workspace/logged-site/shots/r54_mini_' + who + '.png' });
await p.tap('#thm [data-spc=next]', { timeout: 3000 }).catch(e => out.nextErr = e.message.slice(0, 80)); await p.waitForTimeout(400); out.afterNext = await p.evaluate(() => [OXA.src.slice(-2), document.querySelector('#thm .m62m b')?.innerText]);
await p.tap('#thm [data-spc=stop]', { timeout: 3000 }).catch(e => out.stopErr = e.message.slice(0, 80)); await p.waitForTimeout(300); out.closed = await p.evaluate(() => !document.getElementById('thm'));
console.log('R62 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
