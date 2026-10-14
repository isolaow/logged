(async () => {
const U = { time: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e0/1d/a4/e01da4a2-a75f-7ebf-9971-3d49e17efc57/mzaf_10500078769097048384.plus.aac.p.m4a',
  star: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8b/2c/42/8b2c42eb-a194-0327-eeb4-caaaa14ee61b/mzaf_13415710220894021381.plus.aac.p.m4a',
  car: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/55/ee/a6/55eea661-81c9-0dd5-0d50-3cecb258626e/mzaf_11338746566784732509.plus.aac.p.m4a',
  ist: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/03/8d/18/038d18cf-02a3-3355-1539-67188bfeb502/mzaf_17706808529570394680.plus.aac.p.m4a' };
const SND = (u, a) => ({ kind: 'sound', audio: u, q: 'EARS ON! WHICH TITLE IS THIS MUSIC FROM?', opts: ['Whiplash', 'Shrek', 'Inception', 'Interstellar'], a });
const QS = [SND(U.time, 2), { kind: 'quote', quote: 'Downward is the only way forward.', q: 'IN INCEPTION, WHICH CHARACTER SAYS THIS?', opts: ['Cobb', 'Arthur', 'Saito', 'Ariadne'], a: 0 },
  SND(U.star, 1), { kind: 'year', q: 'WHAT YEAR DID SHREK COME OUT?', opts: ['1999', '2001', '2004', '2007'], a: 1 }, SND(U.car, 0),
  { kind: 'director', q: 'WHO DIRECTED WHIPLASH?', opts: ['Damien Chazelle', 'Greta Gerwig', 'Denis Villeneuve', 'Rian Johnson'], a: 0 }, SND(U.ist, 3),
  { kind: 'tagline', q: 'WHICH TITLE HAS THIS TAGLINE? “Your mind is the scene of the crime.”', opts: ['Inception', 'Shrek', 'Whiplash', 'Interstellar'], a: 0 }];
const strip = q => { const o = Object.assign({}, q); delete o.a; return o; };
let G = null; const QMS = 15000, RMS = 2500;
const tick = () => { const now = Date.now(); if (!G) return; if (G.phase === 'q' && (G.ans.sam[G.i] != null || now > G.at + QMS)) { G.phase = 'reveal'; G.at = now; } else if (G.phase === 'reveal' && now > G.at + RMS) { if (++G.i >= QS.length) G.phase = 'done'; else { G.phase = 'q'; G.at = now; } } };
const view = () => { const o = { code: G.code, host: 'sam', guest: G.guest, phase: G.phase, i: G.i, n: QS.length, at: G.at, now: Date.now(), qms: QMS, sc: G.sc };
  if (G.phase === 'q' || G.phase === 'reveal') { o.q = G.phase === 'reveal' ? QS[G.i] : strip(QS[G.i]); o.locked = { sam: G.ans.sam[G.i] != null, lewy: true }; o.mine = G.ans.sam[G.i]; o.skipV = {}; o.skipped = false; if (G.phase === 'reveal') o.ans = { sam: G.ans.sam[G.i], lewy: { c: QS[G.i].a, ms: 3000 } }; } return o; };
global.MOCKX = (fn, args) => {
  if (fn === 'triviaDaily') return { d: '2026-10-14', today: true, qs: QS.map(strip), mine: null, other: null, both: false, stats: {} };
  if (fn === 'triviaDailyAnswer') { S.dans = args; return { d: '2026-10-14', today: true, qs: QS, mine: { sc: 500, p: args[1] }, other: null, stats: {} }; }
  if (fn === 'triviaNew') { G = { code: '4242', guest: '', phase: 'lobby', i: 0, at: Date.now(), ans: { sam: {} }, sc: { sam: 0, lewy: 0 } }; setTimeout(() => { G.guest = 'lewy'; G.phase = 'q'; G.at = Date.now() + 2500; }, 1500); return view(); }
  if (fn === 'triviaState') { if (!G) return { phase: 'gone' }; tick(); return view(); }
  if (fn === 'triviaAnswer') { const [, , i, c] = args; if (G.phase === 'q' && G.i === +i) { G.ans.sam[i] = { c: +c, ms: Date.now() - G.at }; if (+c === QS[i].a) G.sc.sam += 120; G.sc.lewy += 110; tick(); } return view(); }
  if (fn === 'triviaOpen' || fn === 'triviaSkips') return ''; return undefined; };
const audioState = () => p.evaluate(() => { const a = document.getElementById('trvA2'); return a ? { src: (a.currentSrc || a.src || '').slice(-28), t: +a.currentTime.toFixed(2), paused: a.paused, muted: a.muted, vol: a.volume, appMuted: !!window.muted || (typeof muted !== 'undefined' && muted), err: a.error && a.error.code, rs: a.readyState } : null; });
const btnText = () => p.evaluate(() => { const b = document.querySelector('#trvB [data-trvsnd]'); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
const report = []; const playCheck = async (label, want) => { await p.waitForTimeout(2500); const a1 = await audioState(); await p.waitForTimeout(1200); const a2 = await audioState();
  const ok = a2 && !a2.paused && !a2.muted && a2.vol > 0 && !a2.appMuted && a2.t > a1.t && want.endsWith(a2.src.slice(-20)); report.push({ label, ok, a1, a2, btn: await btnText() }); console.log((ok ? 'PLAYS ' : 'SILENT') + ' ' + label + ' ' + JSON.stringify(a2) + ' btn=' + (await btnText())); };
const qText = () => p.evaluate(() => { const b = document.getElementById('trvB') || document.getElementById('trv'); return b ? b.innerText.replace(/\s+/g, ' ').slice(0, 160) : ''; });
// ---- DAILY ----
console.log('UA', await p.evaluate(() => navigator.userAgent.slice(0, 60)), 'audioSession?', await p.evaluate(() => !!navigator.audioSession));
await p.evaluate(() => trvDaily()); await p.waitForSelector('[data-trvgo]'); if (SHOTS) await p.screenshot({ path: SHOTS + '/r49_trv_daily_intro.png' });
await p.tap('[data-trvgo]');
for (let i = 0; i < QS.length; i++) { await p.waitForSelector('[data-trva]'); const txt = await qText(); console.log('Q' + (i + 1) + ' [' + QS[i].kind + '] ' + txt);
  if (SHOTS && i < 3) await p.screenshot({ path: SHOTS + '/r49_trv_daily_q' + (i + 1) + '.png' });
  if (QS[i].kind === 'sound') await playCheck('daily Q' + (i + 1), QS[i].audio); else await p.waitForTimeout(800);
  const opts = await p.$$('[data-trva]'); await opts[i % 3 === 0 ? QS[i].a : (QS[i].a + 1) % 4].tap(); await p.waitForTimeout(500); }
await p.waitForTimeout(2500); console.log('DAILY END: ' + await qText()); console.log('submitted picks', JSON.stringify(S.dans && S.dans[1])); if (SHOTS) await p.screenshot({ path: SHOTS + '/r49_trv_daily_end.png' });
// ---- LIVE ----
await p.evaluate(() => { try { trvClose(); } catch (e) {} trvLobby(); }); await p.waitForSelector('[data-trvnew]'); await p.tap('[data-trvnew]');
for (let i = 0; i < QS.length; i++) { await p.waitForFunction(n => TRV.st && TRV.st.phase === 'q' && TRV.st.i === n && document.querySelector('[data-trva]:not([disabled])'), i, { timeout: 25000 });
  console.log('LIVE Q' + (i + 1) + ' [' + QS[i].kind + '] ' + await qText()); if (SHOTS && i === 0) await p.screenshot({ path: SHOTS + '/r49_trv_live_q1.png' });
  if (QS[i].kind === 'sound') await playCheck('live Q' + (i + 1), QS[i].audio); else await p.waitForTimeout(600);
  const opts = await p.$$('[data-trva]'); await opts[QS[i].a].tap(); }
await p.waitForFunction(() => TRV.st && TRV.st.phase === 'done', null, { timeout: 20000 }).catch(() => console.log('live not done')); await p.waitForTimeout(800); console.log('LIVE END: ' + await qText()); if (SHOTS) await p.screenshot({ path: SHOTS + '/r49_trv_live_end.png' });
console.log('SOUND RESULT ' + report.filter(r => r.ok).length + '/' + report.length + ' audible'); console.log('page errors', JSON.stringify(errs));
fs.writeFileSync(path.join(__dirname, 'last-results-trivia-webkit.json'), JSON.stringify(report, null, 1));
})()
