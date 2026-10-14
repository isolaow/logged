/* Batch-1 regression tests for Logged. iPhone emulation, real public APIs (iTunes, oEmbed), backend mocked (no secrets, no sheet writes).
   Run: node tests/batch1.test.js [path/to/app/index.html]   (needs playwright-core + Chrome; set PW=/path/to/playwright-core) */
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright-core');
const APP = path.resolve(process.argv[2] || path.join(__dirname, '../app/index.html')), SHOTS = process.env.SHOTS || '', TAG = process.env.TAG || 'after';
const R = (row, title, type, o) => Object.assign({ row, title, type, genres: 'Drama', suggestedBy: 'Sam', samWatched: 'Not yet', lewyWatched: 'Not yet', both: '', samRating: '', lewyRating: '', spesh: 'Optional', samComment: '', lewyComment: '' }, o || {});
const rows = [R(2, 'Inception', 'Movie', { samWatched: 'Yes', lewyWatched: 'Yes', samRating: 9, lewyRating: 8, dates: { samDone: '2026-01-02' } }),
  R(3, 'Breaking Bad (S2)', 'TV Show', { samWatched: 'As we speak', ep: { sam: { e: 3 } } }), R(4, 'Severance (S1)', 'TV Show', { lewyWatched: 'As we speak', ep: { lewy: { e: 8 } } }),
  R(5, 'Whiplash', 'Movie', { samWatched: 'Yes', dates: { samDone: '2026-05-01' } }), R(6, 'Garfield', 'Movie', { lewyWatched: 'Yes', dates: { lewyDone: '2026-03-01' } }),
  R(7, 'Lofi video', 'YouTube', { samWatched: 'Yes', ytm: { k: 'video', id: 'jfKfPfyJRdk', ch: 'Lofi Girl' } }), R(8, 'Shrek', 'Movie', { samWatched: 'Yes', lewyWatched: 'Yes', dates: { samDone: '2025-01-01' } })];
