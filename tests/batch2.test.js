/* Batch-2 tests (run: node tests/batch2.test.js [app/index.html]; SHOTS=dir for screenshots). Based on Batch-1 harness for Logged. iPhone emulation, real public APIs (iTunes, oEmbed), backend mocked (no secrets, no sheet writes).
   Run: node tests/batch1.test.js [path/to/app/index.html]   (needs playwright-core + Chrome; set PW=/path/to/playwright-core) */
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright-core');
const APP = path.resolve(process.argv[2] || path.join(__dirname, '../app/index.html')), SHOTS = process.env.SHOTS || '', TAG = process.env.TAG || 'after';
const R = (row, title, type, o) => Object.assign({ row, title, type, genres: 'Drama', suggestedBy: 'Sam', samWatched: 'Not yet', lewyWatched: 'Not yet', both: '', samRating: '', lewyRating: '', spesh: 'Optional', samComment: '', lewyComment: '' }, o || {});
const rows = [R(2, 'Inception', 'Movie', { samWatched: 'Yes', lewyWatched: 'Yes', samRating: 9, lewyRating: 8, dates: { samDone: '2026-01-02' } }),
  R(3, 'Breaking Bad (S2)', 'TV Show', { samWatched: 'As we speak', ep: { sam: { e: 3 } } }), R(4, 'Severance (S1)', 'TV Show', { lewyWatched: 'As we speak', ep: { lewy: { e: 8 } } }),
  R(5, 'Whiplash', 'Movie', { samWatched: 'Yes', dates: { samDone: '2026-05-01' } }), R(6, 'Garfield', 'Movie', { lewyWatched: 'Yes', dates: { lewyDone: '2026-03-01' } }),
  R(7, 'Lofi video', 'YouTube', { samWatched: 'Yes', ytm: { k: 'video', id: 'jfKfPfyJRdk', ch: 'Lofi Girl' } }), R(8, 'Shrek', 'Movie', { samWatched: 'Yes', lewyWatched: 'Yes', dates: { samDone: '2025-01-01' } }), R(9, 'Dune', 'Movie'), R(10, 'The Bear (S1)', 'TV Show'), R(11, 'Past Lives', 'Movie')];
