/* ===== Batch 1 (r55): reliability fixes — person search, episode seq, soundtrack lists, verified song videos, trivia leaderboard + 9pm daily ===== */

/** TMDB person search → their directed (crew job=Director) + acted titles. Cached 6h. */
function personTitles_(q) {
  q = String(q || '').trim(); if (q.length < 3 || !tmdbKey_()) return [];
  var C = CacheService.getScriptCache(), ck = 'pt1_' + posterKey_(q.toLowerCase(), 'p').slice(7), h = C.get(ck); if (h) return JSON.parse(h);
  var out = [], seen = {}, nq = String(q).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  var P = ((tmdb_('search/person', { query: q, include_adult: 'false' }) || {}).results || []).filter(function (p) {
    var n = String(p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); return n.indexOf(nq) >= 0 || nq.split(' ').every(function (w) { return n.indexOf(w) >= 0; }); }).slice(0, 2);
  P.forEach(function (p) {
    var cc = tmdb_('person/' + p.id + '/combined_credits', { language: 'en-US' }) || {};
    var dir = (cc.crew || []).filter(function (x) { return x.job === 'Director' || (x.media_type === 'tv' && x.job === 'Creator'); }).map(function (x) { x._r = x.job === 'Director' ? 'dir.' : 'creator'; return x; });
    var cast = (cc.cast || []).filter(function (x) { return (x.order == null || x.order < 12) && !/self|himself|herself|narrator \(voice\)/i.test(x.character || ''); }).map(function (x) { x._r = x.character ? 'as ' + String(x.character).split('/')[0].trim().slice(0, 30) : 'cast'; return x; });
    var L = (p.known_for_department === 'Directing' ? dir.concat(cast) : cast.concat(dir)).filter(function (x) { return x.media_type === 'movie' || x.media_type === 'tv'; });
    L.sort(function (a, b) { return (b.vote_count || 0) - (a.vote_count || 0); });
    L.slice(0, 24).forEach(function (r) { var tv = r.media_type === 'tv', k = (tv ? 't' : 'm') + r.id; if (seen[k]) return; seen[k] = 1;
      out.push({ id: r.id, tv: tv, title: tv ? r.name : r.title, year: Number(String((tv ? r.first_air_date : r.release_date) || '').slice(0, 4)) || '', poster: tmdbImg_(r.poster_path, 'w154'), genres: tmdbGenres_(r.genre_ids), via: p.name + ' (' + r._r + ')' }); });
  });
  out = out.slice(0, 16); try { C.put(ck, JSON.stringify(out), 21600); } catch (e) {} return out;
}

/** Soundtrack LISTS per person, stored on the base show title so whole-show picks show on every season row.
 *  list = [{n,a,pv,art,via,yt,sc}] with sc = 'show' or 'S<n>'. Max 12 per person. Returns {sam:[...], lewy:[...]}. */
