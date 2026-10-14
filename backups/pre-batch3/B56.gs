/* ===== Batch 2 (r56): per-person "not for me" (Logged), Mood Pick history, TMDB details for the swipe deck ===== */
function nfmGet_(p) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('NFM_' + p) || '[]'); } catch (e) { return []; } }
function getNotForMe() { return { sam: nfmGet_('sam'), lewy: nfmGet_('lewy') }; }
/** Hide/unhide a title from ONE person's Logged list. Never touches the sheet. */
function setNotForMe(title, on, who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); title = String(title || '').trim().slice(0, 180); if (!title) throw new Error('title?');
  var L = LockService.getScriptLock(); L.waitLock(10000);
  try { var a = nfmGet_(who).filter(function (t) { return t !== title; }); if (on) a.push(title); a = a.slice(-300); var s = JSON.stringify(a); while (s.length > 8500) { a.shift(); s = JSON.stringify(a); }
    PropertiesService.getScriptProperties().setProperty('NFM_' + who, s); return getNotForMe(); } finally { L.releaseLock(); } }

function moodGet_(p) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('MOODH_' + p) || '[]'); } catch (e) { return []; } }
function getMoodHist(who) { return moodGet_(who === 'lewy' ? 'lewy' : 'sam'); }
/** Append one Mood Pick result (never overwrites earlier ones; oldest dropped only past the size cap). e = {id, at, mood, who, picks:[{t, y, fresh}]} */
function addMoodHist(e, who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); e = e || {}; var L = LockService.getScriptLock(); L.waitLock(10000);
  try { var a = moodGet_(who), id = String(e.id || '').replace(/[^\w-]/g, '').slice(0, 30); if (!id) throw new Error('id?'); if (a.some(function (x) { return x.id === id; })) return a;
    a.unshift({ id: id, at: Number(e.at) || Date.now(), mood: String(e.mood || '').slice(0, 40), w: String(e.who || '').slice(0, 10), picks: (e.picks || []).slice(0, 6).map(function (x) { return { t: String(x.t || '').slice(0, 120), y: String(x.y || '').slice(0, 4), f: x.f ? 1 : 0 }; }) });
    var s = JSON.stringify(a); while (s.length > 8500 && a.length > 1) { a.pop(); s = JSON.stringify(a); } PropertiesService.getScriptProperties().setProperty('MOODH_' + who, s); return a; } finally { L.releaseLock(); } }
function clearMoodHist(who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); PropertiesService.getScriptProperties().deleteProperty('MOODH_' + who); return []; }

/** Full details for a swipe-deck card: synopsis, release date, genres, runtime/seasons, rating, trailer key. Cached 1 day. */
function tmdbDetails(id, tv, title) { var C = CacheService.getScriptCache(), kind = tv ? 'tv' : 'movie';
  if (!id && title) { var s = tmdb_('search/' + kind, { query: String(title).replace(/\s*\((S\d+|\d{4})\)\s*$/i, '') }) || {}; id = ((s.results || [])[0] || {}).id; } if (!id) return null;
  var ck = 'tdt1|' + kind + id, h = C.get(ck); if (h) return JSON.parse(h);
  var d = tmdb_(kind + '/' + id, { append_to_response: 'videos', language: 'en-AU' }) || {}; if (!d.id) return null;
  var v = ((d.videos || {}).results || []).filter(function (x) { return x.site === 'YouTube' && /Trailer|Teaser/.test(x.type); }).sort(function (a, b) { return (b.official ? 1 : 0) - (a.official ? 1 : 0) || (a.type === 'Trailer' ? -1 : 1); })[0];
  var o = { id: d.id, tv: !!tv, title: d.title || d.name, ov: d.overview || '', date: d.release_date || d.first_air_date || '', genres: (d.genres || []).map(function (g) { return g.name; }), rt: d.runtime || ((d.episode_run_time || [])[0]) || 0, seasons: d.number_of_seasons || 0, vote: Math.round((d.vote_average || 0) * 10) / 10, tag: d.tagline || '', poster: d.poster_path ? 'https://image.tmdb.org/t/p/w342' + d.poster_path : '', yt: v ? v.key : '' };
  try { C.put(ck, JSON.stringify(o), 86400); } catch (e) {} return o; }