const meta = { 'Inception': { director: 'Christopher Nolan', cast: [['Leonardo DiCaprio', 'Cobb']], year: '2010' }, 'Breaking Bad (S2)': { eps: 13, cast: [['Bryan Cranston', 'Walter White']] }, 'Severance (S1)': { eps: 9, cast: [['Adam Scott', 'Mark Scout']] }, 'Whiplash': { director: 'Damien Chazelle', year: '2014' } };
const S = { ep: {}, themes: {}, upd: 0, updFail: 0, calls: [], ytlog: [] };
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
    case 'triviaDaily': return { d: '2026-10-14', today: true, qs: [{ kind: 'sound', audio: S.clip, q: 'EARS ON! WHICH TITLE IS THIS MUSIC FROM?', opts: ['Whiplash', 'Shrek', 'Inception', 'Garfield'] }, { kind: 'quote', quote: 'Downward is the only way forward.', q: 'IN INCEPTION, WHICH CHARACTER SAYS THIS?', opts: ['Cobb', 'Arthur', 'Saito'] }], mine: null, other: null, both: false, stats: {} };
    case 'adQuotes': return [{ q: 'Downward is the only way forward.', who: 'Cobb', t: 'Inception' }];
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
  p.on('pageerror', e => errs.push(e.message)); const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'r46_' + TAG + '_' + n + '.png') }); };
  await p.goto('file://' + APP); await p.waitForFunction(() => typeof rows !== 'undefined' && rows.length >= 7, null, { timeout: 30000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('splash'); if (s) s.remove(); });
  const has55 = await p.evaluate(() => typeof R55 !== 'undefined');
  const playing = () => p.evaluate(() => [...document.querySelectorAll('audio,video')].filter(a => !a.paused && !/^data:/.test(a.currentSrc || a.src)).map(a => (a.id || 'audio') + ':' + (a.currentSrc || a.src).slice(-40)));
  /* 1 soundtrack picker */
  await p.evaluate(() => openDetail(rows.find(r => r.title === 'Breaking Bad (S2)'))); await p.waitForTimeout(1200);
  await p.evaluate(() => { OSX.r = rows.find(r => r.title === 'Breaking Bad (S2)').row; pkOpen(); }); await fill('#pkq', 'Bohemian Rhapsody Queen');
  await p.waitForFunction(() => PK.res.length > 0, null, { timeout: 20000 }).catch(() => {}); ok('1a itunes search returns results', await p.evaluate(() => PK.res.length) > 0, await p.evaluate(() => PK.res.length));
  ok('1a no Spotify section', !(await p.evaluate(() => /SPOTIFY/.test(document.getElementById('pkb').innerText))));
  await tap('[data-pkp="i0"]'); await p.waitForTimeout(3000); let pl = await playing(); ok('1b tap ▶ plays a clip', pl.length === 1, pl); await shot('picker_playing');
  await tap('[data-pkp="i1"]'); await p.waitForTimeout(3000); pl = await playing(); ok('1b second ▶ switches, no duplicate playback', pl.length === 1 && (await p.evaluate(() => PK.cur)) === 'i1', pl);
  await p.evaluate(() => { document.getElementById('oxpk').classList.remove('open'); closeDetail(); show('stats'); }); await p.waitForTimeout(7000); pl = await playing(); ok('1c survives tab change + 7s (no poll stop)', pl.length === 1, pl);
  await p.evaluate(() => { openDetail(rows.find(r => r.title === 'Breaking Bad (S2)')); pkOpen(); });
  await fill('#pkq', ''); await fill('#pkl', 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv'); await p.waitForFunction(() => PK.paste && PK.paste.pv, null, { timeout: 30000 }).catch(() => {});
  ok('1d Spotify link → playable iTunes preview', await p.evaluate(() => !!(PK.paste && PK.paste.pv)), await p.evaluate(() => PK.paste && PK.paste.n + ' — ' + PK.paste.a));
  await fill('#pkl', 'https://youtu.be/fJ9rUzIMcZQ'); await p.waitForFunction(() => PK.paste && PK.paste.via === 'youtube' && PK.paste.pv, null, { timeout: 30000 }).catch(() => {});
  ok('1d YouTube link → playable iTunes preview', await p.evaluate(() => !!(PK.paste && PK.paste.pv)), await p.evaluate(() => PK.paste && PK.paste.n + ' — ' + PK.paste.a));
  await fill('#pkl', 'https://music.apple.com/au/album/bohemian-rhapsody/6781027361?i=6781027645'); await p.waitForFunction(() => PK.paste && PK.paste.via === 'apple', null, { timeout: 20000 }).catch(() => {});
  ok('1d Apple Music link → preview', await p.evaluate(() => !!(PK.paste && PK.paste.pv)));
  if (has55) { await tap('[data-pku="p"][data-sc="show"]'); await p.waitForTimeout(800); await fill('#pkl', ''); await fill('#pkq', 'Crystal Blue Persuasion'); await p.waitForFunction(() => PK.res.length > 0, null, { timeout: 20000 }).catch(() => {});
    await tap('[data-pku="i0"][data-sc="S2"]'); await p.waitForTimeout(800); await p.evaluate(() => document.getElementById('oxpk').classList.remove('open'));
    const tl = await p.evaluate(() => [...document.querySelectorAll('#ostx .tll li')].map(li => li.innerText.replace(/\s+/g, ' ')));
    ok('1e multiple soundtracks saved, labelled WHOLE SHOW / SEASON', tl.length >= 2 && tl.some(x => /WHOLE SHOW/.test(x)) && tl.some(x => /SEASON 2/.test(x)), tl);
    await p.evaluate(() => { const x = document.getElementById('ostx'); x && x.scrollIntoView(); }); await shot('soundtracks_list');
    const yt = await p.evaluate(() => new Promise(r => songVid({ n: 'Bohemian Rhapsody', a: 'Queen' }, v => r(v)))); ok('1f YouTube fallback gives a specific video id', !!(yt && yt.id), yt); }
  await p.evaluate(() => { OXA && OXA.pause(); closeDetail(); });
  /* 2 trivia clip */
  S.clip = (((await (await fetch('https://itunes.apple.com/search?entity=song&limit=3&country=AU&term=whiplash%20hank%20levy')).json()).results || [])[0] || {}).previewUrl;
  await p.evaluate(() => { muted = false; }); await p.evaluate(() => trvDaily()); await p.waitForTimeout(800); await tap('[data-trvgo]'); await p.waitForTimeout(3500); pl = await playing();
  ok('2a trivia sound question plays its clip', pl.some(x => /trvA/.test(x)), pl); await shot('trivia_sound');
  if (has55) { await p.evaluate(() => { TRV.daily.mine = { sc: 300, p: [0, 0] }; trvDailyRes(); }); await p.waitForTimeout(1200);
    ok('2b leaderboard + 9pm countdown shown after playing', await p.evaluate(() => !!document.querySelector('#trvLB table') && /\d+m \d+s/.test(document.getElementById('trvCD').textContent)), await p.evaluate(() => (document.getElementById('trvCD') || {}).textContent)); await shot('trivia_leaderboard'); }
  await p.evaluate(() => { try { trvClose(); } catch (e) {} });
  /* 3 episode +1 rapid taps */
  await p.evaluate(() => openDetail(rows.find(r => r.title === 'Breaking Bad (S2)'))); await p.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { await tap('#epx [data-ep="sam"][data-d="1"]'); await p.waitForTimeout(60); }
  await p.waitForTimeout(4000); const ep = await p.evaluate(() => { const r = rows.find(r => r.title === 'Breaking Bad (S2)'); return { local: epOf(r, 'sam'), ui: document.querySelector('#epx .s span:nth-of-type(2)').textContent }; });
  ok('3 six rapid +1 taps → exactly +6, server agrees', ep.local === 9 && S.ep['Breaking Bad (S2)'] && S.ep['Breaking Bad (S2)'].sam.e === 9, { ep, server: S.ep['Breaking Bad (S2)'] }); await shot('episodes');
  await p.evaluate(() => closeDetail());
  /* 4 newest sort after logging */
  await p.evaluate(() => { const r = rows.find(r => r.title === 'Garfield'); saveFields(r, { samWatched: 'Yes' }); }); await p.waitForTimeout(800);
  const first = await p.evaluate(() => { LGG.s = 'recent'; LGG.f = 'all'; return lggList()[0].title; }); ok('4 just-logged title is first under NEWEST', first === 'Garfield', first);
  /* 5 + new entry sheet above hotbar */
  await p.evaluate(() => { document.querySelectorAll('.modal.open,#qrm.open').forEach(m => m.classList.remove('open')); show('home'); }); await p.evaluate(() => $('fab').onclick()); await p.waitForTimeout(800);
  const lay = await p.evaluate(() => { const n = document.getElementById('nav'), cs = n && getComputedStyle(n), btns = [...document.querySelectorAll('#add .sheet button')].filter(b => /cancel|log it/i.test(b.textContent)), vh = innerHeight; return { navHidden: !n || cs.visibility === 'hidden' || cs.display === 'none', btns: btns.map(b => { const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { t: b.textContent.trim(), bottom: Math.round(r.bottom), hit: !!top && (top === b || b.contains(top)), top: top && (top.id || top.className || top.tagName) }; }), vh }; });
  await shot('add_sheet'); ok('5 new-entry buttons on top of hotbar and tappable', lay.navHidden && lay.btns.length >= 1 && lay.btns.every(x => x.hit), lay);
  await p.evaluate(() => { document.getElementById('add').classList.remove('open'); });
  /* 6 youtube logging only when really finished */
  if (has55) { const send = d => p.evaluate(d => ytAutoCheck(d), d); await p.evaluate(() => { YTP = { row: 7, vid: 'jfKfPfyJRdk' }; YAL = {}; YACC = {}; window.YTN_META = [{ id: 'abcdefghijk', t: 'Test video', ch: 'Ch' }]; });
    await send({ vid: 'abcdefghijk', st: 1, t: 0, d: 600 }); await send({ vid: 'abcdefghijk', st: 1, t: 590, d: 600 }); await send({ vid: 'abcdefghijk', st: 0, t: 600, d: 600 }); await p.waitForTimeout(400);
    ok('6a opening + seeking to the end does NOT log', S.ytlog.length === 0, S.ytlog.length);
    await p.evaluate(() => { YACC = {}; YLAST = {}; }); let t = 0; for (let i = 0; i < 300; i++) { await p.evaluate(d => { YLAST[d.vid] && (YLAST[d.vid].at -= 2000); ytAutoCheck(d); }, { vid: 'abcdefghijk', st: 1, t, d: 600 }); t += 2; } await p.waitForTimeout(500);
    ok('6b watching to ≥90% logs exactly once (as Sam, full flag)', S.ytlog.length === 1 && S.ytlog[0].full === true, S.ytlog.length);
    await send({ vid: 'abcdefghijk', st: 0, t: 600, d: 600 }); await p.waitForTimeout(300); ok('6c no duplicate on ENDED after logging', S.ytlog.length === 1);
  /* 7 youtube tap resolves by id */
    const v7 = await p.evaluate(() => { const got = []; const o = ytVid; ytVid = (g, i) => got.push(YG[g][i].id); document.body.insertAdjacentHTML('beforeend', ytCard({ id: 'BBBBBBBBBBB', t: 'B' }, 0, 'res')); YG.res = [{ id: 'AAAAAAAAAAA' }, { id: 'BBBBBBBBBBB' }]; document.querySelector('[data-ytid="BBBBBBBBBBB"]').click(); ytVid = o; document.querySelector('[data-ytid="BBBBBBBBBBB"]').closest('.ytc').remove(); return got; });
    ok('7 stale list index still opens the tapped video', v7[0] === 'BBBBBBBBBBB', v7); }
  /* 8 rating retry */
  S.updFail = 2; const u0 = S.upd; await p.evaluate(() => { const r = rows.find(r => r.title === 'Whiplash'); saveFields(r, { samRating: 8 }); }); await p.waitForTimeout(9000);
  ok('8 rating survives 2 network failures (auto-retry, saved once)', S.upd === u0 + 1 && (await p.evaluate(() => rows.find(r => r.title === 'Whiplash').samRating)) == 8, { saves: S.upd - u0, sync: await p.evaluate(() => $('sync').textContent) });
  /* 9 progress gradient + logging filters */
  await p.evaluate(() => openBrowse('watchlist')); await p.waitForTimeout(800); const tabs = await p.evaluate(() => [...document.querySelectorAll('#bpage .btabs button, #bpage [data-btab]')].map(b => b.textContent.trim()));
  ok('9a Logging has NEARLY FINISHED + JUST STARTED', tabs.some(x => /NEARLY/.test(x)) && tabs.some(x => /JUST STARTED/.test(x)), tabs); await shot('logging_filters');
  ok('9b progress bars use 3-colour gradient', await p.evaluate(() => /pgr/.test(epBar(rows.find(r => r.title === 'Severance (S1)')))));
  await p.evaluate(() => closePage('bpage'));
  /* 10 recent searches + Logged search */
  await p.evaluate(() => { document.querySelectorAll('.modal.open,#qrm.open').forEach(m => m.classList.remove('open')); show('home'); }); const setQ = v => p.evaluate(v => { const q = $('q'); if (KB.touch) { if (KB.target !== q) kbOpen(q); } else q.focus(); q.value = v; q.dispatchEvent(new Event('input', { bubbles: true })); q.oninput && q.oninput.call(q); }, v); await setQ('nolan'); await p.waitForTimeout(2200); await setQ('   '); await p.waitForTimeout(2200); await setQ('whiplash'); await p.evaluate(() => $('q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))); await setQ(''); await p.waitForTimeout(300);
  const rs = await p.evaluate(() => [...document.querySelectorAll('#rsq .rsg')].map(b => b.textContent)); ok('10a recent searches saved (no blanks, newest first)', rs.length === 2 && /whiplash/.test(rs[0]), rs); await shot('recent_searches');
  if (has55) { await tap('#rsq [data-rsx="0"]'); ok('10b remove one', (await p.evaluate(() => RS.length)) === 1); await tap('#rsq .rsg'); await p.waitForTimeout(600); ok('10c tap repeats search', (await p.evaluate(() => $('q').value)) === 'nolan');
    ok('10d person search: local "via" + database via label', await p.evaluate(() => /via Christopher Nolan/.test(document.getElementById('v-home').innerText)) && await p.waitForFunction(() => /via Christopher Nolan/.test(document.getElementById('qTm').innerText), null, { timeout: 5000 }).then(() => true, () => false)); await shot('person_search'); }
  await p.evaluate(() => { resetSearch(); show('all'); }); await p.waitForTimeout(500);
  if (await p.$('#lggq')) { await p.evaluate(() => { const q = $('lggq'); q.value = 'dicaprio'; q.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(400); const lg = await p.evaluate(() => [...document.querySelectorAll('#lgg .lgc .lgt')].map(x => x.textContent)); ok('10e Logged search (cast) + sort/filter', lg.length === 1 && lg[0] === 'Inception', lg); await shot('logged_search'); } else ok('10e Logged search box exists', false);
  /* 11 ad-break poster game: never blank, quote rounds */
  const ad = await p.evaluate(async () => { const G = ADG.find(g => g.k === 'guess'), el = document.createElement('div'); el.id = 'adt'; el.style.cssText = 'position:fixed;top:80px;left:10px;right:10px;z-index:999;background:#000;padding:8px'; document.body.appendChild(el);
    const out = []; let stop = G.mount(el, () => {}); for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 2500)); const cv = el.querySelector('canvas'); let blank = null; if (cv) { try { const d = cv.getContext('2d').getImageData(0, 0, 36, 54).data; blank = !d.some((v, j) => j % 4 === 3 && v > 0); } catch (e) { blank = 'tainted-but-drawn'; } }
      out.push(cv ? 'poster:' + blank : el.querySelector('blockquote') ? 'quote' : el.innerText.slice(0, 30)); const b = el.querySelector('[data-t]'); b && b.click(); await new Promise(r => setTimeout(r, 900)); } stop && stop(); return out; });
  ok('11 ad game: posters never blank, broken URL skipped, quote rounds appear', ad.every(x => x === 'poster:false' || x === 'poster:tainted-but-drawn' || x === 'quote') && ad.includes('quote'), ad); await shot('adgame');
  await p.evaluate(() => { const x = document.getElementById('adt'); x && x.remove(); });
  ok('no page errors', errs.length === 0, errs.slice(0, 5));
  fs.writeFileSync(path.join(__dirname, 'last-results-' + TAG + '.json'), JSON.stringify(res, null, 1)); await b.close();
  const f = Object.keys(res).filter(k => !res[k].pass); console.log(f.length ? f.length + ' FAILED' : 'ALL PASSED'); process.exit(f.length ? 1 : 0); })();