function themeLKey_(title) { return 'THEMEL_' + posterKey_(baseShow_(title), 'tl').slice(7); }
function baseShow_(t) { return String(t || '').trim().replace(/\s*\((S\d+|\d{4}|[IVX]+)\)\s*$/i, '').trim(); }
function getThemes(title) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(themeLKey_(title)) || '{}'); } catch (e) { return {}; } }
function setThemes(title, person, list, who) {
  title = String(title || '').trim(); person = person || who; if (!title || (person !== 'sam' && person !== 'lewy')) throw new Error('bad args');
  var L = LockService.getScriptLock(); L.waitLock(10000);
  try { var o = getThemes(title), seen = {};
    o[person] = (Array.isArray(list) ? list : []).map(function (c) { c = c || {}; var x = { n: String(c.n || '').slice(0, 120), a: String(c.a || '').slice(0, 120), sc: /^S\d{1,2}$/.test(c.sc) ? c.sc : 'show' };
      if (/^https:\/\/audio-ssl\.itunes\.apple\.com\//.test(c.pv || '')) x.pv = String(c.pv).slice(0, 400);
      if (/^https:\/\/[\w.-]+\.mzstatic\.com\//.test(c.art || '')) x.art = String(c.art).slice(0, 300);
      if (c.yt) x.yt = String(c.yt).replace(/[^\w-]/g, '').slice(0, 11); if (c.via) x.via = String(c.via).replace(/[^\w]/g, '').slice(0, 12); if (c.id) x.id = String(c.id).replace(/[^\w]/g, '').slice(0, 20);
      return x; }).filter(function (x) { var k = (x.n + '|' + x.a + '|' + x.sc).toLowerCase(); if (!x.n || seen[k]) return false; seen[k] = 1; return true; }).slice(0, 12);
    if (!o[person].length) delete o[person];
    var P = PropertiesService.getScriptProperties(); if (Object.keys(o).length) P.setProperty(themeLKey_(title), JSON.stringify(o)); else P.deleteProperty(themeLKey_(title));
    bumpVersion_(); return o; } finally { L.releaseLock(); } }

/** A specific, verified YouTube video for a song: YouTube Data API search (server key), title must contain the song name
 *  (and preferably the artist); cached in Script Properties. Returns {id, t, ch} or null. */
function songVideo(song, artist) {
  song = String(song || '').trim(); artist = String(artist || '').split(/,|&| feat\.?/i)[0].trim(); if (!song) return null;
  var P = PropertiesService.getScriptProperties(), k = 'SONGV2_' + posterKey_(song + '|' + artist, 's').slice(7), h = P.getProperty(k); if (h) return h === '-' ? null : JSON.parse(h);
  var nz = function (x) { return String(x || '').toLowerCase().replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim(); }, ns = nz(song.replace(/\s*[-–]\s*(from|remaster|single|live).*$/i, '')), na = nz(artist);
  var key = ytKey_(), items = [];
  if (key) { var d = fetchJson_('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&type=video&videoCategoryId=10&q=' + encodeURIComponent(song + ' ' + artist) + '&key=' + key) || {};
    items = (d.items || []).map(function (it) { var s = it.snippet || {}; return { id: it.id.videoId, t: String(s.title || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), ch: String(s.channelTitle || '') }; }); }
  var score = function (v) { var t = nz(v.t), c = nz(v.ch); if (!ns || t.indexOf(ns) < 0) return -1; var s = 1; if (na && (t.indexOf(na) >= 0 || c.indexOf(na) >= 0)) s += 2; if (/ topic$|vevo/.test(c) || /official (audio|video|music video)/.test(t)) s += 1; if (/cover|karaoke|lyrics?|reaction|remix|8d|slowed|sped up|nightcore/.test(t)) s -= 2; return s; };
  var best = null; items.forEach(function (v) { var s = score(v); if (s > 0 && (!best || s > best.s)) best = { id: v.id, t: v.t, ch: v.ch, s: s }; });
  if (best) delete best.s; P.setProperty(k, best ? JSON.stringify(best) : '-'); return best; }

/* ----- Trivia leaderboard: every result as a row in the sheet tab 'Trivia Results' (never touches 'Log'); idempotent by Game ID+Player ----- */
var TVR_SHEET_ = 'Trivia Results', TVR_HEAD_ = ['Game ID', 'Date', 'Mode', 'Player', 'Score', 'Correct', 'Questions', 'Result', 'Recorded At'];
function tvrSheet_() { var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TVR_SHEET_); if (!sh) { sh = ss.insertSheet(TVR_SHEET_); sh.getRange(1, 1, 1, TVR_HEAD_.length).setValues([TVR_HEAD_]).setFontWeight('bold'); sh.setFrozenRows(1); } return sh; }
/** recs = [{id, date, mode, player, score, ok, n, result}]. Skips any Game ID+Player already present. */
function tvrAdd_(recs) { if (!recs || !recs.length) return 0; var L = LockService.getScriptLock(); L.waitLock(15000);
  try { var sh = tvrSheet_(), n = sh.getLastRow(), have = {};
    if (n > 1) sh.getRange(2, 1, n - 1, 4).getDisplayValues().forEach(function (r) { have[r[0] + '|' + r[3]] = 1; });
    var now = Utilities.formatDate(new Date(), 'Australia/Sydney', 'yyyy-MM-dd HH:mm'), add = [];
    recs.forEach(function (x) { var k = x.id + '|' + x.player; if (have[k]) return; have[k] = 1; add.push([x.id, x.date, x.mode, x.player, x.score || 0, x.ok == null ? '' : x.ok, x.n || '', x.result || '', now]); });
    if (add.length) { sh.getRange(n + 1, 1, add.length, TVR_HEAD_.length).setNumberFormat('@').setValues(add.map(function (r) { return r.map(String); })); }
    return add.length; } finally { L.releaseLock(); } }
function tvrResult_(sc, p) { var o = p === 'Sam' ? 'lewy' : 'sam', me = p.toLowerCase(); if (sc[o] == null) return ''; return sc[me] > sc[o] ? 'Win' : sc[me] < sc[o] ? 'Loss' : 'Tie'; }
function tvrLive_(g) { if (!g || !g.code) return; var id = 'live-' + g.code + '-' + (g.t0 || g.at0 || ''), d = Utilities.formatDate(new Date(), 'Australia/Sydney', 'yyyy-MM-dd'), n = g.qs.length;
  var ok = function (p) { var c = 0; g.qs.forEach(function (q, i) { var A = g.ans[p][i]; if (A && A.c === q.a) c++; }); return c; };
  tvrAdd_(['Sam', 'Lewy'].map(function (P) { return { id: id, date: d, mode: 'Live', player: P, score: g.sc[P.toLowerCase()], ok: ok(P.toLowerCase()), n: n, result: tvrResult_(g.sc, P) }; })); }
function tvrDaily_(d) { if (!d || !d.ans) return; var sc = {}; ['sam', 'lewy'].forEach(function (p) { if (d.ans[p]) sc[p] = d.ans[p].sc; });
  tvrAdd_(['sam', 'lewy'].filter(function (p) { return d.ans[p]; }).map(function (p) { var a = d.ans[p], P = p === 'sam' ? 'Sam' : 'Lewy'; return { id: 'daily-' + d.d, date: d.d, mode: a.late ? 'Daily (catch-up)' : 'Daily', player: P, score: a.sc, ok: a.ok, n: a.n || d.qs.length, result: tvrResult_(sc, P) }; })); }
/** Leaderboard rows for the app (newest first). First call also backfills stored daily results (idempotent). */
function triviaResults() { var P = PropertiesService.getScriptProperties();
  if (P.getProperty('TVR_BACKFILL') !== '1') { var all = P.getProperties(); Object.keys(all).filter(function (k) { return k.indexOf('TRIVIA_D_') === 0; }).sort().forEach(function (k) { try { tvrDaily_(JSON.parse(all[k])); } catch (e) {} }); P.setProperty('TVR_BACKFILL', '1'); }
  var sh = tvrSheet_(), n = sh.getLastRow(); if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 8).getDisplayValues().map(function (r) { return { id: r[0], d: r[1], m: r[2], p: r[3], sc: +r[4] || 0, ok: r[5] === '' ? null : +r[5], n: +r[6] || 0, res: r[7] }; }).reverse(); }