/* ===== r56 hotfix: trivia song questions play the RIGHT song =====
   Root cause: the clip was a random pick from the first 6 tracks of any matching OST album, which on iTunes are often dialogue snippets / logos / short cues
   (sounding like a random sound effect). Now: a song Sam or Lewy picked for that title (verified iTunes preview) wins; otherwise a full-length (>70 s) non-dialogue OST track. */
function tvSongClip_(title) { var base = baseShow_(title), cand = [];
  try { var T = JSON.parse(PropertiesService.getScriptProperties().getProperty(themeKey_(title)) || '{}'); ['sam', 'lewy'].forEach(function (p) { if (T[p]) cand.push(T[p]); }); } catch (e) {}
  try { var L = getThemes(base); ['sam', 'lewy'].forEach(function (p) { (L[p] || []).forEach(function (c) { cand.push(c); }); }); } catch (e) {}
  for (var i = 0; i < cand.length; i++) { var c = cand[i]; if (!c || !c.n) continue;
    if (/^https:\/\/audio-ssl\.itunes\.apple\.com\//.test(c.pv || '')) return { url: c.pv, n: c.n, a: c.a || '' };
    var o = ostPreview(base, c.n, c.a || ''); if (o && o.url) return o; }
  return ostPreview(base); }
/** Re-resolve a stored sound question's clip from its answer title (cached 6 h), so sets built before the fix also play the right song. */
function tvFixSound_(q) { if (!q || !q.audio || !q.opts || q.a == null) return q; try { var t = q.t || q.opts[q.a], o = t && tvSongClip_(t); if (o && o.url && tvClipOk_(o.url)) { q = JSON.parse(JSON.stringify(q)); q.audio = o.url; q.more = '♪ ' + o.n + (o.a ? ' — ' + o.a : ''); } } catch (e) {} return q; }

/* ===== r56: per-episode runtimes (TMDB) for correct watch-time stats. items = [{t: title, id: tmdb id or 0}]. Returns {title: {r:[min|0,...] aired episodes in order, avg}}.
   Season from "(S2)"; "(2026)" picks the season that aired that year; otherwise all seasons in order. Cached in Script Properties (EPRT_*), refreshed after 3 days for running seasons. */
function epRuntimes(items) { var P = PropertiesService.getScriptProperties(), out = {}, t0 = Date.now(), today = Utilities.formatDate(new Date(), 'Australia/Sydney', 'yyyy-MM-dd');
  (items || []).slice(0, 60).forEach(function (it) { var title = String(it && it.t || '').trim(); if (!title) return; var k = 'EPRT_' + posterKey_(title, 'e').slice(7), c = null; try { c = JSON.parse(P.getProperty(k) || 'null'); } catch (e) {}
    if (c && (c.done || Date.now() - c.at < 3 * 864e5)) { out[title] = { r: c.r, avg: c.avg }; return; } if (Date.now() - t0 > 20000) return;
    try { var sm = title.match(/\(S(\d+)\)\s*$/i), ym = title.match(/\((\d{4})\)\s*$/), base = baseShow_(title), id = Number(it.id) || 0;
      if (!id) { var s = tmdb_('search/tv', { query: base }) || {}; id = ((s.results || [])[0] || {}).id; } if (!id) return; var d = tmdb_('tv/' + id) || {}; if (!d.id) return;
      var ss = (d.seasons || []).filter(function (x) { return x.season_number > 0; }), sel = sm ? ss.filter(function (x) { return x.season_number === +sm[1]; }) : ym ? ss.filter(function (x) { return String(x.air_date || '').slice(0, 4) === ym[1]; }) : ss;
      if (ym && !sel.length) sel = ss.slice(-1); var r = [], open = false;
      sel.slice(0, 40).forEach(function (x) { var se = tmdb_('tv/' + id + '/season/' + x.season_number) || {}; (se.episodes || []).forEach(function (e) { if (e.air_date && e.air_date > today) { open = true; return; } if (!e.air_date) { open = true; return; } r.push(Math.max(0, Math.round(e.runtime || 0))); }); });
      var known = r.filter(Boolean), avg = known.length ? Math.round(known.reduce(function (a, b) { return a + b; }, 0) / known.length) : ((d.episode_run_time || [])[0] || 0);
      var o = { r: r.slice(0, 1200), avg: avg, at: Date.now(), done: !open && d.status !== 'Returning Series' || (!!sm && !open) }; var js = JSON.stringify(o); if (js.length < 8800) P.setProperty(k, js); out[title] = { r: o.r, avg: avg };
    } catch (e) {} });
  return out; }

/** Verify a preview URL really serves audio (HTTP 200/206 + audio-ish content type). Cached 6 h. */
function tvClipOk_(url) { if (!/^https:\/\//.test(url || '')) return false; var C = CacheService.getScriptCache(), k = 'clipok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, url)).slice(0, 22), h = C.get(k); if (h) return h === '1';
  var ok = false; try { var r = UrlFetchApp.fetch(url, { headers: { Range: 'bytes=0-1023' }, muteHttpExceptions: true, followRedirects: true }), c = r.getResponseCode(), H = r.getHeaders() || {}, t = String(H['Content-Type'] || H['content-type'] || ''); ok = (c === 200 || c === 206) && /audio|mp4|m4a|mpeg|octet/i.test(t); } catch (e) {}
  try { C.put(k, ok ? '1' : '0', 21600); } catch (e) {} return ok; }
/** Every sound question gets a verified clip (re-resolved if needed) and a non-audio stand-in (alt) the client swaps in if the clip can't preload. */
function tvAddAlts_(qs) { var spare = []; try { spare = triviaBuild_(8).filter(function (q) { return !q.audio; }); } catch (e) {}
  return (qs || []).map(function (q) { if (!q.audio) return q; if (!tvClipOk_(q.audio)) { var o = tvFixSound_(q); if (o.audio !== q.audio && tvClipOk_(o.audio)) q = o; else if (spare.length) return spare.shift(); else return q; } if (spare.length) q.alt = spare.shift(); return q; }); }
/* ----- Vote skip: live = both players must vote; daily = one vote (sent as pick -1). Skips are logged for review (TRIVIA_SKIPS). ----- */
function tvQid_(q) { return q.id || Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(q.kind || '') + '|' + q.q + '|' + (q.opts || []).join('|'))).slice(0, 12); }
function tvSkipLog_(q, mode, who, d) { try { var P = PropertiesService.getScriptProperties(), L = []; try { L = JSON.parse(P.getProperty('TRIVIA_SKIPS') || '[]'); } catch (e) {}
  L.unshift({ id: tvQid_(q), at: new Date().toISOString(), d: d || '', mode: mode, who: who, kind: q.kind || (q.audio ? 'sound' : q.quote ? 'quote' : q.img ? 'img' : ''), q: String(q.q || '').slice(0, 120), t: String(q.t || (q.opts || [])[q.a] || '').slice(0, 80), audio: q.audio ? String(q.audio).slice(-60) : '' });
  var s = JSON.stringify(L); while (s.length > 8500) { L.pop(); s = JSON.stringify(L); } P.setProperty('TRIVIA_SKIPS', s); } catch (e) {} }
function triviaSkips() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TRIVIA_SKIPS') || '[]'); } catch (e) { return []; } }
function triviaVoteSkip(code, who, i) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var L = LockService.getScriptLock(); L.waitLock(5000);
  try { var g = tvGet_(String(code)); if (!g || g.phase !== 'q' || g.i !== +i) return g ? tvView_(g, who) : { phase: 'gone' }; g.skip = g.skip || {}; g.skip[i] = g.skip[i] || {}; g.skip[i][who] = 1;
    if (g.skip[i].sam && g.skip[i].lewy) { g.skipped = g.skipped || {}; g.skipped[i] = 1; tvSkipLog_(g.qs[i], 'live', 'both', ''); } tvTick_(g); tvPut_(g); return tvView_(g, who); } finally { L.releaseLock(); } }
