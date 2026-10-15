(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const who = await p.evaluate(() => me()); out.who = who;
const arc = async (label) => { await p.tap('#nav [data-v=stats]', { timeout: 4000 }); await p.waitForTimeout(500); const ok = await p.evaluate(l => { const b = [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)); if (!b) return false; return true; }, label); if (!ok) return 'no item'; await p.evaluate(l => { [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)).click(); }, label); await p.waitForTimeout(900); };
const ed = async (sel) => { await p.tap('#cab ' + sel, { timeout: 4000 }).catch(e => out['tapErr' + sel] = e.message.slice(0, 120)); await p.waitForTimeout(300); return p.evaluate(() => !!document.querySelector('#ed61.open')); };
const search = async (q) => { await p.fill('#ed61q', q, { timeout: 3000 }).catch(e => out.fillErr = e.message.slice(0, 60)); await p.waitForTimeout(900); return p.evaluate(() => [...document.querySelectorAll('#ed61 .e61r .e61i b')].map(b => b.innerText)); };
const addFirst = async (name) => { const i = await p.evaluate(n => [...document.querySelectorAll('#ed61 .e61r .e61i')].findIndex(x => x.innerText.includes(n)), name); if (i < 0) return 'not found'; await p.tap('#ed61 .e61r .e61i:nth-child(' + (i + 1) + ') [data-e61^=add]').catch(e => out.addErr = e.message.slice(0, 100)); await p.waitForTimeout(700); return 'ok'; };
const done = async () => { await p.tap('#ed61 [data-e61x]').catch(() => {}); await p.waitForTimeout(500); };
/* identity can't be flipped by the old ⇄ buttons */
out.flip = await p.evaluate(() => { setWho(me() === 'sam' ? 'lewy' : 'sam'); return [me(), localStorage.lg_who, getComputedStyle(document.body).display]; });
await arc('PROFILE'); await p.waitForTimeout(500);
out.campClean = await p.evaluate(() => document.querySelectorAll('#v-stats .spinbar,#v-stats .trvbar').length);
const rowsBefore = await p.evaluate(() => rows.length); const intBefore = await p.evaluate(() => JSON.stringify(INT[me()] || {}));
/* soundtracks */
out.sndOpen = await ed('[data-sndedit]'); out.sndRes = await search('baby blue'); out.sndAdd = await addFirst('Baby Blue'); await done();
out.sndCab = await p.evaluate(() => [...document.querySelectorAll('#cab .cbsnd li')].map(li => li.innerText.replace(/\s+/g, ' ').trim() + (li.querySelector('.sa61 img') ? ' [art]' : li.querySelector('.sa61') ? ' [8bit]' : ' [none]')));
/* movies: outside pick (not logged) */
out.mvOpen = await ed('[data-fav="mv"]'); out.mvRes = await search('oppen'); out.mvAdd = await addFirst('Oppenheimer'); await done();
out.mvCab = await p.evaluate(() => { const h = [...document.querySelectorAll('#cab .cbs h4')].find(x => x.innerText.includes('TOP 5 MOVIES')); return h ? [...h.parentNode.querySelectorAll('.cbt b')].map(b => b.innerText) : 'no shelf'; });
/* youtube outside pick */
out.ytOpen = await ed('[data-fav="yt"]'); out.ytRes = await search('rick'); out.ytAdd = await addFirst('Never Gonna'); await done();
out.ytCab = await p.evaluate(() => { const h = [...document.querySelectorAll('#cab .cbs h4')].find(x => x.innerText.includes('TOP 5 YOUTUBE')); return h ? [...h.parentNode.querySelectorAll('.cbt b')].map(b => b.innerText) : 'no shelf'; });
/* our top 5: add an outside movie + reorder */
out.otOpen = await ed('[data-ot="edit"]'); out.otRes = await search('oppen'); out.otAdd = await addFirst('Oppenheimer');
await done();
out.otShown = await p.evaluate(() => [...document.querySelectorAll('#cab .ot58 .cbt b')].map(b => b.innerText));
out.notLogged = await p.evaluate(([n, ib]) => ({ rows: rows.length === n, int: JSON.stringify(INT[me()] || {}) === ib }), [rowsBefore, intBefore]);
out.server = { prof: S.prof && S.prof[who], ot: S.ot, calls: S.calls.filter(c => /saveProfile|setOurTop|songSearch/.test(c)) };
await p.screenshot({ path: '/workspace/logged-site/shots/r53_cabinet_' + who + '.png' });
/* other phone sees it: reload (fresh getData from the server) */
await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); await arc('PROFILE'); await p.waitForTimeout(800);
out.afterReload = await p.evaluate(() => ({ prof: JSON.stringify(profiles[me()]).slice(0, 200), cbs: [...document.querySelectorAll('#cab .cbs h4')].map(h => h.innerText.slice(0, 20) + '=' + h.parentNode.children.length), who: me(), snd: [...document.querySelectorAll('#cab .cbsnd li b')].map(b => b.innerText), ot: [...document.querySelectorAll('#cab .ot58 .cbt b')].map(b => b.innerText) }));
/* the soundtrack sheet rows get artwork */
out.tlArt = await p.evaluate(() => new Promise(r => { const row = rows.filter(x => !isYT(x))[0]; row.themeL = { [me()]: [{ n: 'Baby Blue', a: 'Badfinger', sc: 'show' }] }; openDetail(row); setTimeout(() => { try { oxPaint(); } catch (e) {} setTimeout(() => r([...document.querySelectorAll('li.tl')].map(li => !!li.querySelector('.sa61'))), 900); }, 1200); }));
/* trivia: shared OXA, Spotify MP3, next clip started inside the answer tap; TRA never used */
out.trv = await p.evaluate(() => { const L = []; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { L.push(this === OXA ? 'OXA' : this.id || this.tagName); return Promise.resolve(); };
  trvAudio('https://p.scdn.co/mp3-preview/q1'); const a = OXA.src; TRV.daily = { qs: [{ audio: 'https://p.scdn.co/mp3-preview/q1' }, { audio: 'https://p.scdn.co/mp3-preview/q2' }] }; TRV.dq = 0; TRV.picks = []; TRV.ms = []; TRV.t0 = Date.now();
  let b = ''; try { trvDPick(0); b = OXA.src; } catch (e) { b = 'err ' + e.message; } HTMLMediaElement.prototype.play = op; return { first: a, nextInTap: b, players: [...new Set(L)] }; });
console.log('R61 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