/* ----- Daily trivia day = unlocks 9pm Sydney: the "day" is the date of the most recent 21:00 ----- */
function tvUnlockInfo() { var now = new Date(), day = Utilities.formatDate(new Date(now.getTime() - 21 * 3600 * 1000), 'Australia/Sydney', 'yyyy-MM-dd');
  var hh = +Utilities.formatDate(now, 'Australia/Sydney', 'H'), mm = +Utilities.formatDate(now, 'Australia/Sydney', 'm'), ss = +Utilities.formatDate(now, 'Australia/Sydney', 's');
  var secsToNext = ((21 - hh + 24) % 24) * 3600 - mm * 60 - ss; if (secsToNext <= 0) secsToNext += 86400;
  return { day: day, next: now.getTime() + secsToNext * 1000, now: now.getTime() }; }
function installTriviaTrigger9pm() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyTriviaBuild') ScriptApp.deleteTrigger(t); }); ScriptApp.newTrigger('dailyTriviaBuild').timeBased().everyDays(1).atHour(21).nearMinute(0).inTimezone('Australia/Sydney').create(); }

/* ----- 'Moment' questions: real episode/film plot moments (TMDB overviews), names masked ----- */
function tvMoment_(p) { var I = tvImages_(p), mask = function (txt, names) { var s = String(txt || ''); names.forEach(function (n) { String(n || '').split(/\s+/).forEach(function (w) { if (w.length > 2) s = s.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), '▒▒▒'); }); }); return s; };
  var names = [baseShow_(p.r.title)].concat((I.cast || []).map(function (c) { return c[1]; })), sent = function (ov) { var S = String(ov || '').split(/(?<=[.!?])\s+/).filter(function (x) { return x.length > 40 && x.length < 220; }); return S[0] || ''; };
  if (p.tv) { var sn = Math.max(1, I.seasons || 1), s = 1 + Math.floor(Math.random() * sn), sd = tmdb_('tv/' + p.m.tmdb + '/season/' + s, {}) || {}, eps = (sd.episodes || []).filter(function (e) { return sent(e.overview); });
    if (!eps.length) return null; var e = eps[Math.floor(Math.random() * eps.length)]; return { quote: mask(sent(e.overview), names), more: 'S' + s + 'E' + e.episode_number + ' · ' + e.name }; }
  var d = tmdb_('movie/' + p.m.tmdb, {}) || {}, S = String(d.overview || '').split(/(?<=[.!?])\s+/).filter(function (x) { return x.length > 40 && x.length < 220; }); if (!S.length) return null;
  return { quote: mask(S[Math.floor(Math.random() * Math.min(2, S.length))], names), more: d.title || '' }; }

/** Verified quotes for the ad-break minigame: titles someone has watched/is watching, Wikiquote lines (sections + speaker checked by tvQuotes_). Cached 6h. */
function adQuotes() { var C = CacheService.getScriptCache(), h = C.get('adq1'); if (h) return JSON.parse(h); var out = [], t0 = Date.now();
  tvShuf_(tvPool_()).slice(0, 14).forEach(function (p) { if (Date.now() - t0 > 20000) return; tvQuotes_(p.r.title).slice(0, 3).forEach(function (q) { out.push({ q: q.q, who: q.who, t: p.r.title }); }); });
  try { C.put('adq1', JSON.stringify(out), 21600); } catch (e) {} return out; }
