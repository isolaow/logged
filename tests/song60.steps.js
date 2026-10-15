(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove();
  window.PL = []; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { PL.push({ src: this.currentSrc || this.src, inTap: !!window.__inTap, ev: window.event && window.event.type, el: this === OXA }); return Promise.resolve(); };
  window.addEventListener('click', e => { if (e.isTrusted) { window.__inTap = 1; setTimeout(() => window.__inTap = 0, 0); } }, true); });
/* a title with three soundtrack picks: a Spotify MP3 (Baby Blue), an iTunes m4a, and one with no URL */
await p.evaluate(() => { const r = rows.filter(x => !isYT(x))[0]; window.R60 = r; r.themeL = { sam: [{ n: 'Baby Blue', a: 'Badfinger', pv: 'https://p.scdn.co/mp3-preview/babyblue', sc: 'show' }, { n: 'Bones', a: 'Imagine Dragons', pv: 'https://audio-ssl.itunes.apple.com/x/bones.m4a', sc: 'show' }, { n: 'Hold On', a: 'Chord Overstreet', sc: 'show' }] }; openDetail(r); });
await p.waitForTimeout(1500); await p.evaluate(() => { try { oxPaint(); } catch (e) {} }); await p.waitForTimeout(800);
out.resolved = await p.evaluate(() => (R60.themeL.sam || []).map(c => c.pv));
for (const i of [0, 1, 2]) { const sel = '[data-tlp="sam:' + i + '"]'; await p.evaluate(() => PL.length = 0); const ok = await p.$(sel); if (!ok) { out['tap' + i] = 'no button'; continue; } if (i === 0) await p.tap(sel, { timeout: 4000 }).catch(e => out['tapErr' + i] = e.message.slice(0, 120)); else out['sync' + i] = await p.evaluate(s => { PL.length = 0; document.querySelector(s).click(); return { src: OXA.src.slice(-12), playedSync: PL.filter(x => x.src === OXA.src).length }; }, sel); await p.waitForTimeout(300); out['tap' + i] = await p.evaluate(() => PL.filter(x => !/^data:/.test(x.src))); await p.evaluate(() => OXA.pause()); }
/* picker results resolve too */
out.pk = await p.evaluate(() => new Promise(r => { PK.res = [{ n: 'Running Up That Hill', a: 'Kate Bush', pv: 'https://audio-ssl.itunes.apple.com/y.m4a' }]; try { pkDraw(); } catch (e) {} setTimeout(() => r(PK.res[0].pv), 600); }));
/* trivia keeps p.scdn.co now */
out.trv = await p.evaluate(() => { const log = []; const o = window.r55log; window.r55log = s => log.push(s); try { trvAudio('https://p.scdn.co/mp3-preview/q1'); } catch (e) { log.push('err ' + e.message); } window.r55log = o; return log.join('|').slice(0, 120); });
/* Listen on YouTube → Logged's own player, BACK exits */
const href = await p.evaluate(() => location.href); await p.evaluate(() => { window.__wo = 0; window.open = () => { window.__wo++; return null; }; });
const y = await p.$('[data-tly="sam:0"]'); if (y) await p.tap('[data-tly="sam:0"]').catch(e => out.tlyErr = e.message.slice(0, 100)); else await p.evaluate(() => songYT(R60.themeL.sam[0]));
await p.waitForTimeout(1500); out.yt = await p.evaluate(h => ({ open: document.getElementById('ytp').classList.contains('open'), id: YTX.id, ext: window.__wo, same: location.href === h }), href);
await p.screenshot({ path: '/workspace/logged-site/shots/r52_song_yt_' + (await p.evaluate(() => me())) + '.png' });
await p.tap('#ytp .yback', { timeout: 3000 }).catch(e => out.backErr = e.message.slice(0, 900)); await p.waitForTimeout(500); out.afterBack = await p.evaluate(() => document.getElementById('ytp').classList.contains('open'));
/* return-to-app: player stuck open with no video + disabled buttons → visibilitychange restores it, and BACK still works */
await p.evaluate(() => { YTO.tap = Date.now(); ytnOpen('aqz-KE-bpKQ', 'x'); }); await p.waitForTimeout(800); await p.evaluate(() => { document.querySelectorAll('#ytp button').forEach(b => b.disabled = true); document.documentElement.classList.add('lock'); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
out.revive = await p.evaluate(() => ({ disabled: document.querySelectorAll('#ytp button[disabled]').length, lock: document.documentElement.classList.contains('lock') }));
await p.tap('#ytp .yback', { timeout: 3000 }).catch(e => out.back2Err = e.message.slice(0, 100)); await p.waitForTimeout(400); out.afterBack2 = await p.evaluate(() => document.getElementById('ytp').classList.contains('open'));
out.calls = await p.evaluate(() => 0);
console.log('SONG60 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