const meta = { 'Inception': { director: 'Christopher Nolan', cast: [['Leonardo DiCaprio', 'Cobb']], year: '2010' }, 'Breaking Bad (S2)': { eps: 13, cast: [['Bryan Cranston', 'Walter White']] }, 'Severance (S1)': { eps: 9, cast: [['Adam Scott', 'Mark Scout']] }, 'Whiplash': { director: 'Damien Chazelle', year: '2014' } };
const S = { int: { sam: { 'r:Dune': { v: 'y', at: 1, h: 3 }, 'r:The Bear (S1)': { v: 'y', at: 2, h: 1 }, 'r:Past Lives': { v: 'y', at: 3 } }, lewy: { 'r:Dune': { v: 'y', at: 1, h: 2 } } }, nfm: { sam: [], lewy: [] }, mh: { sam: [], lewy: [] }, ep: {}, themes: {}, upd: 0, updFail: 0, calls: [], ytlog: [] };
Object.assign(meta['Inception'] = meta['Inception'] || {}, { runtime: 148 }); meta['Whiplash'] = Object.assign(meta['Whiplash'] || {}, { runtime: 107 }); meta['Shrek'] = Object.assign(meta['Shrek'] || {}, { runtime: 90 });
function mock(fn, args, who) { S.calls.push(fn);
  switch (fn) {
    case 'getData': return { rows: JSON.parse(JSON.stringify(rows)), version: '1', posters: {"Inception": "https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled", "Shrek": "https://upload.wikimedia.org/wikipedia/en/7/7b/Shrek_%282001_animated_feature_film%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled", "Garfield": "https://image.tmdb.org/t/p/w342/vqwTSWNLyH55g8kBT61s2DgNYEp.jpg", "Whiplash": "https://upload.wikimedia.org/wikipedia/en/0/01/Whiplash_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled", "Breaking Bad (S2)": "https://example.invalid/missing.jpg"}, recent: [], profiles: { sam: {}, lewy: {} }, fetchedAt: new Date().toISOString() };
    case 'getAllMeta': return meta; case 'getVersion': return '1';
    case 'setEpisode': { const [t, p, n, seq] = args, o = S.ep[t] = S.ep[t] || {}; if (o[p] && o[p].q > seq) return Object.assign({ stale: 1 }, o); o[p] = { e: n, q: seq }; return JSON.parse(JSON.stringify(o)); }
    case 'setThemes': { const [t, p, L] = args, b = t.replace(/\s*\(S\d+\)$/, ''); S.themes[b] = S.themes[b] || {}; S.themes[b][p] = L; return S.themes[b]; }
    case 'updateEntry': { S.upd++; const r = rows.find(x => x.row === args[0]); return Object.assign({}, r, args[1]); }
    case 'addEntry': return R(99, args[0].title, args[0].type || 'Movie', args[0]);
    case 'searchTitles': return { results: [{ id: 1, tv: false, title: 'Oppenheimer', year: 2023, poster: '', genres: ['Drama'], via: 'Christopher Nolan (dir.)' }] };
    case 'songVideo': return { id: 'fJ9rUzIMcZQ', t: 'Queen – Bohemian Rhapsody (Official Video)', ch: 'Queen Official' };
    case 'ytAutoLog': S.ytlog.push(args[0]); return { title: args[0].t, logged: true };
    case 'triviaResults': return [{ id: 'daily-2026-10-13', d: '2026-10-13', m: 'Daily', p: 'Sam', sc: 640, ok: 5, n: 8, res: 'Win' }, { id: 'daily-2026-10-13', d: '2026-10-13', m: 'Daily (catch-up)', p: 'Lewy', sc: 410, ok: 3, n: 8, res: 'Loss' }];
    case 'triviaDaily': if (S.clips) return { d: '2026-10-14', today: true, qs: S.clips.map(c => ({ kind: 'sound', audio: c.url, q: 'EARS ON! WHICH TITLE IS THIS MUSIC FROM?', opts: ['Whiplash', 'Shrek', 'Inception', 'Garfield'], alt: { kind: 'year', q: 'ALT: WHAT YEAR DID INCEPTION COME OUT?', opts: ['2008', '2010', '2012'] } })), mine: null, other: null, both: false, stats: {} }; return { d: '2026-10-14', today: true, qs: [{ kind: 'sound', audio: S.clip, q: 'EARS ON! WHICH TITLE IS THIS MUSIC FROM?', opts: ['Whiplash', 'Shrek', 'Inception', 'Garfield'] }, { kind: 'quote', quote: 'Downward is the only way forward.', q: 'IN INCEPTION, WHICH CHARACTER SAYS THIS?', opts: ['Cobb', 'Arthur', 'Saito'] }], mine: null, other: null, both: false, stats: {} };
    case 'adQuotes': return [{ q: 'Downward is the only way forward.', who: 'Cobb', t: 'Inception' }];
    case 'getInterest': return S.int;
    case 'setInterest': { const [w, k, v, m] = args; const o = S.int[w]; if (!v) delete o[k]; else o[k] = Object.assign({}, o[k] || {}, m || {}, { v, at: Date.now() }); return o; }
    case 'getNotForMe': return S.nfm; case 'setNotForMe': { const [t, on] = args, w = who; S.nfm[w] = (S.nfm[w] || []).filter(x => x !== t); if (on) S.nfm[w].push(t); S.calls.push(['nfm',w,t,on]); return S.nfm; }
    case 'epRuntimes': return { 'Breaking Bad (S2)': { r: [47, 46, 47, 48, 47, 47, 47, 47, 47, 47, 47, 47, 47], avg: 47 }, 'Severance (S1)': { r: [57, 53, 0, 55, 50, 40, 45, 50, 40], avg: 49 } };
    case 'getMoodHist': return S.mh[who] || []; case 'tmdbDetails': return {id:1,tv:false,title:'Mock Fresh',ov:'A full synopsis that is much longer than the card blurb.',date:'2026-09-01',genres:['Drama','Mystery'],rt:118,vote:7.4,tag:'Tagline',poster:'',yt:'dQw4w9WgXcQ'}; case 'tmdbFresh': return [{id:1,title:'Mock Fresh',year:'2026',tv:false,poster:'',overview:'Short blurb. More.',vote:7.4}]; case 'addMoodHist': { S.mh[who] = [args[0]].concat(S.mh[who] || []); return S.mh[who]; } case 'clearMoodHist': S.mh[who] = []; return [];
    case 'triviaDailyAnswer': S.dans = args; return { d: '2026-10-14', today: true, qs: [], mine: { sc: 0, p: args[1] }, stats: {} };
    case 'triviaDays': return [{ d: '2026-10-12', n: 8, sam: null, lewy: { sc: 300 } }];
    default: return null; } }
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await c.route(/script\.google\.com\/macros\/s\/.*\/exec/, async rt => { const j = JSON.parse(rt.request().postData() || '{}');
    if (j.fn === 'updateEntry' && S.updFail > 0) { S.updFail--; return rt.abort('failed'); }
    const delay = j.fn === 'setEpisode' ? 100 + Math.random() * 900 : 30; await new Promise(r => setTimeout(r, delay));
    rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, r: mock(j.fn, j.args || [], j.who) }) }); });
  await c.addInitScript(() => { localStorage.setItem('lg_who', 'sam'); localStorage.setItem('lg_token', 'test'); });
  const p = await c.newPage(); p.setDefaultTimeout(12000); const tap = async q => { try { await p.tap(q); } catch (e) { console.log('  (could not tap ' + q + ')'); } }, fill = async (q, v) => { try { await p.fill(q, v); } catch (e) { console.log('  (could not fill ' + q + ')'); } }; const T = async (n, f) => { try { await f(); } catch (e) { console.log('FAIL ' + n + ' (threw) — ' + String(e.message).split('\n')[0]); res[n + ' (threw)'] = { pass: false }; } }; const errs = [], res = {}, ok = (k, v, d) => { res[k] = { pass: !!v, d }; console.log((v ? 'PASS ' : 'FAIL ') + k + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); };
  p.on('pageerror', e => errs.push(e.message)); const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'r47_' + TAG + '_' + n + '.png') }); };
  await p.goto('file://' + APP); await p.waitForFunction(() => typeof rows !== 'undefined' && rows.length >= 7, null, { timeout: 30000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('splash'); if (s) s.remove(); });
  
  const playing = () => p.evaluate(() => [...document.querySelectorAll('audio,video')].filter(a => !a.paused && !/^data:/.test(a.currentSrc || a.src)).map(a => (a.id || 'audio') + ':' + (a.currentSrc || a.src).slice(-40)));

  await eval(require('fs').readFileSync(process.env.STEP || path.join(__dirname, 'batch2.steps.js'),'utf8'));
  await b.close(); })();
