/** Logged (Sam & Lewy's watchlist) — container-bound web app for tab 'Log'. Needs Meta.gs (metadata) in the same project. */
var SHEET_NAME = 'Log';
var COLS = { title:1, type:2, genres:3, suggestedBy:4, samWatched:5, lewyWatched:6, both:7,
  samRating:8, lewyRating:9, spesh:10, samComment:11, lewyComment:12 };
var EDITABLE = ['type','genres','suggestedBy','samWatched','lewyWatched','samRating','lewyRating','spesh','samComment','lewyComment'];
var ALLOWED = {
  type: ['Movie','TV Show','YouTube'],
  suggestedBy: ['Sam','Lewy','Other','Sam & Lewy'],
  samWatched: ['Yes','Not yet','As we speak',''],
  lewyWatched: ['Yes','Not yet','As we speak',''],
  spesh: ['Mandatory','Optional','No','']
};

function doGet(e) {
  if (e && e.parameter && e.parameter.api) return apiGet_(e);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Logged')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function sheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Tab "' + SHEET_NAME + '" not found');
  return sh;
}

/** Last row (1-based) whose title cell (col A) is non-empty; 1 if none. */
function lastTitleRow_(sh) {
  var n = sh.getLastRow();
  if (n < 2) return 1;
  var vals = sh.getRange(2, 1, n - 1, 1).getDisplayValues();
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]).trim() !== '') return i + 2;
  return 1;
}

function rowToObj_(r, rowNum) {
  return { row: rowNum, title: r[0], type: r[1], genres: r[2], suggestedBy: r[3], samWatched: r[4],
    lewyWatched: r[5], both: r[6], samRating: r[7], lewyRating: r[8], spesh: r[9],
    samComment: r[10], lewyComment: r[11] };
}

function getData() {
  var sh = sheet_();
  var last = lastTitleRow_(sh);
  var rows = [];
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, 12).getDisplayValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === '') continue;
      rows.push(rowToObj_(vals[i], i + 2));
    }
  }
  var posters = {}, props = {};
  try { props = PropertiesService.getScriptProperties().getProperties(); } catch (e) {}
  rows.forEach(function (r) { var d = props[dateKey_(r.title)]; if (d) try { r.dates = JSON.parse(d).d; } catch (e) {} });
  for (var pk in POSTERS) posters[pk] = POSTERS[pk];
  rows.forEach(function (r) { if (!posters[r.title]) { var u = POSTERS[r.title.trim()] || props[posterKey_(r.title, r.type)]; if (u) posters[r.title] = u; } });
  rows.forEach(function (r) { if (r.type === 'YouTube') { var ym = props[ytmKey_(r.title)]; if (ym) try { r.ytm = JSON.parse(ym); } catch (e) {} var yw = props[ytwKey_(r.title)]; if (yw) try { r.ytw = JSON.parse(yw); } catch (e) {} } var ep = props[epKey_(r.title)]; if (ep) try { r.ep = JSON.parse(ep); } catch (e) {} var th = props[themeKey_(r.title)]; if (th) try { r.theme = JSON.parse(th); } catch (e) {} var tl = props[themeLKey_(r.title)]; if (tl) try { r.themeL = JSON.parse(tl); } catch (e) {} });
  return { rows: rows, version: getVersion(), posters: posters, recent: getRecent_(), profiles: getProfiles_(), fetchedAt: new Date().toISOString() };
}

function clean_(key, v) {
  if (v === null || v === undefined) v = '';
  if (key === 'samRating' || key === 'lewyRating') {
    if (v === '') return '';
    var n = Number(v);
    if (!(n >= 1 && n <= 10)) throw new Error('Rating must be 1-10');
    return Math.round(n * 10) / 10;
  }
  v = String(v).slice(0, 2000);
  if (ALLOWED[key] && ALLOWED[key].indexOf(v) < 0) throw new Error('Invalid value for ' + key + ': ' + v);
  return v;
}

function readRow_(sh, row) {
  var o = rowToObj_(sh.getRange(row, 1, 1, 12).getDisplayValues()[0], row), d = getDates_(o.title);
  if (d) o.dates = d;
  return o;
}

/* ===================== Start / completion dates (per person, Script Properties keyed by title) =====================
   DATE_<md5(title)> = {t: title, d: {samStart, samDone, lewyStart, lewyDone}} (yyyy-MM-dd, Sydney time).
   Written ONLY on watched-status transitions: -> 'As we speak' sets start (first time only); -> 'Yes' sets done
   (and start if missing); leaving 'Yes' clears done. Other edits never touch them. */
function dateKey_(title) { return 'DATE_' + posterKey_(String(title || '').trim(), 'd').slice(7); }
function getDates_(title) { try { var v = PropertiesService.getScriptProperties().getProperty(dateKey_(title)); return v ? JSON.parse(v).d : null; } catch (e) { return null; } }
function noteStatus_(title, person, oldV, newV) {
  oldV = String(oldV || ''); newV = String(newV || ''); title = String(title || '').trim();
  if (!title || oldV === newV || (person !== 'sam' && person !== 'lewy')) return;
  var d = getDates_(title) || {}, today = Utilities.formatDate(new Date(), 'Australia/Sydney', 'yyyy-MM-dd'), ch = false;
  if (newV === 'As we speak' && !d[person + 'Start']) { d[person + 'Start'] = today; ch = true; }
  if (newV === 'Yes') { d[person + 'Done'] = today; ch = true; }
  if (oldV === 'Yes' && newV !== 'Yes' && d[person + 'Done']) { delete d[person + 'Done']; ch = true; }
  if (!ch) return;
  var props = PropertiesService.getScriptProperties();
  if (Object.keys(d).length) props.setProperty(dateKey_(title), JSON.stringify({ t: title, d: d })); else props.deleteProperty(dateKey_(title));
}

/** Update only the changed cells. fields may include expectedTitle via 2nd arg check. */
function updateEntry(row, fields, expectedTitle) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    row = Number(row);
    if (!(row >= 2)) throw new Error('Bad row');
    var current = readRow_(sh, row);
    var exp = expectedTitle !== undefined ? expectedTitle : fields && fields.title;
    if (String(current.title).trim() !== String(exp).trim())
      throw new Error('Row moved: expected "' + exp + '" but found "' + current.title + '". Refresh and try again.');
    var changed = 0;
    EDITABLE.forEach(function (k) {
      if (!fields || !(k in fields)) return;
      var v = clean_(k, fields[k]);
      if (String(v) === String(current[k]) || (k.indexOf('Rating') > 0 && Number(v) === Number(current[k]) && current[k] !== '')) return;
      sh.getRange(row, COLS[k]).setValue(v); changed++;
      if (k === 'samWatched' || k === 'lewyWatched') noteStatus_(current.title, k.slice(0, -7), current[k], v);
    });
    if (!changed) return readRow_(sh, row); // no-op save: no version bump, no "recently logged" bump
    SpreadsheetApp.flush();
    bumpVersion_();
    touchRecent_(current.title);
    return readRow_(sh, row);
  } finally { lock.releaseLock(); }
}

function addEntry(fields) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var title = String((fields && fields.title) || '').trim();
    if (!title) throw new Error('Title required');
    var sh = sheet_();
    var last = lastTitleRow_(sh);
    var row = last + 1;
    if (row > sh.getMaxRows()) sh.insertRowAfter(last);
    sh.getRange(row, COLS.title).setValue(title);
    EDITABLE.forEach(function (k) {
      if (!(k in fields)) return;
      var v = clean_(k, fields[k]);
      if (v !== '') sh.getRange(row, COLS[k]).setValue(v);
      if ((k === 'samWatched' || k === 'lewyWatched') && v) noteStatus_(title, k.slice(0, -7), 'Not yet', v);
    });
    // Copy "Both watched?" formula (col G) from the row above (relative refs adjust).
    if (last >= 2) {
      var src = sh.getRange(last, COLS.both);
      if (src.getFormula()) src.copyTo(sh.getRange(row, COLS.both), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    }
    SpreadsheetApp.flush();
    bumpVersion_();
    var added = readRow_(sh, row);
    touchRecent_(title);
  } finally { lock.releaseLock(); }
  added.poster = resolvePoster_(added.title, added.type); // resolve art now (outside lock), persisted for all devices
  try {
    var mt = resolveMeta_(added.title, added.type); // synopsis/cast/facts/trailer, cached in Script Properties
    if (mt) {
      added.meta = mt;
      if (!String(added.genres || '').trim() && mt.genres && mt.genres.length) { // auto-fill genres (col C) from metadata
        var gl = LockService.getScriptLock(); gl.waitLock(20000);
        try { var sh2 = sheet_(); if (String(sh2.getRange(added.row, COLS.title).getDisplayValue()).trim() === String(added.title).trim()) { sh2.getRange(added.row, COLS.genres).setValue(mt.genres.join(', ')); added.genres = mt.genres.join(', '); SpreadsheetApp.flush(); bumpVersion_(); } }
        finally { gl.releaseLock(); }
      }
    }
  } catch (e) {}
  return added;
}

/** Delete one log row. Safety: the row must still hold expectedTitle (rows shift when others are added/removed). */
function deleteEntry(row, expectedTitle) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    row = Number(row);
    var exp = String(expectedTitle == null ? '' : expectedTitle).trim();
    if (!(row >= 2) || row > lastTitleRow_(sh)) throw new Error('Bad row');
    if (!exp) throw new Error('Title required to delete');
    var cur = String(sh.getRange(row, COLS.title).getDisplayValue()).trim();
    if (cur !== exp) throw new Error('Row moved: expected "' + exp + '" but found "' + cur + '". Refresh and try again.');
    sh.deleteRow(row);
    SpreadsheetApp.flush();
    bumpVersion_();
    try { PropertiesService.getScriptProperties().deleteProperty(dateKey_(exp)); } catch (e) {}
    dropRecent_(exp);
    return { deleted: true, row: row, title: exp };
  } finally { lock.releaseLock(); }
}

/* ===================== Recently logged (added / updated), newest first ===================== */
function getRecent_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('RECENT') || '[]'); } catch (e) { return []; }
}
function touchRecent_(title) {
  try {
    var t = String(title || '').trim(); if (!t) return;
    var L = getRecent_().filter(function (x) { return x && x.t !== t; });
    L.unshift({ t: t, at: Date.now() });
    PropertiesService.getScriptProperties().setProperty('RECENT', JSON.stringify(L.slice(0, 40)));
  } catch (e) {}
}
function dropRecent_(title) {
  try { var t = String(title || '').trim(); PropertiesService.getScriptProperties().setProperty('RECENT', JSON.stringify(getRecent_().filter(function (x) { return x && x.t !== t; }))); } catch (e) {}
}

/* ===================== Locker profiles (per person, synced across phones) ===================== */
var PEOPLE = ['sam', 'lewy'];
function getProfiles_() {
  var props = PropertiesService.getScriptProperties(), o = {};
  PEOPLE.forEach(function (k) { try { o[k] = JSON.parse(props.getProperty('PROFILE_' + k) || '{}'); } catch (e) { o[k] = {}; } });
  return o;
}
/** prof = {tv:[titles<=5], mv:[titles<=5], picks:[titles<=5], bg:'sceneId'}. Only these keys are stored. */
function saveProfile(person, prof) {
  person = String(person || '').toLowerCase();
  if (PEOPLE.indexOf(person) < 0) throw new Error('Unknown person');
  prof = prof || {};
  var list = function (a) { return (Array.isArray(a) ? a : []).map(function (t) { return String(t || '').trim().slice(0, 200); }).filter(Boolean).slice(0, 5); };
  var out = { tv: list(prof.tv), mv: list(prof.mv), picks: list(prof.picks), snd: list(prof.snd), yt: list(prof.yt), bg: String(prof.bg || '').slice(0, 220), wr: String(prof.wr || '').replace(/[^\w]/g, '').slice(0, 20) };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { PropertiesService.getScriptProperties().setProperty('PROFILE_' + person, JSON.stringify(out)); bumpVersion_(); }
  finally { lock.releaseLock(); }
  return out;
}

/* ===================== Direct streaming links (JustWatch AU offers, cached 6 h) ===================== */
var JW_Q_ = 'query S($q:String!,$country:Country!,$language:Language!,$first:Int!){popularTitles(country:$country,first:$first,filter:{searchQuery:$q}){edges{node{objectType content(country:$country,language:$language){title originalReleaseYear externalIds{tmdbId}} offers(country:$country,platform:WEB){monetizationType standardWebURL package{clearName technicalName}}}}}}';
function jwNorm_(t) { return String(t || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ''); }
/** [{n: provider name, t: technical name, u: direct title URL, k: 's' stream | 'r' rent/buy}] for AU. */
function getOffers(title, type, tmdbId, year) {
  var q = String(title || '').trim().replace(/\s*\((S\d+|Season \d+|\d{4})\)\s*$/i, '').replace(/\s+(S|Season )\d+$/i, '').trim();
  if (!q) return [];
  var ck = 'JW1_' + posterKey_(q, type).slice(7), cache = CacheService.getScriptCache(), hit = cache.get(ck);
  if (hit) return JSON.parse(hit);
  var L = [];
  try {
    var res = UrlFetchApp.fetch('https://apis.justwatch.com/graphql', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }, payload: JSON.stringify({ operationName: 'S', variables: { q: q, country: 'AU', language: 'en', first: 6 }, query: JW_Q_ }) });
    if (res.getResponseCode() === 200) {
      var d = JSON.parse(res.getContentText()), want = type === 'TV Show' ? 'SHOW' : 'MOVIE';
      var nodes = ((((d || {}).data || {}).popularTitles || {}).edges || []).map(function (e) { return e.node; }).filter(function (n) { return n && n.objectType === want && n.content; });
      var byId = tmdbId ? nodes.filter(function (n) { return String((n.content.externalIds || {}).tmdbId) === String(tmdbId); })[0] : null;
      var byName = nodes.filter(function (n) { return jwNorm_(n.content.title) === jwNorm_(q) && (!year || type === 'TV Show' || Math.abs((n.content.originalReleaseYear || 0) - year) <= 1); })[0];
      var node = byId || byName;
      if (node) {
        var seen = {};
        (node.offers || []).forEach(function (o) {
          var k = /FLATRATE|FREE|ADS/.test(o.monetizationType) ? 's' : /RENT|BUY/.test(o.monetizationType) ? 'r' : '';
          var n = o.package && o.package.clearName; if (!k || !n || !o.standardWebURL) return;
          var key = n + '|' + k; if (seen[key]) return; seen[key] = 1;
          L.push({ n: n, t: o.package.technicalName || '', u: o.standardWebURL, k: k });
        });
        L.sort(function (a, b) { return (a.k === 's' ? 0 : 1) - (b.k === 's' ? 0 : 1); });
        L = L.slice(0, 14);
      }
    }
  } catch (e) { L = []; }
  try { cache.put(ck, JSON.stringify(L), 21600); } catch (e) {}
  return L;
}

/* ===================== JSON API (for the assistant) ===================== */
function setApiKey() {
  var key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('API_KEY', key);
  Logger.log('API_KEY = ' + key);
  return key;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function keyOk_(k) {
  var real = PropertiesService.getScriptProperties().getProperty('API_KEY');
  return !!real && String(k || '') === real;
}
function apiGet_(e) {
  if (!keyOk_(e.parameter.key)) return json_({ ok: false, error: 'bad key' });
  if (e.parameter.api === 'version') return json_({ ok: true, version: getVersion() });
  if (e.parameter.api === 'list') {
    var d = getData(); d.ok = true; return json_(d);
  }
  return json_({ ok: false, error: 'unknown api' });
}
function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.rpc) return rpc_(b);
    if (!keyOk_(b.key)) return json_({ ok: false, error: 'bad key' });
    var f = b.fields || {};
    if (b.action === 'update') return json_({ ok: true, row: updateEntry(b.row, f, b.title) });
    if (b.action === 'add') { if (b.title && !f.title) f.title = b.title; return json_({ ok: true, row: addEntry(f) }); }
    if (b.action === 'delete') return json_({ ok: true, row: deleteEntry(b.row, b.title) });
    if (b.action === 'profile') return json_({ ok: true, profile: saveProfile(b.person, b.profile) });
    if (b.action === 'setDates') return json_({ ok: true, dates: setDates(b.title, b.dates) });
    if (b.action === 'list') { var d = getData(); d.ok = true; return json_(d); }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) { return json_({ ok: false, error: String(err.message || err) }); }
}

/** Manual date edit from the app (detail page date picker). d = {samStart, samDone, lewyStart, lewyDone}; '' or missing clears.
    Writes ONLY the Script Properties date store (never the sheet). Returns the saved dates. */
function setDates(title, d) {
  title = String(title || '').trim(); if (!title) throw new Error('no title');
  var out = {}, ok = /^\d{4}-\d{2}-\d{2}$/;
  ['samStart', 'samDone', 'lewyStart', 'lewyDone'].forEach(function (k) { var v = String((d || {})[k] || '').trim(); if (v) { if (!ok.test(v)) throw new Error('bad date ' + k); out[k] = v; } });
  var props = PropertiesService.getScriptProperties();
  if (Object.keys(out).length) props.setProperty(dateKey_(title), JSON.stringify({ t: title, d: out, m: 1 })); else props.deleteProperty(dateKey_(title));
  bumpVersion_();
  return out;
}

/* ===================== Sync version ===================== */
function bumpVersion_() {
  PropertiesService.getScriptProperties().setProperty('VERSION', String(Date.now()));
}
/** Cheap poll target: changes on every web-app/API write and every manual edit (via onEdit). */
function getVersion() {
  return PropertiesService.getScriptProperties().getProperty('VERSION') || '0';
}
/** Simple trigger: fires automatically on manual edits in the spreadsheet UI. */
function onEdit(e) {
  try {
    if (e && e.range && e.range.getSheet().getName() === SHEET_NAME) {
      var single = e.range.getNumRows() === 1 && e.range.getNumColumns() === 1;
      var same = single && String(e.value == null ? '' : e.value) === String(e.oldValue == null ? '' : e.oldValue);
      if (same) return; // identical value re-entered: nothing changed
      bumpVersion_();
      if (e.range.getRow() >= 2) {
        var t = e.range.getSheet().getRange(e.range.getRow(), COLS.title).getDisplayValue();
        touchRecent_(t);
        var c = e.range.getColumn();
        if (single && (c === COLS.samWatched || c === COLS.lewyWatched)) noteStatus_(t, c === COLS.samWatched ? 'sam' : 'lewy', e.oldValue, e.value);
      }
    }
  } catch (err) {}
}

/* ===================== Posters (real artwork) ===================== */
/* Lookup chain: embedded POSTERS -> Script Properties (POSTER_<hash>, permanent, shared by all devices)
   -> live: TMDB (if TMDB_KEY) -> TVmaze (TV) -> iTunes Search -> Wikipedia. Misses cached 6h only. */
function posterKey_(title, type) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(type || '') + '|' + String(title || '').trim().toLowerCase(), Utilities.Charset.UTF_8);
  return 'POSTER_' + d.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function fetchJson_(url) {
  try {
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'SamLewyWatchlist/1.0' } });
    if (r.getResponseCode() !== 200) return null;
    return JSON.parse(r.getContentText());
  } catch (e) { return null; }
}
function baseTitle_(t) {
  return String(t || '').trim().replace(/\s*\((S\d+|Season \d+|\d{4})\)\s*$/i, '').replace(/\s+S\d+$/i, '').trim();
}
/** Live lookup for one title. Returns URL or ''. Prefers portrait art. */
function lookupPoster_(title, type) {
  var q = baseTitle_(title), tv = type === 'TV Show', enc = encodeURIComponent(q), j, x;
  var tmdb = PropertiesService.getScriptProperties().getProperty('TMDB_KEY');
  if (tmdb) {
    j = fetchJson_('https://api.themoviedb.org/3/search/' + (tv ? 'tv' : 'movie') + '?api_key=' + encodeURIComponent(tmdb) + '&query=' + enc);
    x = j && j.results && j.results.filter(function (r) { return r.poster_path; })[0];
    if (x) return 'https://image.tmdb.org/t/p/w342' + x.poster_path;
  }
  var order = tv ? ['tvmaze', 'itunes', 'wiki'] : ['itunes', 'wiki', 'tvmaze'];
  for (var s = 0; s < order.length; s++) {
    if (order[s] === 'tvmaze') {
      j = fetchJson_('https://api.tvmaze.com/singlesearch/shows?q=' + enc);
      if (j && j.image) return j.image.medium || j.image.original;
    } else if (order[s] === 'itunes') {
      j = fetchJson_('https://itunes.apple.com/search?country=AU&limit=5&entity=' + (tv ? 'tvSeason' : 'movie') + '&term=' + enc);
      x = j && j.results && j.results.filter(function (r) { return r.artworkUrl100; })[0];
      if (x) return x.artworkUrl100.replace(/\/\d+x\d+bb\./, '/600x600bb.');
    } else {
      var cands = [q + (tv ? ' (TV series)' : ' (film)'), q];
      for (var c = 0; c < cands.length; c++) {
        j = fetchJson_('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(cands[c].replace(/ /g, '_')));
        if (!j || j.type === 'disambiguation') continue;
        var o = j.originalimage || j.thumbnail;
        if (o && o.source && (!o.width || o.height >= o.width)) return (j.thumbnail && j.thumbnail.source) || o.source; // portrait only
      }
    }
  }
  return '';
}
/** Resolve + persist one poster. Safe to call anywhere; never throws. */
function resolvePoster_(title, type) {
  try {
    title = String(title || '');
    if (POSTERS[title] || POSTERS[title.trim()]) return POSTERS[title] || POSTERS[title.trim()];
    var props = PropertiesService.getScriptProperties(), key = posterKey_(title, type);
    var have = props.getProperty(key);
    if (have) return have;
    var cache = CacheService.getScriptCache();
    if (cache.get('miss_' + key)) return '';
    var url = lookupPoster_(title, type);
    if (url) props.setProperty(key, url); else cache.put('miss_' + key, '1', 21600);
    return url;
  } catch (e) { return ''; }
}
/** Returns {title: url|''} for given [{title,type}]. Live lookups capped by time budget; rest returned on next call. */
function getPosters(items) {
  items = (items || []).slice(0, 60);
  var out = {}, t0 = Date.now(), props = {};
  try { props = PropertiesService.getScriptProperties().getProperties(); } catch (e) {}
  items.forEach(function (it) {
    var t = String(it.title || ''), k = posterKey_(t, it.type);
    if (POSTERS[t] || POSTERS[t.trim()]) out[t] = POSTERS[t] || POSTERS[t.trim()];
    else if (props[k]) out[t] = props[k];
    else if (Date.now() - t0 < 20000) out[t] = resolvePoster_(t, it.type);
  });
  return out;
}

/* ===================== Embedded poster map (built 2026-10-13: Wikipedia + TVmaze) ===================== */
/** title -> poster URL. Titles not listed (new adds) fall back to resolvePoster_. */
var POSTERS = {
"A Knight of the Seven Kingdoms": "https://static.tvmaze.com/uploads/images/medium_portrait/608/1521912.jpg",
"Apex": "https://upload.wikimedia.org/wikipedia/en/0/0d/Apex_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Apollo 11": "https://upload.wikimedia.org/wikipedia/en/2/29/Apollo_11_%282019_film%29.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Apollo 13": "https://upload.wikimedia.org/wikipedia/en/9/9e/Apollo_thirteen_movie.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Baby Teeth": "https://upload.wikimedia.org/wikipedia/en/e/e5/Babyteeth_%28film%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Berserk": "https://static.tvmaze.com/uploads/images/medium_portrait/396/991619.jpg",
"Bodies Bodies Bodies": "https://upload.wikimedia.org/wikipedia/en/7/7f/Bodies_Bodies_Bodies_%28poster%29.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Breaking Bad (S1)": "https://upload.wikimedia.org/wikipedia/en/6/61/BreakingBadS1DVD.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Breaking Bad (S2)": "https://upload.wikimedia.org/wikipedia/en/e/e0/BreakingBadS2DVD.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Breaking Bad (S3)": "https://upload.wikimedia.org/wikipedia/en/8/87/Breaking_Bad_season_3_DVD.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Breaking Bad (S4)": "https://upload.wikimedia.org/wikipedia/en/d/d9/Breaking_Bad_season_4_DVD.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Breaking Bad (S5)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253519.jpg",
"Bring Her Back": "https://upload.wikimedia.org/wikipedia/en/f/fd/Bring_Her_Back_film_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Bumblebee": "https://upload.wikimedia.org/wikipedia/en/7/77/Bumblebee_%28film%29_poster.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Captain Phillips": "https://upload.wikimedia.org/wikipedia/en/a/a8/Captain_Phillips_Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Chainsaw Man Reze Arc Movie": "https://upload.wikimedia.org/wikipedia/en/9/95/Chainsaw_Man_Reze_Arc_movie_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Chernobyl": "https://upload.wikimedia.org/wikipedia/en/a/a7/Chernobyl_2019_Miniseries.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Clarkson's Farm (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/628/1571785.jpg",
"Clarkson's Farm (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/628/1571785.jpg",
"Clarkson's Farm (S3)": "https://static.tvmaze.com/uploads/images/medium_portrait/628/1571785.jpg",
"Clarkson's Farm (S4)": "https://static.tvmaze.com/uploads/images/medium_portrait/628/1571785.jpg",
"Clarkson's Farm (S5)": "https://static.tvmaze.com/uploads/images/medium_portrait/628/1571785.jpg",
"Django Unchained": "https://upload.wikimedia.org/wikipedia/en/8/8b/Django_Unchained_Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Drag Race - Canada All Stars (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/528/1320535.jpg",
"Drag Race - Down Under (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/537/1344954.jpg",
"Drag Race - Down Under VS The World (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/629/1574681.jpg",
"Dungeons and Dragons": "https://upload.wikimedia.org/wikipedia/en/0/03/Theatrical_poster_for_Dungeons_and_Dragons%2C_Honor_Among_Thieves.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"East Bound & Down (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/6/17326.jpg",
"East Bound & Down (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/6/17326.jpg",
"East Bound & Down (S3)": "https://static.tvmaze.com/uploads/images/medium_portrait/6/17326.jpg",
"East Bound & Down (S4)": "https://static.tvmaze.com/uploads/images/medium_portrait/6/17326.jpg",
"Fairy Tail": "https://upload.wikimedia.org/wikipedia/en/e/e1/FairyTail-Volume_1_Cover.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Fast and Furious - Five": "https://upload.wikimedia.org/wikipedia/en/0/0c/Fast_Five_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Fast and Furious - Tokyo Drift": "https://upload.wikimedia.org/wikipedia/en/4/4f/Poster_-_Fast_and_Furious_Tokyo_Drift.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Flight": "https://upload.wikimedia.org/wikipedia/en/0/0e/Flight_film_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Flying High": "https://upload.wikimedia.org/wikipedia/en/2/21/Airplane%21_%281980_film%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S1)": "https://upload.wikimedia.org/wikipedia/en/e/e8/Game_of_Thrones_Season_1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S2)": "https://upload.wikimedia.org/wikipedia/en/c/c2/Game_of_Thrones_Season_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S3)": "https://upload.wikimedia.org/wikipedia/en/1/1d/Game_of_Thrones_Season_3.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S4)": "https://upload.wikimedia.org/wikipedia/en/8/80/Game_of_Thrones_Season_4.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S5)": "https://upload.wikimedia.org/wikipedia/en/5/59/Game_of_Thrones_Season_5.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S6)": "https://upload.wikimedia.org/wikipedia/en/d/d1/Game_of_Thrones_Season_6.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S7)": "https://upload.wikimedia.org/wikipedia/en/9/92/Game_of_Thrones_Season_7.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Game of Thrones (S8)": "https://upload.wikimedia.org/wikipedia/en/e/e0/Game_of_Thrones_Season_8.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Goat Story": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Kozi_pribeh.jpg/330px-Kozi_pribeh.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
"Gravity": "https://upload.wikimedia.org/wikipedia/en/f/f6/Gravity_Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Heretic": "https://upload.wikimedia.org/wikipedia/en/c/cb/Heretic_film_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"House of the Dragon (S1)": "https://upload.wikimedia.org/wikipedia/en/d/df/House_of_the_Dragon_season_1.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"House of the Dragon (S2)": "https://upload.wikimedia.org/wikipedia/en/3/3d/House_of_the_Dragon_season_2.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"House of the Dragon (S3)": "https://upload.wikimedia.org/wikipedia/en/f/f7/House_of_the_Dragon_season_3.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Inception": "https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Infinity Pool": "https://upload.wikimedia.org/wikipedia/en/e/eb/Infinity_Pool_poster2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Inglorious Basterds": "https://upload.wikimedia.org/wikipedia/en/c/c3/Inglourious_Basterds_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Interstellar": "https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Ja'mie Private School Girl": "https://static.tvmaze.com/uploads/images/medium_portrait/7/18361.jpg",
"Life of Brian": "https://upload.wikimedia.org/wikipedia/en/1/18/Lifeofbrianfilmposter.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Love on the Spectrum (S4)": "https://upload.wikimedia.org/wikipedia/en/d/db/Love_on_the_Spectrum.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"M3GAN": "https://upload.wikimedia.org/wikipedia/en/0/03/M3GAN_Poster.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"MAFS (2026)": "https://static.tvmaze.com/uploads/images/medium_portrait/611/1529368.jpg",
"Making a Murderer": "https://static.tvmaze.com/uploads/images/medium_portrait/46/116051.jpg",
"Mamma Mia": "https://upload.wikimedia.org/wikipedia/en/9/95/Mamma_Mia_%282008%29_US_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Manchester by the Sea": "https://upload.wikimedia.org/wikipedia/en/d/de/Manchester_by_the_Sea.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Mindhunter (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253490.jpg",
"Mindhunter (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253490.jpg",
"Moonrise Kingdom": "https://upload.wikimedia.org/wikipedia/en/4/4f/Moonrise_Kingdom_FilmPoster.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Mr Inbetween (S1)": "https://upload.wikimedia.org/wikipedia/en/e/ea/MrInbetweenSeason2Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Mr Inbetween (S2)": "https://upload.wikimedia.org/wikipedia/en/e/ea/MrInbetweenSeason2Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Mr Inbetween (S3)": "https://upload.wikimedia.org/wikipedia/en/e/ea/MrInbetweenSeason2Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Mr Robot": "https://static.tvmaze.com/uploads/images/medium_portrait/211/528026.jpg",
"Mysterious Skin": "https://upload.wikimedia.org/wikipedia/en/b/b8/Mysterious_skin.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Obsession": "https://upload.wikimedia.org/wikipedia/en/0/05/Obsession_theatrical_poster.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Once Upon A Time In Hollywood": "https://upload.wikimedia.org/wikipedia/en/a/a6/Once_Upon_a_Time_in_Hollywood_poster.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Peaky Blinders": "https://static.tvmaze.com/uploads/images/medium_portrait/48/122213.jpg",
"Perfect Days": "https://upload.wikimedia.org/wikipedia/en/c/c9/Perfect_Days_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Picnic at Hanging Rock": "https://upload.wikimedia.org/wikipedia/en/2/24/Picnicathangingrock1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Pillion": "https://upload.wikimedia.org/wikipedia/en/9/9f/Pillion_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Pineapple Express": "https://upload.wikimedia.org/wikipedia/en/c/ca/Pineapple_Express_Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Project Hail Mary": "https://upload.wikimedia.org/wikipedia/en/3/3b/Project_Hail_Mary_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Push": "https://upload.wikimedia.org/wikipedia/en/4/42/Pushposter08.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Road Train": "https://upload.wikimedia.org/wikipedia/en/a/a5/Road_Train.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Saltburn": "https://upload.wikimedia.org/wikipedia/en/5/52/Saltburn_Film_Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Sausage Party": "https://upload.wikimedia.org/wikipedia/en/f/f7/Sausage_Party_logo.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Se7en": "https://upload.wikimedia.org/wikipedia/en/6/68/Seven_%28movie%29_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Severance": "https://static.tvmaze.com/uploads/images/medium_portrait/548/1371406.jpg",
"Shrek": "https://upload.wikimedia.org/wikipedia/en/7/7b/Shrek_%282001_animated_feature_film%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Shrek 2": "https://upload.wikimedia.org/wikipedia/en/b/b9/Shrek_2_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Shrek 3": "https://upload.wikimedia.org/wikipedia/en/2/22/Shrek_the_Third_%282007_animated_feature_film%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Shutter Island": "https://upload.wikimedia.org/wikipedia/en/7/76/Shutterislandposter.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Sting": "https://upload.wikimedia.org/wikipedia/en/c/c6/Sting2024Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Succession (S1)": "https://upload.wikimedia.org/wikipedia/en/3/3f/Succession_season_1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Succession (S2)": "https://upload.wikimedia.org/wikipedia/en/a/a4/Succession_season_2.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Summer Heights High": "https://static.tvmaze.com/uploads/images/medium_portrait/7/18400.jpg",
"The Equaliser": "https://upload.wikimedia.org/wikipedia/en/8/81/The_Equalizer_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"The Fall of the House of Usher": "https://upload.wikimedia.org/wikipedia/en/4/4e/Netflix_Fall_of_House_of_Usher_series.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"The Haunting of Hill House": "https://static.tvmaze.com/uploads/images/medium_portrait/498/1246083.jpg",
"The Other Guys": "https://upload.wikimedia.org/wikipedia/en/6/6b/Other_guys_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"The Phoneician Scheme": "https://upload.wikimedia.org/wikipedia/en/2/2e/The_Phoenician_Scheme_theatrical_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"The Righteous Gemstones (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/560/1401883.jpg",
"The Righteous Gemstones (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/560/1401883.jpg",
"The Righteous Gemstones (S3)": "https://static.tvmaze.com/uploads/images/medium_portrait/560/1401883.jpg",
"The Righteous Gemstones (S4)": "https://static.tvmaze.com/uploads/images/medium_portrait/560/1401883.jpg",
"The Ritual": "https://upload.wikimedia.org/wikipedia/en/f/ff/The_Ritual_UK_poster.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"The Summit of the Gods": "https://upload.wikimedia.org/wikipedia/en/e/e3/The_Summit_of_the_Gods_film_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Toy Story 5": "https://upload.wikimedia.org/wikipedia/en/0/08/Toy_Story_5_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Train Dreams": "https://upload.wikimedia.org/wikipedia/en/5/58/Train_Dreams_poster.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Transformers": "https://upload.wikimedia.org/wikipedia/en/6/66/Transformers07.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Transformers: Age of Extinction": "https://upload.wikimedia.org/wikipedia/en/0/0f/Transformers_Age_of_Extinction_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Transformers: Dark of the Moon": "https://upload.wikimedia.org/wikipedia/en/b/bf/Transformers_dark_of_the_moon_ver5.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Transformers: Revenge of the Fallen": "https://upload.wikimedia.org/wikipedia/en/c/cb/TF2SteelPoster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Transformers: Rise of the Beasts": "https://upload.wikimedia.org/wikipedia/en/1/1c/Transformers-_Rise_of_the_Beasts.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Transformers: The Last Knight": "https://upload.wikimedia.org/wikipedia/en/2/26/Transformers_The_Last_Knight_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Triangle of Sadness": "https://upload.wikimedia.org/wikipedia/en/2/2d/TriangleOfSadness2022Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Tropic Thunder": "https://upload.wikimedia.org/wikipedia/en/d/d6/Tropic_thunder_ver3.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Twinless": "https://upload.wikimedia.org/wikipedia/en/7/77/Twinless_film_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Vinland Saga": "https://upload.wikimedia.org/wikipedia/en/8/8c/Vinland_Saga_key_visual.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Whiplash": "https://upload.wikimedia.org/wikipedia/en/0/01/Whiplash_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"White Lotus (S1)": "https://upload.wikimedia.org/wikipedia/en/1/1e/The_White_Lotus_Season_1.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"White Lotus (S2)": "https://upload.wikimedia.org/wikipedia/en/1/12/The_White_Lotus_Season_2.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"White Lotus (S3)": "https://upload.wikimedia.org/wikipedia/en/d/d9/The_White_Lotus_season_3_teaser.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Wicker": "https://upload.wikimedia.org/wikipedia/en/a/a3/Wicker_poster.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Wolf Creek": "https://upload.wikimedia.org/wikipedia/en/e/eb/Wolfcreek.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"You Don't Know Me": "https://static.tvmaze.com/uploads/images/medium_portrait/377/942700.jpg",
"Your Name": "https://upload.wikimedia.org/wikipedia/en/0/0b/Your_Name_poster.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Andor (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/564/1411766.jpg",
"Andor (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/564/1411766.jpg",
"1 Star Wars: The Phantom Menace (I)": "https://upload.wikimedia.org/wikipedia/en/4/40/Star_Wars_Phantom_Menace_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"2 Star Wars: Attack of the Clones (II)": "https://upload.wikimedia.org/wikipedia/en/3/32/Star_Wars_-_Episode_II_Attack_of_the_Clones_%28movie_poster%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"3 Star Wars: Revenge of the Sith (III)": "https://upload.wikimedia.org/wikipedia/en/9/93/Star_Wars_Episode_III_Revenge_of_the_Sith_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"4 Star Wars: Rogue One": "https://upload.wikimedia.org/wikipedia/en/d/d4/Rogue_One%2C_A_Star_Wars_Story_poster.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"5 Star Wars: A New Hope (IV)": "https://upload.wikimedia.org/wikipedia/en/8/87/StarWarsMoviePoster1977.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"6 Star Wars: The Empire Strikes Back (V)": "https://upload.wikimedia.org/wikipedia/en/3/3f/The_Empire_Strikes_Back_%281980_film%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"7 Star Wars: Return of the Jedi (VI)": "https://upload.wikimedia.org/wikipedia/en/b/b2/ReturnOfTheJediPoster1983.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"8 Star Wars: Solo": "https://upload.wikimedia.org/wikipedia/en/5/54/Solo_A_Star_Wars_Story_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"9 Star Wars: The Force Awakens (VII)": "https://upload.wikimedia.org/wikipedia/en/a/a2/Star_Wars_The_Force_Awakens_Theatrical_Poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"10 Star Wars: The Last Jedi (VIII)": "https://upload.wikimedia.org/wikipedia/en/7/7f/Star_Wars_The_Last_Jedi.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"11 Star Wars: The Rise of Skywalker (IX)": "https://upload.wikimedia.org/wikipedia/en/a/af/Star_Wars_The_Rise_of_Skywalker_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Bring Her Back ": "https://upload.wikimedia.org/wikipedia/en/f/fd/Bring_Her_Back_film_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"El Camino": "https://upload.wikimedia.org/wikipedia/en/4/4e/El_camino_bb_film_poster.jpg",
"The Odyssey": "https://upload.wikimedia.org/wikipedia/en/9/90/The_Odyssey_%282026_film%29_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Shrek Forever After": "https://upload.wikimedia.org/wikipedia/en/7/70/Shrek_Forever_After_%282010_animated_feature_film%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"Possessor": "https://upload.wikimedia.org/wikipedia/en/e/ee/Possessor_%28film%29_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"The Inbetweeners (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/6/16301.jpg",
"The Inbetweeners (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/6/16301.jpg",
"The Inbetweeners (S3)": "https://static.tvmaze.com/uploads/images/medium_portrait/6/16301.jpg",
"Sully": "https://upload.wikimedia.org/wikipedia/en/8/82/Sully_xxlg.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
"The Inbetweeners Movie": "https://upload.wikimedia.org/wikipedia/en/e/ea/The_Inbetweeners_Movie.jpg",
"The Inbetweeners 2": "https://upload.wikimedia.org/wikipedia/en/0/0f/Inbetweeners_2_Movie_Poster.jpg",
"Better Call Saul (S1)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253515.jpg",
"Better Call Saul (S2)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253515.jpg",
"Better Call Saul (S3)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253515.jpg",
"Better Call Saul (S4)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253515.jpg",
"Better Call Saul (S5)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253515.jpg",
"Better Call Saul (S6)": "https://static.tvmaze.com/uploads/images/medium_portrait/501/1253515.jpg",
"102 minutes inside the Twin Towers": "https://i.ytimg.com/vi/AA8kBP2L3J8/hqdefault.jpg"
};

/* =====================================================================================================
   r19: JSON RPC for the GitHub Pages frontend (isolaow.github.io/logged/app/)
   Auth: APP_TOKEN Script Property (low privilege: only the whitelisted app functions below, never the
   sheet directly, never secrets). Run setAppToken() once in the editor, copy the logged token into each
   phone once (stored in that phone's localStorage only). The older API_KEY endpoints keep working.
   Transport: fetch POST with Content-Type text/plain (CORS simple request) -> ContentService JSON.
   ===================================================================================================== */
var RPC_FNS_ = { adQuotes: 1, setThemes: 1, getThemes: 1, songVideo: 1, triviaResults: 1, tvUnlockInfo: 1, tmdbProfile: 1, trailerMatch: 1, ostAlbum: 1, spPlay: 1, spCtl: 1, spNow: 1, tmdbFresh: 1, getInterest: 1, setInterest: 1, connStatus: 1, connBegin: 1, connFinish: 1, ytImportData: 1, connDisconnect: 1, ostPreview: 1, getData: 1, getVersion: 1, getAllMeta: 1, getMeta: 1, getTrailer: 1, getOffers: 1, getPosters: 1, searchTitles: 1, tmdbSeasons: 1,
  updateEntry: 1, addEntry: 1, addFromTmdb: 1, deleteEntry: 1, saveProfile: 1, setDates: 1, setEpisode: 1, setEpRating: 1, getSoundtrack: 1, findSongVideo: 1, setTheme: 1, spotifyStatus: 1, spotifySaveToken: 1, spotifyDisconnect: 1, getSpotify: 1, ytSearch: 1, addYouTube: 1, ytWatched: 1, ytUploads: 1, ytFeed: 1, triviaNew: 1, triviaOpen: 1, triviaJoin: 1, triviaState: 1, triviaAnswer: 1, triviaDaily: 1, triviaDailyAnswer: 1, triviaStats: 1, setTriviaPush: 1, getTriviaPush: 1, triviaDays: 1, triviaBoard: 1, getAch: 1, saveAch: 1, ytAutoLog: 1, ytInfo: 1, ytComments: 1, tmdbMood: 1, ytHist: 1, ytHistPut: 1, ytHistDel: 1, ytLiveChat: 1, spotifySearch: 1, ntfyLog: 1, appConfig: 1, getAlerts: 1, readAlerts: 1, notifyInfo: 1 };
var RPC_WRITES_ = { updateEntry: 1, addEntry: 1, addFromTmdb: 1, addYouTube: 1, deleteEntry: 0 };
function setAppToken() {
  var t = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
  PropertiesService.getScriptProperties().setProperty('APP_TOKEN', t);
  Logger.log('APP_TOKEN (type this into the app on each phone once) = ' + t);
}
function tokenOk_(t) { var real = PropertiesService.getScriptProperties().getProperty('APP_TOKEN'); return !!real && String(t || '') === real; }
function rpc_(b) {
  var admin = !!b.key && keyOk_(b.key);
  if (b.fn === 'diag_') { if (!admin) return json_({ ok: false, error: 'bad key' }); return json_({ ok: true, data: diag_() }); }
  if (!admin && !tokenOk_(b.token)) return json_({ ok: false, error: 'bad token' });
  var fn = String(b.fn || ''), who = b.who === 'sam' || b.who === 'lewy' ? b.who : '';
  if (!RPC_FNS_[fn] && !((fn === 'saveRecording' || fn === 'getRecording') && typeof recFns_ === 'function')) return json_({ ok: false, error: 'unknown fn' });
  var F = { adQuotes: adQuotes, setThemes: setThemes, getThemes: getThemes, songVideo: songVideo, triviaResults: triviaResults, tvUnlockInfo: tvUnlockInfo, tmdbProfile: tmdbProfile, trailerMatch: trailerMatch, ostAlbum: ostAlbum, spPlay: spPlay, spCtl: spCtl, spNow: spNow, tmdbFresh: tmdbFresh, getInterest: getInterest, setInterest: setInterest, connStatus: connStatus, connBegin: connBegin, connFinish: connFinish, ytImportData: ytImportData, connDisconnect: connDisconnect, ostPreview: ostPreview, getData: getData, getVersion: getVersion, getAllMeta: getAllMeta, getMeta: getMeta, getTrailer: getTrailer, getOffers: getOffers, getPosters: getPosters, searchTitles: searchTitles, tmdbSeasons: tmdbSeasons, updateEntry: updateEntry, addEntry: addEntry, addFromTmdb: addFromTmdb, deleteEntry: deleteEntry, saveProfile: saveProfile, setDates: setDates, setEpisode: setEpisode, setEpRating: setEpRating, getSoundtrack: getSoundtrack, findSongVideo: findSongVideo, setTheme: setTheme, spotifyStatus: spotifyStatus, spotifySaveToken: spotifySaveToken, spotifyDisconnect: spotifyDisconnect, getSpotify: getSpotify, ytSearch: ytSearch, addYouTube: addYouTube, ytWatched: ytWatched, ytUploads: ytUploads, ytFeed: ytFeed, triviaNew: triviaNew, triviaOpen: triviaOpen, triviaJoin: triviaJoin, triviaState: triviaState, triviaAnswer: triviaAnswer, triviaDaily: triviaDaily, triviaDailyAnswer: triviaDailyAnswer, triviaStats: triviaStats, setTriviaPush: setTriviaPush, getTriviaPush: getTriviaPush, triviaDays: triviaDays, triviaBoard: triviaBoard, getAch: getAch, saveAch: saveAch, ytAutoLog: ytAutoLog, ytInfo: ytInfo, ytComments: ytComments, tmdbMood: tmdbMood, ytHist: ytHist, ytHistPut: ytHistPut, ytHistDel: ytHistDel, ytLiveChat: ytLiveChat, spotifySearch: spotifySearch, ntfyLog: ntfyLog, appConfig: appConfig, getAlerts: getAlerts, readAlerts: readAlerts, notifyInfo: notifyInfo };
  if (typeof recFns_ === 'function') { var RF = recFns_(); F.saveRecording = RF.save; F.getRecording = RF.get; }
  if (typeof F[fn] !== 'function') return json_({ ok: false, error: 'fn not wired: ' + fn });
  var args = Array.isArray(b.args) ? b.args : [];
  NTFY_CAPTURE_ = b.cpush ? [] : null;
  var res = F[fn].apply(null, fn === 'connBegin' || fn === 'ytImportData' || fn === 'connDisconnect' || fn === 'ytAutoLog' || fn === 'ytHistPut' || fn === 'ytHistDel' || fn === 'saveRecording' || fn === 'spotifySearch' || fn === 'setEpisode' || fn === 'setEpRating' || fn === 'setTheme' || fn === 'setThemes' || fn === 'spotifySaveToken' || fn === 'ytWatched' || fn === 'spotifyDisconnect' || fn === 'spotifyStatus' || fn === 'notifyInfo' || fn === 'readAlerts' ? args.concat([who]) : args);
  if (RPC_WRITES_[fn]) { if (!who) ntfyLog_('?', 'write-without-who:' + fn); else try { notifyLog_(who, fn, args, res); } catch (e) { ntfyLog_(who, 'notifyLog-err:' + String(e.message).slice(0, 40)); } }
  var push = NTFY_CAPTURE_; NTFY_CAPTURE_ = null;
  return json_({ ok: true, r: res === undefined ? null : res, push: push && push.length ? push : undefined });
}

/* ---------- r19: episode tracking: EP_<md5(title)> = {sam:{e:n}, lewy:{e:n}} ---------- */
function epKey_(title) { return 'EP_' + posterKey_(String(title || '').trim(), 'e').slice(7); }
function setEpisode(title, person, ep, a4, a5) {
  /* r55: (title, person, ep, seq, who) — seq = client tap counter; a stale/out-of-order write (seq lower than stored) is ignored */
  var who = a5 !== undefined ? a5 : a4, seq = a5 !== undefined ? Number(a4) || 0 : 0;
  title = String(title || '').trim(); person = person || who; if (!title || (person !== 'sam' && person !== 'lewy')) throw new Error('bad args');
  var L = LockService.getScriptLock(); L.waitLock(15000);
  try { var props = PropertiesService.getScriptProperties(), k = epKey_(title), o = {}; try { o = JSON.parse(props.getProperty(k) || '{}'); } catch (e) {}
    var cur = o[person] || {}; if (seq && cur.q && seq < cur.q && cur.q - seq < 1e9) { o.stale = 1; return o; }
    var n = Math.max(0, Math.min(999, Math.floor(Number(ep) || 0)));
    var keepR = cur.r; if (n || keepR) o[person] = { e: n, at: Utilities.formatDate(new Date(), 'Australia/Sydney', 'yyyy-MM-dd'), r: keepR || undefined, q: seq || undefined }; else delete o[person];
    if (Object.keys(o).length) props.setProperty(k, JSON.stringify(o)); else props.deleteProperty(k);
    bumpVersion_(); return o; } finally { L.releaseLock(); }
}
/** Optional per-person episode rating (1-10, 0 clears). Stored in the same EP_ record as {person:{e, r:{ep:rating}}}. Never touches the show rating. */
function setEpRating(title, person, ep, rating, who) {
  title = String(title || '').trim(); person = person || who; ep = Math.floor(Number(ep) || 0); rating = Math.floor(Number(rating) || 0);
  if (!title || (person !== 'sam' && person !== 'lewy') || ep < 1 || ep > 999 || rating < 0 || rating > 10) throw new Error('bad args');
  var props = PropertiesService.getScriptProperties(), k = epKey_(title), o = {}; try { o = JSON.parse(props.getProperty(k) || '{}'); } catch (e) {}
  var p = o[person] = o[person] || { e: 0 }; p.r = p.r || {}; if (rating) p.r[ep] = rating; else delete p.r[ep];
  props.setProperty(k, JSON.stringify(o)); bumpVersion_(); return o;
}
/* ---------- r19: notifications via ntfy.sh (free; iOS/Android ntfy app subscribes to a secret topic) ---------- */
function setupNotify() {
  var props = PropertiesService.getScriptProperties(), r = function () { return 'logged-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16); };
  if (!props.getProperty('NTFY_SAM')) props.setProperty('NTFY_SAM', r());
  if (!props.getProperty('NTFY_LEWY')) props.setProperty('NTFY_LEWY', r());
  Logger.log('Sam subscribes in the ntfy app to topic: ' + props.getProperty('NTFY_SAM'));
  Logger.log('Lewy subscribes in the ntfy app to topic: ' + props.getProperty('NTFY_LEWY'));
}
/** The app shows the caller their own topic so they can subscribe without opening the editor. */
function notifyInfo(who) { var t = PropertiesService.getScriptProperties().getProperty(who === 'lewy' ? 'NTFY_LEWY' : 'NTFY_SAM'); return { topic: t || '', server: 'https://ntfy.sh' }; }
var NTFY_CAPTURE_ = null; /* when set (RPC with cpush), pings are returned to the phone, which posts them to ntfy itself (phone IPs aren't rate-limited like Google's) */
function ntfy_(person, title, msg, tags, click) {
  var t = PropertiesService.getScriptProperties().getProperty(person === 'lewy' ? 'NTFY_LEWY' : 'NTFY_SAM'); if (!t) { ntfyLog_(person, 'no-topic'); return; }
  var item = { topic: t, title: String(title).slice(0, 80), msg: String(msg).slice(0, 300), tags: tags || 'tv', click: click || 'https://isolaow.github.io/logged/app/' };
  /* server sends with the account token (own rate limit); if that fails during an app request, the phone posts it instead */
  var code = ntfySend_(item, person, NTFY_CAPTURE_ ? 1 : 3); if (code !== 200 && NTFY_CAPTURE_) { NTFY_CAPTURE_.push(item); ntfyLog_(person, 'to-phone'); } }
function ntfySend_(it, person, tries) { var code = 0, tok = PropertiesService.getScriptProperties().getProperty('NTFY_TOKEN'), hd = tok ? { Authorization: 'Bearer ' + tok } : {};
  for (var a = 0; a < (tries || 3); a++) { try { code = UrlFetchApp.fetch('https://ntfy.sh/' + it.topic + '?title=' + encodeURIComponent(it.title) + '&tags=' + encodeURIComponent(it.tags) + '&click=' + encodeURIComponent(it.click), { method: 'post', payload: it.msg, headers: hd, muteHttpExceptions: true }).getResponseCode(); } catch (e) { code = 'ERR ' + String(e.message).slice(0, 40); }
    if (code === 200 || code === 401 || code === 403) break; if (a < (tries || 3) - 1) Utilities.sleep(1500 * (a + 1)); }
  ntfyLog_(person, code); return code; }
function ntfyLog_(person, code) { try { var P = PropertiesService.getScriptProperties(), L = JSON.parse(P.getProperty('NTFY_LOG') || '[]'); L.push([Utilities.formatDate(new Date(), 'Australia/Sydney', 'MM-dd HH:mm:ss'), person, String(code)]); P.setProperty('NTFY_LOG', JSON.stringify(L.slice(-30))); } catch (e) {} }
function ntfyLog() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('NTFY_LOG') || '[]'); } catch (e) { return []; } }
function notifyLog_(who, fn, args, res) {
  var other = who === 'sam' ? 'lewy' : 'sam', Who = who === 'sam' ? 'Sam' : 'Lewy', r = res && typeof res === 'object' ? res : {}, f = (fn === 'updateEntry' ? args[1] : args[fn === 'addFromTmdb' ? 1 : 0]) || {};
  var title = r.title || (args[0] && args[0].title) || f.title || ''; if (!title) return;
  var c = CacheService.getScriptCache(), ck = 'NT_' + posterKey_(who + title, 'n').slice(7); if (c.get(ck)) return; c.put(ck, '1', 90);
  var w = f[who + 'Watched'], rt = f[who + 'Rating'], bits = [];
  if (fn !== 'updateEntry') bits.push('added it to the log');
  if (w === 'Yes') bits.push('finished it ✓'); else if (w === 'As we speak') bits.push('started watching ▶');
  if (rt) bits.push('rated it ' + rt + '/10');
  if (f[who + 'Comment']) bits.push('“' + String(f[who + 'Comment']).slice(0, 80) + '”');
  if (!bits.length) return;
  ntfy_(other, Who + ' logged ' + title, Who + ' ' + bits.join(' · '), w === 'Yes' ? 'white_check_mark' : 'tv');
}

/* ---------- r19: daily alerts: new TV seasons (TMDB) + AU streaming changes (JustWatch) ---------- */
function installAlertTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'checkAlerts') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkAlerts').timeBased().everyDays(1).atHour(17).inTimezone('Australia/Sydney').create();
}
function getAlerts() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('ALERTS') || '[]'); } catch (e) { return []; } }
function readAlerts(ids, who) { var A = getAlerts(), w = who || 'x'; A.forEach(function (a) { if (!ids || ids.indexOf(a.id) >= 0) { a.read = a.read || {}; a.read[w] = 1; } });
  PropertiesService.getScriptProperties().setProperty('ALERTS', JSON.stringify(A)); return A; }
function pushAlert_(a) { var A = getAlerts(); if (A.some(function (x) { return x.key === a.key; })) return false;
  a.id = Utilities.getUuid().slice(0, 8); a.at = new Date().toISOString(); A.unshift(a); A = A.slice(0, 60);
  PropertiesService.getScriptProperties().setProperty('ALERTS', JSON.stringify(A)); ntfy_('sam', a.t, a.m, a.tag); ntfy_('lewy', a.t, a.m, a.tag); return true; }
function checkAlerts() {
  try { checkYouTube_(); } catch (e) { Logger.log(e); }
  var t0 = Date.now(), rows = getData().rows, meta = getAllMeta() || {}, props = PropertiesService.getScriptProperties();
  var base = function (t) { return String(t).replace(/\s*\((S\d+)\)\s*$/i, '').trim(); }, seen = {}, maxS = {};
  rows.forEach(function (r) { if (r.type !== 'TV Show') return; var b = base(r.title), m = String(r.title).match(/\(S(\d+)\)\s*$/i); maxS[b] = Math.max(maxS[b] || 1, m ? Number(m[1]) : 1);
    if (r.samWatched === 'Yes' || r.lewyWatched === 'Yes' || r.samWatched === 'As we speak' || r.lewyWatched === 'As we speak') seen[b] = seen[b] || r; });
  Object.keys(seen).forEach(function (b) { if (Date.now() - t0 > 240000) return; var r = seen[b], m = meta[String(r.title).trim()] || {}; if (!m.tmdb) return;
    var d = tmdb_('tv/' + m.tmdb); if (!d || !d.number_of_seasons) return;
    var aired = (d.seasons || []).filter(function (s) { return s.season_number > 0 && s.air_date && s.air_date <= Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd'); }).length || d.number_of_seasons;
    if (aired > maxS[b]) pushAlert_({ key: 'S|' + b + '|' + aired, k: 'season', title: b, t: '📺 New season: ' + b, m: b + ' season ' + aired + ' is out (you\u2019ve logged up to S' + maxS[b] + ').', tag: 'tv' });
    else if (d.next_episode_to_air && d.next_episode_to_air.season_number > maxS[b]) pushAlert_({ key: 'N|' + b + '|' + d.next_episode_to_air.season_number, k: 'soon', title: b, t: '⏳ ' + b + ' S' + d.next_episode_to_air.season_number + ' coming', m: 'Premieres ' + d.next_episode_to_air.air_date, tag: 'hourglass' });
  });
  rows.filter(function (r) { return r.samWatched !== 'Yes' && r.lewyWatched !== 'Yes' && r.samWatched !== 'As we speak' && r.lewyWatched !== 'As we speak'; }).slice(0, 60).forEach(function (r) {
    if (Date.now() - t0 > 300000) return; var m = meta[String(r.title).trim()] || {}, offs = []; try { offs = getOffers(r.title, r.type, m.tmdb, m.year) || []; } catch (e) { return; }
    var now = offs.filter(function (o) { return o.k === 's'; }).map(function (o) { return o.n; }).sort(), k = 'JWS_' + posterKey_(r.title, r.type).slice(7), prev = props.getProperty(k);
    props.setProperty(k, JSON.stringify(now)); if (prev == null) return; var was = JSON.parse(prev), added = now.filter(function (n) { return was.indexOf(n) < 0; });
    if (added.length) pushAlert_({ key: 'J|' + r.title + '|' + added.join(','), k: 'stream', title: r.title, t: '🍿 Now streaming: ' + r.title, m: 'On ' + added.join(', ') + ' (AU)', tag: 'popcorn' });
  });
}

/* ---------- r19: soundtracks (iTunes Search API, free/no key) + per-person 30 s theme clip ---------- */
/** [{n: song, a: artist, s: seconds, al: album}] for the title's soundtrack album (best match). Cached 6 h. */
function getSoundtrack(title, type, year) {
  var q = String(title || '').trim().replace(/\s*\((S\d+|\d{4})\)\s*$/i, '').trim(), sm = String(title || '').match(/\(S(\d+)\)\s*$/i); if (!q) return { tracks: [] };
  var c = CacheService.getScriptCache(), ck = 'OST1_' + posterKey_(title, type).slice(7), hit = c.get(ck); if (hit) return JSON.parse(hit);
  var norm = function (x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }, nq = norm(q), out = { tracks: [], album: '' };
  try {
    var A = (fetchJson_('https://itunes.apple.com/search?country=AU&entity=album&limit=15&term=' + encodeURIComponent(q + ' soundtrack')) || {}).results || [];
    A = A.filter(function (a) { var n = norm(a.collectionName); return n.indexOf(nq) === 0 && /soundtrack|music from|score|songs from/i.test(a.collectionName) && (a.trackCount || 0) > 2; });
    A.sort(function (a, b) { var sa = sm && new RegExp('season ' + sm[1] + '\\b', 'i').test(a.collectionName) ? -1 : 0, sb = sm && new RegExp('season ' + sm[1] + '\\b', 'i').test(b.collectionName) ? -1 : 0; return sa - sb || (b.trackCount - a.trackCount); });
    if (A[0]) { var T = (fetchJson_('https://itunes.apple.com/lookup?entity=song&country=AU&id=' + A[0].collectionId) || {}).results || [];
      out.album = A[0].collectionName; out.tracks = T.filter(function (t) { return t.wrapperType === 'track'; }).slice(0, 40).map(function (t) { return { n: t.trackName, a: t.artistName, s: Math.round((t.trackTimeMillis || 0) / 1000) }; }); }
  } catch (e) {}
  out.spotify = 'https://open.spotify.com/search/' + encodeURIComponent(q + ' soundtrack');
  if (out.tracks.length) ostIndex_(title, out.tracks);
  c.put(ck, JSON.stringify(out), 21600); return out;
}
/** YouTube id for a song (official audio preferred). Cached in Script Properties. */
function findSongVideo(song, artist) {
  var k = 'SONGYT_' + posterKey_(String(song) + '|' + String(artist), 's').slice(7), props = PropertiesService.getScriptProperties(), v = props.getProperty(k); if (v) return v;
  var id = ytFind_(String(song) + ' ' + String(artist) + ' official audio'); if (id) props.setProperty(k, id); return id || '';
}
function themeKey_(title) { return 'THEME_' + posterKey_(String(title || '').trim(), 't').slice(7); }
/** clip = {n, a, yt, st} or null to remove. Stored per title per person. */
function setTheme(title, person, clip, who) {
  title = String(title || '').trim(); person = person || who; if (!title || (person !== 'sam' && person !== 'lewy')) throw new Error('bad args');
  var props = PropertiesService.getScriptProperties(), k = themeKey_(title), o = {}; try { o = JSON.parse(props.getProperty(k) || '{}'); } catch (e) {}
  var src = clip && clip.src || 'yt', c = clip ? { n: String(clip.n || '').slice(0, 120), a: String(clip.a || '').slice(0, 120), st: Math.max(0, Math.floor(Number(clip.st) || 0)), src: src } : null;
  if (c && src === 'yt' && clip.yt) c.yt = String(clip.yt).replace(/[^\w-]/g, '').slice(0, 11);
  else if (c && src === 'sp' && (clip.sp || /^https:\/\/audio-ssl\.itunes\.apple\.com\//.test(clip.pv || ''))) { c.sp = String(clip.sp || '').replace(/[^\w]/g, '').slice(0, 30); if (/^https:\/\/(p\.scdn\.co|audio-ssl\.itunes\.apple\.com)\//.test(clip.pv || '')) c.pv = String(clip.pv).slice(0, 400); if (clip.art && /^https:\/\/[\w.-]+\.(mzstatic\.com|scdn\.co)\//.test(clip.art)) c.art = String(clip.art).slice(0, 300); if (clip.via) c.via = String(clip.via).replace(/[^\w]/g, '').slice(0, 12); }
  else if (c && src === 'sc' && /^https:\/\/(on\.|m\.|www\.)?soundcloud\.com\//.test(clip.sc || '')) c.sc = String(clip.sc).slice(0, 300);
  else if (c && src === 'rec' && clip.rec) { c.rec = String(clip.rec).replace(/[^\w-]/g, '').slice(0, 80); c.dur = Math.min(30, Number(clip.dur) || 30); }
  else c = null;
  if (c) o[person] = c; else delete o[person];
  if (Object.keys(o).length) props.setProperty(k, JSON.stringify(o)); else props.deleteProperty(k);
  bumpVersion_(); return o;
}

/* ---------- r19: Spotify (Authorization Code + PKCE in the Pages app; refresh tokens kept here; hourly poll) ----------
   Script Properties: SPOTIFY_CLIENT_ID (non-secret), SPOT_RT_sam / SPOT_RT_lewy (refresh tokens), SPOT_PL_<p> (play counts),
   SPOT_TOP_<p> (current top tracks), SPOT_AFTER_<p> (recently-played cursor), OSTIDX (title -> soundtrack song names, for matching). */
function spotifyStatus(who) { var P = PropertiesService.getScriptProperties();
  return { clientId: P.getProperty('SPOTIFY_CLIENT_ID') || '', sam: !!P.getProperty('SPOT_RT_sam'), lewy: !!P.getProperty('SPOT_RT_lewy') }; }
function spotifySaveToken(person, rt, who) { person = person || who; if ((person !== 'sam' && person !== 'lewy') || !rt) throw new Error('bad args');
  PropertiesService.getScriptProperties().setProperty('SPOT_RT_' + person, String(rt).slice(0, 400)); try { spotifyPollOne_(person); } catch (e) {} return spotifyStatus(); }
function spotifyDisconnect(person, who) { person = person || who; var P = PropertiesService.getScriptProperties(); ['SPOT_RT_', 'SPOT_PL_', 'SPOT_TOP_', 'SPOT_AFTER_'].forEach(function (k) { P.deleteProperty(k + person); }); return spotifyStatus(); }
function installSpotifyTrigger() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'spotifyPoll') ScriptApp.deleteTrigger(t); }); ScriptApp.newTrigger('spotifyPoll').timeBased().everyHours(1).create(); }
function spotifyPoll() { ['sam', 'lewy'].forEach(function (p) { try { spotifyPollOne_(p); } catch (e) { Logger.log(p + ': ' + e); } try { ytTok_(p); } catch (e) {} }); }
function spotifyPollOne_(p) {
  var P = PropertiesService.getScriptProperties(), rt = P.getProperty('SPOT_RT_' + p), cid = P.getProperty('SPOTIFY_CLIENT_ID'); if (!rt || !cid) return;
  var tj = { access_token: spotTok_(p) }; if (!tj.access_token) return;
  var H = { headers: { Authorization: 'Bearer ' + tj.access_token }, muteHttpExceptions: true }, after = P.getProperty('SPOT_AFTER_' + p) || '0';
  var rp = JSON.parse(UrlFetchApp.fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50&after=' + after, H).getContentText() || '{}'), pl = {}; try { pl = JSON.parse(P.getProperty('SPOT_PL_' + p) || '{}'); } catch (e) {}
  (rp.items || []).forEach(function (it) { var t = it.track || {}, k = String(t.name || '').slice(0, 80) + '|' + String(((t.artists || [])[0] || {}).name || '').slice(0, 40); var o = pl[k] = pl[k] || { c: 0 }; o.c++; o.l = String(it.played_at || '').slice(0, 10); });
  if (rp.cursors && rp.cursors.after) P.setProperty('SPOT_AFTER_' + p, rp.cursors.after);
  var keys = Object.keys(pl).sort(function (a, b) { return pl[b].c - pl[a].c; }).slice(0, 120), o2 = {}; keys.forEach(function (k) { o2[k] = pl[k]; }); P.setProperty('SPOT_PL_' + p, JSON.stringify(o2));
  var top = JSON.parse(UrlFetchApp.fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term', H).getContentText() || '{}');
  P.setProperty('SPOT_TOP_' + p, JSON.stringify((top.items || []).map(function (t) { return String(t.name).slice(0, 80) + '|' + String(((t.artists || [])[0] || {}).name || '').slice(0, 40); })));
}
/** Everything the app needs for soundtrack listening stats. */
function getSpotify() { var P = PropertiesService.getScriptProperties(), j = function (k, d) { try { return JSON.parse(P.getProperty(k) || d); } catch (e) { return JSON.parse(d); } };
  return { status: spotifyStatus(), sam: { pl: j('SPOT_PL_sam', '{}'), top: j('SPOT_TOP_sam', '[]') }, lewy: { pl: j('SPOT_PL_lewy', '{}'), top: j('SPOT_TOP_lewy', '[]') }, ost: j('OSTIDX', '{}') }; }
function ostIndex_(title, tracks) { try { var P = PropertiesService.getScriptProperties(), o = JSON.parse(P.getProperty('OSTIDX') || '{}'); o[String(title).trim()] = (tracks || []).slice(0, 30).map(function (t) { return String(t.n).slice(0, 60); });
  var s = JSON.stringify(o); while (s.length > 8500) { delete o[Object.keys(o)[0]]; s = JSON.stringify(o); } P.setProperty('OSTIDX', s); } catch (e) {} }

/* ---------- r19: YouTube entries (type 'YouTube'). Watch tracking ONLY from Logged's in-app player. ----------
   YT_KEY (optional, Script Property, server-side only) improves search/channels; without it: oEmbed + RSS + page search.
   YTM_<md5(title)> = {k:'video'|'playlist'|'channel', id, ch, chId, last}; YTW_<md5(title)> = {sam:{vid:date}, lewy:{...}} */
function ytKey_() { return PropertiesService.getScriptProperties().getProperty('YT_KEY') || ''; }
function ytmKey_(t) { return 'YTM_' + posterKey_(String(t || '').trim(), 'y').slice(7); }
function ytwKey_(t) { return 'YTW_' + posterKey_(String(t || '').trim(), 'w').slice(7); }
function ytThumb_(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }
/** Search or resolve a pasted link. -> [{k, id, t, ch, chId, th}] */
function ytSearch(q) {
  q = String(q || '').trim(); if (!q) return [];
  var m, key = ytKey_(), out = [];
  if ((m = q.match(/[?&]list=([\w-]+)/))) return [ytOembed_('playlist', m[1], 'https://www.youtube.com/playlist?list=' + m[1])].filter(Boolean);
  if ((m = q.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/))) return [ytOembed_('video', m[1], 'https://www.youtube.com/watch?v=' + m[1])].filter(Boolean);
  if ((m = q.match(/youtube\.com\/(?:channel\/(UC[\w-]{22})|(@[\w.-]+))/))) { var c = ytChannel_(m[1] || m[2]); return c ? [c] : []; }
  if (key) { var d = fetchJson_('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&type=video,playlist,channel&q=' + encodeURIComponent(q) + '&key=' + key) || {};
    (d.items || []).forEach(function (it) { var k = it.id.kind.split('#')[1], id = it.id.videoId || it.id.playlistId || it.id.channelId, sn = it.snippet || {};
      out.push({ k: k, id: id, t: sn.title, ch: sn.channelTitle, chId: sn.channelId, th: ((sn.thumbnails || {}).high || (sn.thumbnails || {}).default || {}).url }); }); return out; }
  var errs = [];
  try { out = ytInnertube_(q); if (out.length) return out; } catch (e) { errs.push('yt:' + e.message); }
  var INV = ['https://invidious.nerdvpn.de', 'https://yewtu.be', 'https://inv.nadeko.net', 'https://invidious.privacyredirect.com'];
  for (var n = 0; n < INV.length; n++) { try { var r = UrlFetchApp.fetch(INV[n] + '/api/v1/search?type=all&q=' + encodeURIComponent(q), { muteHttpExceptions: true, followRedirects: true }); if (r.getResponseCode() !== 200) { errs.push(INV[n] + ':' + r.getResponseCode()); continue; }
    JSON.parse(r.getContentText()).forEach(function (x) { if (out.length >= 12) return; if (x.type === 'video') out.push({ k: 'video', id: x.videoId, t: x.title, ch: x.author, chId: x.authorId, th: ytThumb_(x.videoId), dur: x.lengthSeconds }); else if (x.type === 'channel') out.push({ k: 'channel', id: x.authorId, t: x.author, ch: x.author, chId: x.authorId, th: ((x.authorThumbnails || []).slice(-1)[0] || {}).url }); else if (x.type === 'playlist') out.push({ k: 'playlist', id: x.playlistId, t: x.title, ch: x.author, chId: x.authorId, th: x.playlistThumbnail }); });
    if (out.length) return out; } catch (e) { errs.push(INV[n] + ':' + e.message); } }
  var PIP = ['https://api.piped.private.coffee', 'https://pipedapi.kavin.rocks'];
  for (var m2 = 0; m2 < PIP.length; m2++) { try { var r2 = UrlFetchApp.fetch(PIP[m2] + '/search?filter=all&q=' + encodeURIComponent(q), { muteHttpExceptions: true }); if (r2.getResponseCode() !== 200) { errs.push(PIP[m2] + ':' + r2.getResponseCode()); continue; }
    (JSON.parse(r2.getContentText()).items || []).forEach(function (x) { if (out.length >= 12) return; var id = String(x.url || '').replace(/^.*[?&]v=|^\/channel\/|^\/playlist\?list=/, ''); if (x.type === 'stream') out.push({ k: 'video', id: id, t: x.title, ch: x.uploaderName, chId: String(x.uploaderUrl || '').replace('/channel/', ''), th: ytThumb_(id), dur: x.duration }); else if (x.type === 'channel') out.push({ k: 'channel', id: id, t: x.name, ch: x.name, chId: id, th: x.thumbnail }); });
    if (out.length) return out; } catch (e) { errs.push(PIP[m2] + ':' + e.message); } }
  if (errs.length) { console.warn('ytSearch sources failed: ' + errs.join(' | ')); throw new Error('YT_SOURCES_DOWN'); }
  return out;
}
/** Keyless YouTube search via the public innertube endpoint (consent cookie avoids the EU/consent wall on Google IPs). */
function ytInnertube_(q) { var r = UrlFetchApp.fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { Cookie: 'SOCS=CAI; CONSENT=YES+1', 'Accept-Language': 'en' },
    payload: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20241001.00.00', hl: 'en', gl: 'AU' } }, query: q }) });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode()); var out = [], seen = {}, txt = function (o) { return o ? (o.simpleText || (o.runs || []).map(function (x) { return x.text; }).join('')) : ''; };
  (function walk(o) { if (!o || typeof o !== 'object' || out.length >= 12) return; if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o.videoRenderer) { var v = o.videoRenderer; if (v.videoId && !seen[v.videoId]) { seen[v.videoId] = 1; var ow = ((v.ownerText || v.longBylineText || {}).runs || [{}])[0], dl = txt(v.lengthText).split(':').map(Number), sec = dl.reduce(function (a, b) { return a * 60 + (b || 0); }, 0);
      out.push({ k: 'video', id: v.videoId, t: txt(v.title), ch: ow.text || '', chId: (((ow.navigationEndpoint || {}).browseEndpoint) || {}).browseId || '', th: ytThumb_(v.videoId), dur: sec || undefined }); } return; }
    if (o.channelRenderer) { var c = o.channelRenderer, th = ((c.thumbnail || {}).thumbnails || []).slice(-1)[0] || {}; if (!seen[c.channelId]) { seen[c.channelId] = 1; out.push({ k: 'channel', id: c.channelId, t: txt(c.title), ch: txt(c.title), chId: c.channelId, th: th.url ? (th.url.indexOf('//') === 0 ? 'https:' + th.url : th.url) : '' }); } return; }
    if (o.playlistRenderer) { var p = o.playlistRenderer; if (!seen[p.playlistId]) { seen[p.playlistId] = 1; out.push({ k: 'playlist', id: p.playlistId, t: txt(p.title), ch: txt(p.shortBylineText), th: ((((p.thumbnails || [])[0] || {}).thumbnails || []).slice(-1)[0] || {}).url }); } return; }
    for (var k in o) walk(o[k]); })(JSON.parse(r.getContentText())); return out; }
function ytOembed_(k, id, url) { try { var o = fetchJson_('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url)); if (!o) return null;
  var chId = ''; try { var mm = String(o.author_url || '').match(/channel\/(UC[\w-]{22})/); chId = mm ? mm[1] : ''; } catch (e) {}
  return { k: k, id: id, t: o.title, ch: o.author_name, chId: chId, th: k === 'video' ? ytThumb_(id) : o.thumbnail_url }; } catch (e) { return null; } }
function ytChannel_(ref) { var key = ytKey_();
  if (key) { var d = fetchJson_('https://www.googleapis.com/youtube/v3/channels?part=snippet&' + (ref.charAt(0) === '@' ? 'forHandle=' + encodeURIComponent(ref) : 'id=' + ref) + '&key=' + key) || {}, it = (d.items || [])[0]; if (!it) return null;
    return { k: 'channel', id: it.id, t: it.snippet.title, ch: it.snippet.title, chId: it.id, th: ((it.snippet.thumbnails || {}).high || {}).url }; }
  try { var h = UrlFetchApp.fetch('https://www.youtube.com/' + (ref.charAt(0) === '@' ? ref : 'channel/' + ref), { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } }).getContentText();
    var id = (h.match(/"externalId":"(UC[\w-]{22})"/) || [])[1], t = (h.match(/<meta property="og:title" content="([^"]*)"/) || [])[1], th = (h.match(/<meta property="og:image" content="([^"]*)"/) || [])[1];
    return id ? { k: 'channel', id: id, t: t || ref, ch: t || ref, chId: id, th: th } : null; } catch (e) { return null; } }
/** Add a YouTube item to the sheet (type 'YouTube'), remember its kind/id and thumbnail. */
function addYouTube(item, fields) {
  item = item || {}; if (!item.id || !item.t) throw new Error('bad item'); fields = fields || {};
  var title = String(item.t).trim().slice(0, 180); if (item.k === 'channel' && !/channel/i.test(title)) title += ' (Channel)';
  var f = { title: title, type: 'YouTube', genres: 'YouTube' }; ['suggestedBy', 'samWatched', 'lewyWatched', 'samRating', 'lewyRating', 'spesh', 'samComment', 'lewyComment'].forEach(function (k) { if (fields[k]) f[k] = fields[k]; });
  var row = addEntry(f), P = PropertiesService.getScriptProperties();
  var ytm = { k: item.k, id: String(item.id).slice(0, 40), ch: String(item.ch || '').slice(0, 80), chId: String(item.chId || '').slice(0, 30) };
  if (item.k === 'channel') try { ytm.last = (ytRss_(item.id)[0] || {}).id || ''; } catch (e) {}
  P.setProperty(ytmKey_(title), JSON.stringify(ytm)); if (item.th) P.setProperty(posterKey_(title, 'YouTube'), String(item.th).slice(0, 300));
  if (row && typeof row === 'object') { row.ytm = ytm; row.poster = item.th; } return row;
}
/** Called by the app ONLY when a video finishes / passes 80% in Logged's own player. */
function ytWatched(title, person, vid, who) { title = String(title || '').trim(); person = person || who; if (!title || (person !== 'sam' && person !== 'lewy')) throw new Error('bad args');
  var P = PropertiesService.getScriptProperties(), k = ytwKey_(title), o = {}; try { o = JSON.parse(P.getProperty(k) || '{}'); } catch (e) {}
  o[person] = o[person] || {}; o[person][String(vid).slice(0, 11)] = Utilities.formatDate(new Date(), 'Australia/Sydney', 'yyyy-MM-dd');
  var ks = Object.keys(o[person]); if (ks.length > 150) delete o[person][ks[0]]; P.setProperty(k, JSON.stringify(o)); bumpVersion_(); return o; }
function ytRss_(chId) { var x = UrlFetchApp.fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + chId, { muteHttpExceptions: true }).getContentText(), out = [], re = /<yt:videoId>([\w-]{11})<\/yt:videoId>[\s\S]*?<title>([^<]*)<\/title>/g, m;
  while ((m = re.exec(x)) && out.length < 15) out.push({ id: m[1], t: m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") }); return out; }
/** Latest uploads for a followed channel (for the in-app player). */
function ytUploads(chId) { return ytRss_(String(chId || '')); }
function checkYouTube_() { var P = PropertiesService.getScriptProperties(), all = P.getProperties();
  getData().rows.forEach(function (r) { if (r.type !== 'YouTube') return; var raw = all[ytmKey_(r.title)]; if (!raw) return; var m = JSON.parse(raw); if (m.k !== 'channel') return;
    var L = []; try { L = ytRss_(m.id); } catch (e) { return; } if (!L.length || L[0].id === m.last) return;
    var nw = []; for (var i = 0; i < L.length && L[i].id !== m.last; i++) nw.push(L[i]); m.last = L[0].id; P.setProperty(ytmKey_(r.title), JSON.stringify(m));
    if (nw.length) pushAlert_({ key: 'Y|' + L[0].id, k: 'yt', title: r.title, t: '▶ New from ' + (m.ch || r.title), m: nw[0].t + (nw.length > 1 ? ' (+' + (nw.length - 1) + ' more)' : ''), tag: 'arrow_forward' }); });
}

/** YouTube home feed: trending AU (by category), category chips, recommendations seeded from Logged channels/ratings. Cached 1h. */
var YT_CATS_ = [['', 'ALL'], ['20', 'GAMING'], ['10', 'MUSIC'], ['23', 'COMEDY'], ['17', 'SPORT'], ['24', 'ENTERTAINMENT'], ['28', 'TECH'], ['27', 'LEARN'], ['1', 'FILM'], ['25', 'NEWS'], ['26', 'HOWTO']];
function ytIso_(d) { var m = String(d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); }
function ytVideos_(ids, key) { if (!ids.length) return []; var d = fetchJson_('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=' + ids.slice(0, 50).join(',') + '&key=' + key) || {};
  return (d.items || []).map(function (it) { var sn = it.snippet || {}; return { k: 'video', id: it.id, t: sn.title, ch: sn.channelTitle, chId: sn.channelId, th: ytThumb_(it.id), dur: ytIso_((it.contentDetails || {}).duration), views: +((it.statistics || {}).viewCount || 0) }; }); }
function ytFeed(opts) { opts = opts || {}; var cat = String(opts.cat || '').replace(/\D/g, ''), seeds = (opts.seeds || []).slice(0, 4).map(function (x) { return String(x).slice(0, 60); });
  var C = CacheService.getScriptCache(), ck = 'ytf2|' + cat + '|' + seeds.join('|') + '|' + (opts.recent || []).slice(0, 3).join(','), hit = C.get(ck); if (hit) return JSON.parse(hit);
  var key = ytKey_(), out = { cats: YT_CATS_.map(function (c) { return { id: c[0], t: c[1] }; }), trending: [], rec: [], live: !!key };
  if (key) { var d = fetchJson_('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=AU&maxResults=24' + (cat ? '&videoCategoryId=' + cat : '') + '&key=' + key) || {};
    out.trending = (d.items || []).map(function (it) { var sn = it.snippet || {}; return { k: 'video', id: it.id, t: sn.title, ch: sn.channelTitle, chId: sn.channelId, th: ytThumb_(it.id), dur: ytIso_((it.contentDetails || {}).duration), views: +((it.statistics || {}).viewCount || 0) }; });
    var ids = []; seeds.forEach(function (q) { var s = fetchJson_('https://www.googleapis.com/youtube/v3/search?part=id&type=video&maxResults=6&relevanceLanguage=en&regionCode=AU&q=' + encodeURIComponent(q) + (cat ? '&videoCategoryId=' + cat : '') + '&key=' + key) || {}; (s.items || []).forEach(function (i) { if (ids.indexOf(i.id.videoId) < 0) ids.push(i.id.videoId); }); });
    out.rec = ytVideos_(ids, key);
  } else { var nm = (YT_CATS_.filter(function (c) { return c[0] === cat; })[0] || [, ''])[1];
    out.trending = ytSearch((nm && nm !== 'ALL' ? nm.toLowerCase() + ' ' : '') + 'trending australia this week');
    seeds.slice(0, 3).forEach(function (q) { out.rec = out.rec.concat(ytSearch(q).slice(0, 5)); }); }
  out.rec = ytDiversify_(out.rec, (opts.recent || []).slice(0, 3), out.trending, seeds);
  try { C.put(ck, JSON.stringify(out), 300); } catch (e) {} return out; }
/** Mix: seed matches + 'related' (from recently played videos) + fresh trending; max 2 per channel, round-robin by source. */
function ytDiversify_(seedL, recent, trending, seeds) { var rel = [];
  recent.forEach(function (v) { try { (ytInfo(v).next || []).forEach(function (x) { if (x.dur !== 'LIVE') rel.push({ k: 'video', id: x.id, t: x.t, ch: x.ch, th: x.th, dur: x.dur, src: 'rel' }); }); } catch (e) {} });
  var fresh = (trending || []).slice().sort(function () { return Math.random() - .5; }).slice(0, 8).map(function (x) { return Object.assign({}, x, { src: 'new' }); });
  var pools = [(seedL || []).map(function (x) { return Object.assign({}, x, { src: x.src || 'seed' }); }), rel, fresh], seen = {}, per = {}, out = [], go = true;
  while (go && out.length < 24) { go = false; pools.forEach(function (P) { while (P.length) { var x = P.shift(); if (!x || !x.id || seen[x.id] || (x.k && x.k !== 'video')) continue; var c = String(x.ch || '').toLowerCase(); if ((per[c] || 0) >= 2) continue; seen[x.id] = 1; per[c] = (per[c] || 0) + 1; out.push(x); go = true; break; } }); }
  return out; }
/** Non-secret client config for the Pages app (OAuth client ids are public by design). */
function appConfig() { var P = PropertiesService.getScriptProperties(); return { spotifyClientId: P.getProperty('SPOTIFY_CLIENT_ID') || '', googleClientId: P.getProperty('GOOGLE_CLIENT_ID') || '', ytSearchKey: !!ytKey_() }; }

/* ================= 13) TRIVIA (live 1v1 + daily) — only titles someone finished ('Yes'). Image-led, quotes, soundtrack clips. ================= */
var TV_IMG_ = 'https://image.tmdb.org/t/p/';
function tvShuf_(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function tvOpts_(right, pool) { var o = [right]; tvShuf_(pool).forEach(function (x) { if (o.length < 4 && x && o.indexOf(x) < 0) o.push(x); }); if (o.length < 2) return null; o = tvShuf_(o); return { opts: o, a: o.indexOf(right) }; }
function tvPool_() { var M = getAllMeta(), out = [];
  getData().rows.forEach(function (r) { if (r.type === 'YouTube') return; if (!(r.samWatched === 'Yes' || r.lewyWatched === 'Yes' || r.samWatched === 'As we speak' || r.lewyWatched === 'As we speak')) return; var m = M[r.title] || {}; if (!m.tmdb) return; out.push({ r: r, m: m, tv: r.type === 'TV Show' }); }); return out; }
function tvImages_(p) { var c = CacheService.getScriptCache(), k = 'tvi_' + p.m.tmdb + (p.tv ? 't' : 'm'), h = c.get(k); if (h) return JSON.parse(h);
  var d = tmdb_((p.tv ? 'tv/' : 'movie/') + p.m.tmdb, { append_to_response: 'images,credits', include_image_language: 'null,en' }) || {};
  var o = { bd: ((d.images || {}).backdrops || []).slice(0, 12).map(function (x) { return x.file_path; }), tag: d.tagline || '',
    cast: ((d.credits || {}).cast || []).filter(function (x) { return x.profile_path && x.character; }).slice(0, 8).map(function (x) { return [x.name, x.character.split('/')[0].trim(), x.profile_path]; }), seasons: d.number_of_seasons || 0 };
  try { c.put(k, JSON.stringify(o), 21600); } catch (e) {} return o; }
function tvQuotes_(title) { var c = CacheService.getScriptCache(), k = 'tvq2_' + title.slice(0, 200), h = c.get(k); if (h) return JSON.parse(h); var out = [];
  /* r55: only real quote sections (stop at Taglines/About/Cast/…); speaker = bold dialogue label, else the character section heading; sourced
     lines (followed by '**' attribution, i.e. said ABOUT the title by a critic/real person) are skipped, so nothing is misattributed */
  try { var sm = title.match(/ \(S(\d+)\)$/), base = title.replace(/ \(S\d+\)$/, ''), wq = function (pg) { var d = fetchJson_('https://en.wikiquote.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=' + encodeURIComponent(pg)) || {}; return (((d.parse || {}).wikitext) || {})['*'] || ''; };
    var w = sm ? wq(base + ' (season ' + sm[1] + ')') : ''; if (!w) w = wq(base); if (/==\s*Seasons\s*==/.test(w) && !sm) w = wq(base + ' (season 1)') || w;
    var L = w.split('\n'), sec = '', stopped = false, stop = /^(taglines?|about|quotes about|cast|external links|see also|reviews?|reception|references|notes|trailer|misattributed|disputed)/i, clean = function (q) { return q.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?|<[^>]+>|\{\{[^}]*\}\}|\[\w[^\]]*\]/g, '').replace(/\s+/g, ' ').trim(); };
    for (var i = 0; i < L.length; i++) { var l = L[i], hm = l.match(/^(={2,4})\s*(.*?)\s*\1\s*$/); if (hm) { sec = clean(hm[2]); if (hm[1] === '==') stopped = stop.test(sec); continue; } if (stopped) continue;
      if (/^\*\*/.test(L[i + 1] || '')) continue;
      var m = l.match(/^[:*]+\s*'''([^']{2,30})''':\s*(.+)$/), who = '', q = '';
      if (m) { who = clean(m[1]); q = clean(m[2]); var multi = /^[:*]+\s*'''[^']+''':/.test(L[i + 1] || '') || /^[:*]+\s*'''[^']+''':/.test(L[i - 1] || ''); if (multi && Math.random() < .5) continue; }
      else if ((m = l.match(/^\*\s*([^:*'#][^\n]{20,})$/))) { q = clean(m[1]); who = /^(dialogue|season \d+|episode|quotes|.*\(\d{4}\)|"?.+"? ?\[.*\])$/i.test(sec) || !sec || / /.test(sec) && sec.split(' ').length > 3 ? '' : sec; }
      if (q.length > 25 && q.length < 150 && !/http|\(|\[|^\W*$|^["“]/.test(q)) out.push({ q: q, who: who }); } } catch (e) {}
  out = tvShuf_(out).slice(0, 10); try { c.put(k, JSON.stringify(out), 21600); } catch (e) {} return out; }
function tvClip_(title) { var o = ostPreview(title); return o ? { url: o.url, n: o.n } : null; }
/** iTunes 30 s preview (m4a, iOS-friendly) for a title's soundtrack, or for a specific song. Only returns tracks whose album actually belongs to the title. Cached 6 h. */
function ostPreview(title, song, artist, year) { title = String(title || '').trim(); if (!title) return null; var base = title.replace(/^\d+\s+/, '').replace(/\s*\((S\d+|\d{4}|[IVX]+)\)\s*$/i, '').trim();
  var AL = { 'the phoneician scheme': 'the phoenician scheme', 'the equaliser': 'the equalizer', 'inglorious basterds': 'inglourious basterds', 'east bound & down': 'eastbound & down', 'fast and furious - five': 'fast five', 'fast and furious - tokyo drift': 'tokyo drift', 'dungeons and dragons': 'dungeons & dragons honour among thieves', 'flying high': 'airplane', 'shrek 3': 'shrek the third', 'se7en': 'seven', 'minutes inside the twin towers': '102 minutes that changed america', 'star wars: rogue one': 'rogue one', 'star wars: solo': 'solo a star wars story', 'flying high': 'airplane!' };
  base = AL[base.toLowerCase()] || base;
  var norm = function (x) { return String(x || '').toLowerCase().replace(/&/g, ' and ').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim(); }, cmp = function (x) { return norm(x).replace(/\s+/g, '').replace(/ise/g, 'ize').replace(/our/g, 'or'); }, nb = cmp(norm(base).split(' ').slice(0, 4).join(' '));
  var c = CacheService.getScriptCache(), k = 'OPV1_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, base + '|' + (song || '') + '|' + (artist || '') + '|' + (year || '') + '|v2')).slice(0, 22), hit = c.get(k); if (hit) return hit === '-' ? null : JSON.parse(hit);
  var pick = null;
  try {
    if (song) { var S = (fetchJson_('https://itunes.apple.com/search?country=AU&media=music&entity=song&limit=10&term=' + encodeURIComponent(song + ' ' + (artist || ''))) || {}).results || [];
      pick = S.filter(function (x) { return x.previewUrl && norm(x.trackName).indexOf(norm(song).slice(0, 12)) === 0; })[0] || null; }
    if (!pick) { ['soundtrack', 'original score', 'music from'].some(function (w) { var R = (fetchJson_('https://itunes.apple.com/search?country=AU&media=music&entity=song&limit=25&term=' + encodeURIComponent(base + ' ' + w)) || {}).results || [];
        var pre = function (n) { return String(n || '').replace(/^(quentin tarantino.s|monty python.s|disney.s|pixar.s|dreamworks.?)\s*/i, ''); }, short = norm(base).split(' ').length < 2, yr = Number(year) || 0;
        var L = R.filter(function (x) { var raw = pre(x.collectionName), cn = cmp(raw); if (!x.previewUrl || cn.indexOf(nb) !== 0 || !/soundtrack|music from|score|songs from|original/i.test(x.collectionName || '')) return false;
          if (/^the\s/i.test(raw) && !/^the\s/i.test(base)) return false; var ry = Number(String(x.releaseDate || '').slice(0, 4)) || 0; if (short && yr && ry && Math.abs(ry - yr) > 2) return false; return true; });
        if (yr) L.sort(function (a, b) { return Math.abs((Number(String(a.releaseDate).slice(0, 4)) || 0) - yr) - Math.abs((Number(String(b.releaseDate).slice(0, 4)) || 0) - yr); });
        if (L.length) pick = L[Math.floor(Math.random() * Math.min(L.length, 6))]; return !!pick; }); }
  } catch (e) {}
  var out = pick ? { url: String(pick.previewUrl).replace(/^http:/, 'https:'), n: pick.trackName, a: pick.artistName, al: pick.collectionName } : null;
  try { c.put(k, out ? JSON.stringify(out) : '-', 21600); } catch (e) {} return out; }
/** Build n questions. Kinds: scene, still (TV season), char (pixelated profile), year, director, tagline, quote, sound, higher. */
function triviaBuild_(n) { var P = tvShuf_(tvPool_()), titles = P.map(function (p) { return p.r.title; }), out = [], tries = 0, kinds = ['moment', 'scene', 'quote', 'sound', 'char', 'still', 'moment', 'year', 'director', 'tagline', 'higher', 'quote'];
  while (out.length < n && tries++ < n * 6 && P.length) { var p = P[tries % P.length], kind = kinds[(out.length + tries) % kinds.length], t = p.r.title, q = null, I = null, oo;
    try {
      if (/scene|char|still|tagline|year|higher/.test(kind)) I = tvImages_(p);
      var bd = I && I.bd.length ? TV_IMG_ + 'w780' + I.bd[Math.floor(Math.random() * I.bd.length)] : '';
      if (kind === 'scene' && bd && (oo = tvOpts_(t, titles))) q = { img: bd, pix: 1, q: 'FREEZE FRAME! WHICH TITLE IS THIS SCENE FROM?' };
      else if (kind === 'char' && I.cast.length >= 2) { var c = I.cast[Math.floor(Math.random() * Math.min(5, I.cast.length))]; oo = tvOpts_(c[1], I.cast.map(function (x) { return x[1]; })); if (oo) q = { img: TV_IMG_ + 'w300' + c[2], pix: 1, portrait: 1, q: 'YOU WATCHED ' + t.toUpperCase() + ' — WHO IS THIS?' }; }
      else if (kind === 'still' && p.tv && I.seasons > 1) { var s = 1 + Math.floor(Math.random() * I.seasons), sd = tmdb_('tv/' + p.m.tmdb + '/season/' + s, {}) || {}, eps = (sd.episodes || []).filter(function (e) { return e.still_path; });
        if (eps.length) { var e = eps[Math.floor(Math.random() * eps.length)], ss = []; for (var i = 1; i <= I.seasons; i++) ss.push('SEASON ' + i); oo = tvOpts_('SEASON ' + s, ss); if (oo) q = { img: TV_IMG_ + 'w780' + e.still_path, pix: 1, q: t.toUpperCase() + ': WHICH SEASON IS THIS FROM?', more: 'S' + s + 'E' + e.episode_number + ' · ' + e.name }; } }
      else if (kind === 'year' && p.m.year) { var y = +p.m.year; oo = tvOpts_(String(y), [y - 3, y - 2, y - 1, y + 1, y + 2, y + 3].map(String)); q = { img: bd, q: 'TIME CHECK: WHAT YEAR DID ' + t.toUpperCase() + ' COME OUT?' }; }
      else if (kind === 'director' && p.m.director) { var dr = String(p.m.director).split(',')[0].trim(); oo = tvOpts_(dr, P.map(function (x) { return String(x.m.director || '').split(',')[0].trim(); })); if (oo) q = { img: bd, q: 'BEHIND THE CAMERA: WHO DIRECTED ' + t.toUpperCase() + '?' }; }
      else if (kind === 'tagline' && I.tag && (oo = tvOpts_(t, titles))) q = { quote: I.tag, q: 'ON THE POSTER: WHICH TITLE SOLD ITSELF WITH THIS?' };
      else if (kind === 'quote') { var Q = tvQuotes_(t)[0]; if (Q) { if (Q.who && Math.random() < .6) { var chars = (tvImages_(p).cast || []).map(function (x) { return x[1]; }), lw = Q.who.toLowerCase(), hit = chars.filter(function (n) { return n.toLowerCase().split(/[\s"']+/).indexOf(lw.split(' ')[0]) >= 0 || n.toLowerCase() === lw; })[0];
          if (hit) { oo = tvOpts_(hit, chars); if (oo && oo.opts.length >= 3) q = { quote: Q.q, q: 'IN ' + t.toUpperCase() + ', WHICH CHARACTER SAYS THIS?', more: Q.who }; } }
        if (!q && (oo = tvOpts_(t, titles))) q = { quote: Q.q, q: 'YOU\u2019VE HEARD THIS LINE — WHICH TITLE IS IT FROM?', more: Q.who ? '— ' + Q.who : '' }; } }
      else if (kind === 'moment') { var Mo = tvMoment_(p); if (Mo && (oo = tvOpts_(t, titles))) q = { quote: Mo.quote, q: 'REMEMBER THIS MOMENT? WHICH ONE WAS IT?', more: Mo.more }; }
      else if (kind === 'sound') { var cl = tvClip_(t); if (cl && (oo = tvOpts_(t, titles))) q = { audio: cl.url, q: 'EARS ON! WHICH TITLE IS THIS MUSIC FROM?', more: '♪ ' + cl.n }; }
      else if (kind === 'higher') { var a = +p.r.samRating, b = +p.r.lewyRating; if (a && b) { var R = ['SAM', 'LEWY', 'TIE']; q = { img: bd, q: 'YOU BOTH RATED ' + t.toUpperCase() + ' — WHO WENT HIGHER?' }; oo = { opts: R, a: a > b ? 0 : b > a ? 1 : 2 }; } }
    } catch (e) { q = null; }
    if (q && oo) { q.kind = kind; q.t = t; q.opts = oo.opts; q.a = oo.a; out.push(q); P.splice(P.indexOf(p), 1); if (!P.length) P = tvShuf_(tvPool_()); } }
  return out; }
function tvStrip_(q, show) { var o = {}; for (var k in q) if (k !== 'a' && k !== 'more' && !(k === 't' && /scene|tagline|quote|sound/.test(q.kind) && !show)) o[k] = q[k]; if (show) { o.a = q.a; o.more = q.more; o.t = q.t; } return o; }
function tvStats_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TRIVIA_STATS') || '{}'); } catch (e) { return {}; } }
function tvRecord_(mode, sc) { var P = PropertiesService.getScriptProperties(), S = tvStats_(), w = sc.sam > sc.lewy ? 'sam' : sc.lewy > sc.sam ? 'lewy' : 'tie';
  S[mode] = S[mode] || { sam: 0, lewy: 0, tie: 0, games: 0 }; S[mode][w]++; S[mode].games++; if (mode === 'live') { S.run = S.run && S.run.w === w ? { w: w, n: S.run.n + 1 } : { w: w, n: 1 }; S.runBest = S.runBest || {}; if (w !== 'tie') S.runBest[w] = Math.max(S.runBest[w] || 0, S.run.n); var df = Math.abs((sc.sam || 0) - (sc.lewy || 0)); if (w !== 'tie' && df <= 10) { S.photo = S.photo || {}; S.photo[w] = (S.photo[w] || 0) + 1; } } S.best = S.best || {}; ['sam', 'lewy'].forEach(function (p) { S.best[p] = Math.max(S.best[p] || 0, sc[p] || 0); });
  P.setProperty('TRIVIA_STATS', JSON.stringify(S)); return S; }
function triviaStats() { return tvStats_(); }
/* ----- LIVE: state in CacheService (6h); clients poll triviaState ~1s ----- */
var TV_Q_MS_ = 15000, TV_R_MS_ = 4500;
function tvGet_(code) { var h = CacheService.getScriptCache().get('tvg_' + code); return h ? JSON.parse(h) : null; }
function tvPut_(g) { CacheService.getScriptCache().put('tvg_' + g.code, JSON.stringify(g), 21600); CacheService.getScriptCache().put('tvg_open', g.phase === 'lobby' ? g.code : '', 600); }
function tvTick_(g) { var now = Date.now();
  if (g.phase === 'q' && ((g.ans.sam[g.i] != null && g.ans.lewy[g.i] != null) || now > g.at + TV_Q_MS_)) { var q = g.qs[g.i]; ['sam', 'lewy'].forEach(function (p) { var A = g.ans[p][g.i]; if (A && A.c === q.a) g.sc[p] += 100 + Math.round(50 * Math.max(0, 1 - A.ms / TV_Q_MS_)); }); g.phase = 'reveal'; g.at = now; }
  else if (g.phase === 'reveal' && now > g.at + TV_R_MS_) { if (++g.i >= g.qs.length) { g.phase = 'done'; var RC = CacheService.getScriptCache(); if (!RC.get('tvdone_' + g.code + '_' + (g.t0 || ''))) { RC.put('tvdone_' + g.code + '_' + (g.t0 || ''), '1', 21600); tvRecord_('live', g.sc); try { tvrLive_(g); } catch (e) {} } } else { g.phase = 'q'; g.at = now; } }
  return g; }
function tvView_(g, who) { var o = { code: g.code, host: g.host, guest: g.guest, phase: g.phase, i: g.i, n: g.qs.length, at: g.at, now: Date.now(), qms: TV_Q_MS_, sc: g.sc };
  if (g.phase === 'q' || g.phase === 'reveal') { var show = g.phase === 'reveal'; o.q = tvStrip_(g.qs[g.i], show); o.locked = { sam: g.ans.sam[g.i] != null, lewy: g.ans.lewy[g.i] != null }; o.mine = (g.ans[who] || {})[g.i];
    if (show) o.ans = { sam: g.ans.sam[g.i], lewy: g.ans.lewy[g.i] }; } return o; }
function triviaNew(who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var code = String(Math.floor(1000 + Math.random() * 9000));
  var g = { code: code, t0: Date.now(), host: who, guest: '', phase: 'lobby', i: 0, at: Date.now(), qs: triviaBuild_(8), ans: { sam: {}, lewy: {} }, sc: { sam: 0, lewy: 0 } };
  if (!g.qs.length) throw new Error('Finish some titles first!'); tvPut_(g); return tvView_(g, who); }
function triviaOpen() { return CacheService.getScriptCache().get('tvg_open') || ''; }
function triviaJoin(code, who) { var L = LockService.getScriptLock(); L.waitLock(5000); try { var g = tvGet_(String(code)); if (!g) throw new Error('No game ' + code); if (g.host !== who) g.guest = who; if (g.phase === 'lobby' && g.guest) { g.phase = 'q'; g.at = Date.now() + 2500; } tvPut_(g); return tvView_(g, who); } finally { L.releaseLock(); } }
function triviaState(code, who) { var g = tvGet_(String(code)); if (!g) return { phase: 'gone' }; var ph = g.phase, i = g.i; tvTick_(g); if (g.phase !== ph || g.i !== i) tvPut_(g); return tvView_(g, who); }
function triviaAnswer(code, who, i, c) { var L = LockService.getScriptLock(); L.waitLock(5000); try { var g = tvGet_(String(code)); if (!g || g.phase !== 'q' || g.i !== +i || g.ans[who][i] != null) return g ? tvView_(g, who) : { phase: 'gone' };
  g.ans[who][i] = { c: +c, ms: Math.max(0, Date.now() - g.at) }; tvTick_(g); tvPut_(g); return tvView_(g, who); } finally { L.releaseLock(); } }
/* ----- DAILY: 10 Qs, one fixed set per date (built by trigger, stored per date); results per person per date; catch-up for missed days ----- */
function tvToday_() { return tvUnlockInfo().day; } /* r55: the daily set unlocks at 9pm Sydney */
function tvDKey_(d) { return 'TRIVIA_D_' + d; }
function dailyTriviaBuild(date) { try { if (typeof date !== 'string' && +Utilities.formatDate(new Date(), 'Australia/Sydney', 'H') < 20) installTriviaTrigger9pm(); } catch (e) {} date = (typeof date === 'string' && /^\d{4}-\d\d-\d\d$/.test(date)) ? date : tvToday_(); var P = PropertiesService.getScriptProperties(), ex = P.getProperty(tvDKey_(date)); if (ex) return JSON.parse(ex);
  var d = { d: date, qs: triviaBuild_(10), ans: {} }, s = JSON.stringify(d); while (s.length > 8800 && d.qs.length > 5) { d.qs.pop(); s = JSON.stringify(d); } P.setProperty(tvDKey_(date), s);
  var all = P.getKeys().filter(function (k) { return k.indexOf('TRIVIA_D_') === 0; }).sort(); while (all.length > 30) P.deleteProperty(all.shift());
  if (date === tvToday_()) ['sam', 'lewy'].forEach(function (p) { if (tvPushOn_(p)) ntfy_(p, '🧠 Today\u2019s quiz is ready', d.qs.length + ' questions from stuff you\u2019ve finished. Keep the streak alive!', 'brain'); }); return d; }
function tvPushOn_(p) { return PropertiesService.getScriptProperties().getProperty('TRIVIA_PUSH_' + p) !== 'off'; }
/** Per-person toggle for quiz pings (ready + other-finished). */
function setTriviaPush(who, on) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); PropertiesService.getScriptProperties().setProperty('TRIVIA_PUSH_' + who, on ? 'on' : 'off'); return !!on; }
function getTriviaPush(who) { return tvPushOn_(who); }
function installTriviaTrigger() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyTriviaBuild') ScriptApp.deleteTrigger(t); }); ScriptApp.newTrigger('dailyTriviaBuild').timeBased().everyDays(1).atHour(5).inTimezone('Australia/Sydney').create(); }
function tvDay_(date) { var P = PropertiesService.getScriptProperties(), h = P.getProperty(tvDKey_(date || tvToday_())); return h ? JSON.parse(h) : (date && date !== tvToday_() ? null : dailyTriviaBuild()); }
function triviaDaily(who, date) { var d = tvDay_(date); if (!d) throw new Error('No set for ' + date); var o = who === 'sam' ? 'lewy' : 'sam', both = d.ans.sam && d.ans.lewy, mine = d.ans[who];
  return { d: d.d, today: d.d === tvToday_(), qs: d.qs.map(function (q) { return tvStrip_(q, !!mine); }), mine: mine || null, other: both ? d.ans[o] : (d.ans[o] ? 'done' : null), both: !!both, stats: triviaBoard() }; }
function triviaDays(who) { var P = PropertiesService.getScriptProperties(), all = P.getProperties(), out = [];
  Object.keys(all).filter(function (k) { return k.indexOf('TRIVIA_D_') === 0; }).sort().reverse().forEach(function (k) { try { var d = JSON.parse(all[k]); var pk = function (x) { return x ? { sc: x.sc, late: !!x.late, ok: x.ok, n: x.n || d.qs.length } : null; }; out.push({ d: d.d, n: d.qs.length, sam: pk(d.ans.sam), lewy: pk(d.ans.lewy) }); } catch (e) {} });
  return out; }
function triviaDailyAnswer(who, picks, ms, date) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var L = LockService.getScriptLock(); L.waitLock(5000);
  try { var P = PropertiesService.getScriptProperties(), d = tvDay_(date); if (!d) throw new Error('No set'); if (d.ans[who]) return triviaDaily(who, d.d); var sc = 0, ok = 0, today = tvToday_();
    d.qs.forEach(function (q, i) { if (+picks[i] === q.a) { ok++; sc += 100 + Math.round(50 * Math.max(0, 1 - (+(ms || [])[i] || TV_Q_MS_) / TV_Q_MS_)); } });
    d.ans[who] = { p: (picks || []).map(Number), sc: sc, ok: ok, n: d.qs.length, at: today, late: d.d !== today }; P.setProperty(tvDKey_(d.d), JSON.stringify(d));
    if (d.ans.sam && d.ans.lewy) tvRecord_('daily', { sam: d.ans.sam.sc, lewy: d.ans.lewy.sc });
    try { tvrDaily_(d); } catch (e) {}
    var oth = who === 'sam' ? 'lewy' : 'sam'; if (tvPushOn_(oth)) ntfy_(oth, '🧠 ' + (who === 'sam' ? 'Sam' : 'Lewy') + ' finished ' + (d.d === today ? 'today\u2019s' : d.d + '\u2019s') + ' quiz', d.ans[oth] ? 'Results are in. Tap to compare!' : sc + ' pts. Beat their score!', 'brain');
    return triviaDaily(who, d.d); } finally { L.releaseLock(); } }
/** Leaderboard: wins (daily+live), points, accuracy, current/best streak (on-time daily plays on consecutive days). */
function triviaBoard() { var S = tvStats_(), days = triviaDays(), P = PropertiesService.getScriptProperties(), B = { live: S.live || {}, daily: { sam: 0, lewy: 0, tie: 0 }, best: S.best || {} };
  ['sam', 'lewy'].forEach(function (p) { var pts = 0, ok = 0, n = 0, played = 0, late = 0; days.forEach(function (x) { var a = x[p]; if (!a) return; played++; pts += a.sc; if (a.late) late++; });
    var full = days.map(function (x) { try { return JSON.parse(P.getProperty(tvDKey_(x.d)) || '{}'); } catch (e) { return {}; } });
    full.forEach(function (d) { var a = (d.ans || {})[p]; if (a) { ok += a.ok != null ? a.ok : 0; n += a.n || (d.qs || []).length; } });
    var cur = 0, best = 0, run = 0, prev = null; days.slice().reverse().forEach(function (x) { var a = x[p]; if (a && !a.late) { run = prev && (new Date(x.d) - new Date(prev)) === 864e5 ? run + 1 : 1; prev = x.d; best = Math.max(best, run); } else if (a) { prev = x.d; } else { run = 0; prev = null; } });
    var lastD = days[0] && days[0][p] && !days[0][p].late ? run : (days[1] && days[1][p] && !days[1][p].late && !days[0][p] ? run : 0); cur = lastD;
    B[p] = { pts: pts, acc: n ? Math.round(ok / n * 100) : 0, played: played, late: late, streak: cur, bestStreak: best }; });
  days.forEach(function (x) { if (x.sam && x.lewy) B.daily[x.sam.sc > x.lewy.sc ? 'sam' : x.lewy.sc > x.sam.sc ? 'lewy' : 'tie']++; });
  ['sam', 'lewy'].forEach(function (p) { B[p].wins = (B.daily[p] || 0) + (B.live[p] || 0); }); B.runBest = S.runBest || {}; B.photo = S.photo || {}; B.perfect = {}; days.forEach(function (x) { ['sam', 'lewy'].forEach(function (p) { if (x[p] && x[p].ok != null && x[p].ok === x[p].n) B.perfect[p] = (B.perfect[p] || 0) + 1; }); }); B.streak = { sam: { cur: B.sam.streak, best: B.sam.bestStreak }, lewy: { cur: B.lewy.streak, best: B.lewy.bestStreak } }; return B; }
function triviaStats() { return triviaBoard(); }

/** Admin-only (API_KEY) health check: which props exist (booleans only, never values), ntfy reachability via a throwaway topic, and yt search sources. */
function diag_() { var P = PropertiesService.getScriptProperties(), has = {}; ['APP_TOKEN', 'NTFY_SAM', 'NTFY_LEWY', 'NTFY_TOKEN', 'TMDB_KEY', 'YT_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SPOTIFY_CLIENT_ID', 'SPOT_RT_sam', 'SPOT_RT_lewy', 'YT_RT_sam', 'YT_RT_lewy'].forEach(function (k) { has[k] = !!P.getProperty(k); });
  var nt = 0; try { nt = ntfySend_({ topic: 'logged-diag-' + Utilities.getUuid().slice(0, 8), title: 'diag', msg: 'diag', tags: 'test', click: '' }, 'diag', 2); } catch (e) { nt = String(e.message).slice(0, 80); }
  var src = {}; try { src.innertube = ytInnertube_('lofi beats').length; } catch (e) { src.innertube = 'ERR ' + String(e.message).slice(0, 60); }
  var trig = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  return { has: has, ntfyPost: nt, yt: src, triggers: trig }; }

/* ---------- Achievements synced per person (unlock dates + client-only events), so they survive new phones ---------- */
function achKey_(p) { return 'ACH_' + p; }
function getAch(who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(achKey_(who)) || '{}'); } catch (e) { return {}; } }
function saveAch(who, o) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var L = LockService.getScriptLock(); L.waitLock(5000);
  try { var cur = getAch(who), u = cur.u || {}, ev = cur.ev || {}; o = o || {};
    Object.keys(o.u || {}).forEach(function (k) { if (/^\w{1,20}$/.test(k) && !u[k]) u[k] = String(o.u[k]).slice(0, 10); });
    Object.keys(o.ev || {}).forEach(function (k) { if (!/^\w{1,20}$/.test(k)) return; var v = o.ev[k]; ev[k] = typeof v === 'number' ? Math.max(ev[k] || 0, v) : Array.isArray(v) ? (ev[k] || []).concat(v).filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(-60) : v; });
    var out = { u: u, ev: ev }, s = JSON.stringify(out); if (s.length > 8500) { ev.spun = (ev.spun || []).slice(-20); s = JSON.stringify(out); }
    PropertiesService.getScriptProperties().setProperty(achKey_(who), s); return out; } finally { L.releaseLock(); } }

/** YouTube auto-log: called by the app when a video is watched in Logged's own player (>=70% or to the end; <60s videos fully).
 *  Adds the video if missing, marks it watched for `who` (updateEntry stamps today's date), records the play, pings `who` to rate it
 *  (deep link opens the quick-rate sheet) and pings the other person as usual. Deduped per person+video. */
function ytAutoLog(item, who, w2) { who = who || w2; item = item || {}; if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var vid = String(item.id || '').replace(/[^\w-]/g, '').slice(0, 11); if (!vid) throw new Error('bad id');
  if (!item.full) throw new Error('not fully watched'); var C = CacheService.getScriptCache(), ck = 'yal_' + who + vid; if (C.get(ck)) return { dup: true };
  var L = LockService.getScriptLock(); L.waitLock(15000);
  try { if (C.get(ck)) return { dup: true }; C.put(ck, '1', 21600);
    var title = '', row = null, rows = getData().rows;
    rows.forEach(function (r) { if (r.type === 'YouTube' && r.ytm && r.ytm.id === vid) { row = r; title = r.title; } });
    if (!row) { if (!item.t) throw new Error('need title'); var f = {}; f[who + 'Watched'] = 'Not yet'; f.suggestedBy = who === 'sam' ? 'Sam' : 'Lewy'; var added = addYouTube({ k: 'video', id: vid, t: item.t, ch: item.ch, chId: item.chId, th: item.th }, f);
      title = (added && added.title) || String(item.t).trim().slice(0, 180); rows = getData().rows; rows.forEach(function (r) { if (r.title === title) row = r; }); }
    if (!row) throw new Error('row not found');
    if (row.ytw && row.ytw[who] && row.ytw[who][vid] && row[who + 'Watched'] === 'Yes') return { dup: true, title: row.title };
    var already = row[who + 'Watched'] === 'Yes', fx = {}; fx[who + 'Watched'] = 'Yes';
    if (!already) updateEntry(row.row, fx, row.title);
    try { ytWatched(row.title, who, vid); } catch (e) {}
    if (!already) { try { notifyLog_(who, 'updateEntry', [row.row, fx], { title: row.title }); } catch (e) {}
      ntfy_(who, '★ Rate ' + row.title + '?', 'You just watched it in Logged. Tap to rate.', 'star', 'https://isolaow.github.io/logged/app/?rate=' + encodeURIComponent(row.title)); }
    return { title: row.title, row: row.row, logged: !already };
  } finally { L.releaseLock(); } }

/** Video page data via YouTube's public watch-next endpoint (keyless): title, channel + avatar, views, date, description, up-next. Cached 6h. */
function ytInfo(vid) { vid = String(vid || '').replace(/[^\w-]/g, '').slice(0, 11); if (!vid) throw new Error('bad id'); var C = CacheService.getScriptCache(), h = C.get('yti_' + vid); if (h) return JSON.parse(h);
  var r = UrlFetchApp.fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { Cookie: 'SOCS=CAI; CONSENT=YES+1' },
    payload: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20241001.00.00', hl: 'en', gl: 'AU' } }, videoId: vid }) });
  if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode()); var d = JSON.parse(r.getContentText()), c = ((d.contents || {}).twoColumnWatchNextResults) || {}, pr = (((c.results || {}).results || {}).contents) || [], o = { id: vid, next: [] };
  var tx = function (x) { return x ? (x.simpleText || (x.runs || []).map(function (y) { return y.text; }).join('') || x.content || '') : ''; };
  pr.forEach(function (x) { var p = x.videoPrimaryInfoRenderer, s2 = x.videoSecondaryInfoRenderer;
    if (p) { o.t = tx(p.title); var vc = ((p.viewCount || {}).videoViewCountRenderer) || {}; o.views = tx(vc.shortViewCount) || tx(vc.viewCount); o.date = tx(p.relativeDateText) || tx(p.dateText); }
    if (s2) { var ow = ((s2.owner || {}).videoOwnerRenderer) || {}; o.ch = tx(ow.title); o.chId = ((((ow.title || {}).runs || [{}])[0].navigationEndpoint || {}).browseEndpoint || {}).browseId || ''; o.avatar = (((ow.thumbnail || {}).thumbnails || []).slice(-1)[0] || {}).url || '';
      o.subs = (((ow.subscriberCountText || {}).accessibility || {}).accessibilityData || {}).label || tx(ow.subscriberCountText); o.desc = String(((s2.attributedDescription || {}).content) || '').slice(0, 1500); } });
  ((((c.secondaryResults || {}).secondaryResults || {}).results) || []).forEach(function (x) { var l = x.lockupViewModel; if (!l || l.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO' || o.next.length >= 15) return;
    try { var m = l.metadata.lockupMetadataViewModel, rows = ((m.metadata || {}).contentMetadataViewModel || {}).metadataRows || [], parts = rows.map(function (rw) { return (rw.metadataParts || []).map(function (pp) { return (pp.text || {}).content || ''; }).join(' · '); });
      var dur = ''; JSON.stringify(l.contentImage || {}).replace(/"text":"(\d{1,2}(?::\d\d){1,2}|LIVE)"/, function (_, t) { dur = t; });
      o.next.push({ id: l.contentId, t: (m.title || {}).content || '', ch: parts[0] || '', meta: parts.slice(1).join(' · '), dur: dur, th: 'https://i.ytimg.com/vi/' + l.contentId + '/hqdefault.jpg' }); } catch (e) {} });
  try { C.put('yti_' + vid, JSON.stringify(o), 21600); } catch (e) {} return o; }

/** Spotify track search for the soundtrack picker, using whichever person's connected account (theirs first). */
function spotifySearch(q, who) { var P = PropertiesService.getScriptProperties(), cid = P.getProperty('SPOTIFY_CLIENT_ID'), C = CacheService.getScriptCache(), ck = 'sps2_' + Utilities.base64EncodeWebSafe(String(q)).slice(0, 200), h = C.get(ck); if (h) return JSON.parse(h);
  var tok = '', ps = who === 'lewy' ? ['lewy', 'sam'] : ['sam', 'lewy']; for (var i = 0; i < ps.length && !tok; i++) tok = spotTok_(ps[i]);
  if (!tok) throw new Error('SPOTIFY_NOT_CONNECTED');
  var rs = UrlFetchApp.fetch('https://api.spotify.com/v1/search?type=track&limit=10&market=AU&q=' + encodeURIComponent(String(q).slice(0, 100)), { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true }), j = JSON.parse(rs.getContentText() || '{}');
  if (rs.getResponseCode() !== 200) throw new Error('SPOTIFY_' + rs.getResponseCode() + ': ' + String((j.error || {}).message || '').slice(0, 80));
  var out = (((j.tracks || {}).items) || []).map(function (t) { return { id: t.id, n: t.name, a: (t.artists || []).map(function (x) { return x.name; }).join(', '), s: Math.round((t.duration_ms || 0) / 1000), pv: t.preview_url || '', art: ((t.album || {}).images || [{}]).slice(-1)[0].url || '' }; });
  if (out.length) C.put(ck, JSON.stringify(out), 21600); return out; }

/** Top comments for a video. YT_KEY → Data API commentThreads; else keyless innertube continuation; fallback Invidious. Cached 1h. Returns {items:[{a,av,t,likes,ago,rep}], next} */
function ytComments(vid, cont) { vid = String(vid || '').replace(/[^\w-]/g, '').slice(0, 11); if (!vid) throw new Error('bad id'); cont = String(cont || '');
  var C = CacheService.getScriptCache(), ck = 'ytc_' + vid + '_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, cont)).slice(0, 12), h = C.get(ck); if (h) return JSON.parse(h);
  var out = null, key = ytKey_();
  if (key && !/^IT:|^IV:/.test(cont)) try { var j = fetchJson_('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&order=relevance&maxResults=20&textFormat=plainText&videoId=' + vid + '&key=' + key + (cont ? '&pageToken=' + encodeURIComponent(cont) : '')) || {};
    if (j.items) out = { items: j.items.map(function (x) { var s = x.snippet.topLevelComment.snippet; return { a: s.authorDisplayName, av: s.authorProfileImageUrl, t: s.textDisplay, likes: s.likeCount, ago: s.publishedAt, rep: x.snippet.totalReplyCount }; }), next: j.nextPageToken || '' }; } catch (e) {}
  if (!out && (!cont || /^IT:/.test(cont))) try { out = ytCommentsIT_(vid, cont.slice(3)); } catch (e) {}
  if (!out) try { var pg = /^IV:/.test(cont) ? cont.slice(3) : '', iv = ['https://inv.nadeko.net', 'https://invidious.nerdvpn.de', 'https://yewtu.be'];
    for (var i = 0; i < iv.length && !out; i++) { var r = UrlFetchApp.fetch(iv[i] + '/api/v1/comments/' + vid + (pg ? '?continuation=' + encodeURIComponent(pg) : ''), { muteHttpExceptions: true }); if (r.getResponseCode() !== 200) continue; var jj = JSON.parse(r.getContentText());
      out = { items: (jj.comments || []).map(function (c) { return { a: c.author, av: ((c.authorThumbnails || []).slice(-1)[0] || {}).url || '', t: c.content, likes: c.likeCount, ago: c.publishedText, rep: (c.replies || {}).replyCount || 0 }; }), next: jj.continuation ? 'IV:' + jj.continuation : '' }; } } catch (e) {}
  if (!out) throw new Error('COMMENTS_UNAVAILABLE');
  out.items = out.items.slice(0, 20).map(function (c) { return { a: String(c.a || '').slice(0, 60), av: String(c.av || ''), t: String(c.t || '').slice(0, 1200), likes: c.likes == null ? '' : String(c.likes), ago: String(c.ago || ''), rep: Number(c.rep) || 0 }; });
  try { C.put(ck, JSON.stringify(out), 300); } catch (e) {} return out; }
function ytCommentsIT_(vid, tok) { var ctx = { client: { clientName: 'WEB', clientVersion: '2.20241001.00.00', hl: 'en', gl: 'AU' } }, H = { Cookie: 'SOCS=CAI; CONSENT=YES+1' };
  var post = function (b) { var r = UrlFetchApp.fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', { method: 'post', contentType: 'application/json', headers: H, muteHttpExceptions: true, payload: JSON.stringify(b) }); if (r.getResponseCode() !== 200) throw new Error('HTTP ' + r.getResponseCode()); return r.getContentText(); };
  if (!tok) { var t = post({ context: ctx, videoId: vid }), i = t.indexOf('"comment-item-section"'); if (i < 0) throw new Error('no comments'); var m = t.slice(i, i + 4000).match(/"token":"([^"]+)"/); if (!m) throw new Error('no token'); tok = m[1]; }
  var j = JSON.parse(post({ context: ctx, continuation: tok })), mu = (((j.frameworkUpdates || {}).entityBatchUpdate || {}).mutations) || [], items = [];
  mu.forEach(function (x) { var c = (x.payload || {}).commentEntityPayload; if (!c) return; var p = c.properties || {}, a = c.author || {}, tb = c.toolbar || {};
    items.push({ a: a.displayName, av: a.avatarThumbnailUrl, t: (p.content || {}).content, likes: tb.likeCountNotliked || tb.likeCountA11y || '', ago: p.publishedTime, rep: Number(tb.replyCount) || 0 }); });
  var s = JSON.stringify(j.onResponseReceivedEndpoints || []), nx = '', re = /"continuationItemRenderer":\{"trigger":"CONTINUATION_TRIGGER_ON_ITEM_SHOWN","continuationEndpoint":\{[^]*?"token":"([^"]+)"/g, mm; while ((mm = re.exec(s))) nx = mm[1];
  if (!items.length) throw new Error('empty'); return { items: items, next: nx ? 'IT:' + nx : '' }; }
/** Live chat for livestreams (keyless): first call without cont; poll with returned next. {live, items:[{id,a,av,t}], next, wait} */
function ytLiveChat(vid, cont) { vid = String(vid || '').replace(/[^\w-]/g, '').slice(0, 11); var ctx = { client: { clientName: 'WEB', clientVersion: '2.20241001.00.00', hl: 'en', gl: 'AU' } }, H = { Cookie: 'SOCS=CAI; CONSENT=YES+1' };
  if (!cont) { var C = CacheService.getScriptCache(), nl = C.get('nolc_' + vid); if (nl) return { live: false };
    var t = UrlFetchApp.fetch('https://www.youtube.com/live_chat?is_popout=1&v=' + vid, { headers: { Cookie: H.Cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36' }, muteHttpExceptions: true }).getContentText(), toks = [], re = /"continuation":"([^"]+)"/g, m;
    while ((m = re.exec(t)) && toks.length < 3) toks.push(m[1]); if (!toks.length) { C.put('nolc_' + vid, '1', 600); return { live: false }; } cont = toks[1] || toks[0]; }
  var r = UrlFetchApp.fetch('https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?prettyPrint=false', { method: 'post', contentType: 'application/json', headers: H, muteHttpExceptions: true, payload: JSON.stringify({ context: ctx, continuation: cont }) });
  if (r.getResponseCode() !== 200) return { live: false }; var lc = ((JSON.parse(r.getContentText()).continuationContents) || {}).liveChatContinuation; if (!lc) return { live: false };
  var items = []; (lc.actions || []).forEach(function (a) { var x = ((a.addChatItemAction || {}).item || {}).liveChatTextMessageRenderer; if (!x) return;
    items.push({ id: x.id, a: (x.authorName || {}).simpleText || '', av: (((x.authorPhoto || {}).thumbnails || [])[0] || {}).url || '', t: ((x.message || {}).runs || []).map(function (u) { return u.text || (u.emoji ? ((u.emoji.shortcuts || [])[0] || '') : ''); }).join('').slice(0, 300) }); });
  var c0 = (lc.continuations || [])[0] || {}, cd = c0.invalidationContinuationData || c0.timedContinuationData || {};
  return { live: true, items: items.slice(-40), next: cd.continuation || '', wait: Math.max(4000, Math.min(15000, Number(cd.timeoutMs) || 6000)) }; }

/* ---------- R25: per-person YouTube history (videos played in Logged). Script Properties YTH_<p>_<n> chunks, newest 150. ---------- */
function ythGet_(p) { var P = PropertiesService.getScriptProperties(), s = '', n = Number(P.getProperty('YTH_' + p + '_n') || 0); for (var i = 0; i < n; i++) s += P.getProperty('YTH_' + p + '_' + i) || ''; try { return s ? JSON.parse(s) : []; } catch (e) { return []; } }
function ythSet_(p, L) { var P = PropertiesService.getScriptProperties(), s = JSON.stringify(L.slice(0, 150)), old = Number(P.getProperty('YTH_' + p + '_n') || 0), n = Math.ceil(s.length / 8000), o = {};
  for (var i = 0; i < n; i++) o['YTH_' + p + '_' + i] = s.slice(i * 8000, (i + 1) * 8000); o['YTH_' + p + '_n'] = String(n); P.setProperties(o); for (var j = n; j < old; j++) P.deleteProperty('YTH_' + p + '_' + j); }
function ytHist() { return { sam: ythGet_('sam'), lewy: ythGet_('lewy') }; }
function ytHistPut(items, who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var lk = LockService.getScriptLock(); lk.waitLock(10000);
  try { var L = ythGet_(who), by = {}; L.forEach(function (x) { by[x.id] = x; });
    (items || []).slice(0, 80).forEach(function (it) { var id = String(it.id || '').replace(/[^\w-]/g, '').slice(0, 11); if (!id) return; var o = by[id] || { id: id };
      o.t = String(it.t || o.t || '').slice(0, 140); o.ch = String(it.ch || o.ch || '').slice(0, 60); o.p = Math.max(0, Math.round(Number(it.p) || 0)); o.d = Math.round(Number(it.d) || o.d || 0); o.at = Math.max(Number(o.at) || 0, Number(it.at) || Date.now()); by[id] = o; });
    L = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.at - a.at; }); ythSet_(who, L); return L.length; } finally { lk.releaseLock(); } }
function ytHistDel(id, who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var lk = LockService.getScriptLock(); lk.waitLock(10000); try { ythSet_(who, ythGet_(who).filter(function (x) { return x.id !== id; })); return true; } finally { lk.releaseLock(); } }

/* ---------- R28: Mood Pick — TMDB discover for something new (client excludes logged titles) ---------- */
function tmdbMood(o) { o = o || {}; var key = PropertiesService.getScriptProperties().getProperty('TMDB_KEY'); if (!key) throw new Error('TMDB not set');
  // [movie genres, tv genres]; tv genre ids differ (10759 Action&Adventure, 10765 Sci-Fi&Fantasy)
  var MG = { laugh: [[35], [35]], cry: [[18, 10749], [18]], scared: [[27, 53], [9648, 80, 10765]], think: [[9648, 878, 99], [9648, 10765, 99]], hype: [[28, 12], [10759]], cosy: [[16, 10751, 14], [16, 10751]] };
  var g = MG[o.mood] || MG.laugh, kinds = o.kind === 'movie' ? ['movie'] : o.kind === 'tv' ? ['tv'] : ['movie', 'tv'], ex = {}; (o.exclude || []).forEach(function (t) { ex[String(t).toLowerCase().replace(/[^a-z0-9]+/g, '')] = 1; });
  var C = CacheService.getScriptCache(), ck = 'mood5|' + [o.mood, o.kind, o.era, o.len, o.vibe, o.lang, o.fam].join('|'), yr = new Date().getFullYear(), kw = moodKw_(o.vibe, key);
  var fetchLevel = function (lvl) { var hk = ck + '|' + lvl, h = C.get(hk); if (h) return JSON.parse(h); var res = [];
    kinds.forEach(function (k) { var gi = k === 'movie' ? g[0] : g[1], dk = k === 'movie' ? 'primary_release_date' : 'first_air_date', q = ['api_key=' + encodeURIComponent(key), 'language=en-AU', 'sort_by=' + (o.fam === 'gem' && lvl <= 2 ? 'vote_average.desc' : 'popularity.desc')];
      if (kw && lvl <= 2) q.push('with_keywords=' + kw.split('|').join('%7C')); if (o.lang === 'en' && lvl <= 3) q.push('with_original_language=en'); if (o.lang === 'intl' && lvl <= 2) q.push('without_original_language=en');
      if (o.fam === 'gem' && lvl <= 2) q.push('vote_count.lte=' + (k === 'movie' ? 3000 : 1500));
      if (lvl <= 3) q.push('with_genres=' + (lvl <= 2 ? gi.join('%7C') : gi[0]));
      if (lvl === 0) q.push('vote_count.gte=' + (k === 'movie' ? 300 : 150), 'vote_average.gte=6.6'); else if (lvl <= 2) q.push('vote_count.gte=60', 'vote_average.gte=6'); else q.push('vote_count.gte=20');
      if (lvl <= 1) { if (o.era === 'new') q.push(dk + '.gte=' + (yr - 3) + '-01-01'); if (o.era === 'classic') q.push(dk + '.lte=2005-12-31'); } else if (lvl === 2) { if (o.era === 'new') q.push(dk + '.gte=' + (yr - 8) + '-01-01'); if (o.era === 'classic') q.push(dk + '.lte=2012-12-31'); }
      if (lvl === 0 && k === 'movie') { if (o.len === 'short') q.push('with_runtime.lte=100'); if (o.len === 'mid') q.push('with_runtime.lte=130'); }
      if (lvl === 0 && k === 'tv' && o.len === 'short') q.push('with_runtime.lte=35');
      var url = lvl >= 4 ? 'https://api.themoviedb.org/3/trending/' + k + '/week?api_key=' + encodeURIComponent(key) + '&language=en-AU' : 'https://api.themoviedb.org/3/discover/' + k + '?' + q.join('&');
      [1, 2].forEach(function (pg) { var j = fetchJson_(url + '&page=' + pg) || {}; (j.results || []).forEach(function (x) { res.push({ id: x.id, tv: k === 'tv', title: x.title || x.name, year: String(x.release_date || x.first_air_date || '').slice(0, 4), poster: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : '', overview: String(x.overview || '').slice(0, 220), vote: Math.round((x.vote_average || 0) * 10) / 10, gids: x.genre_ids || [] }); }); }); });
    try { C.put(hk, JSON.stringify(res), 1800); } catch (e) {} return res; };
  var out = [], seen = {}, lvl = 0;
  for (; lvl <= 4 && out.length < 6; lvl++) fetchLevel(lvl).forEach(function (x) { var n = String(x.title).toLowerCase().replace(/[^a-z0-9]+/g, ''); if (!x.poster || ex[n] || seen[x.tv + '|' + x.id]) return; seen[x.tv + '|' + x.id] = 1; x.close = lvl > 0; x.lvl = lvl; out.push(x); });
  return out; }

/* ================= R35: persistent per-person connections (server-side refresh tokens) =================
   Spotify: PKCE verifier is stashed server-side by state nonce, the code is exchanged HERE (works even if the redirect lands in Safari instead of the home-screen app).
   YouTube: OAuth authorization-code + offline access. Needs GOOGLE_CLIENT_SECRET (Script Property, server only). Refresh token YT_RT_<p>.
   Google "Testing" mode refresh tokens die after ~7 days → invalid_grant → token dropped, CONN_ERR_<svc>_<p>='expired' → app shows RECONNECT. */
var APP_REDIRECT_ = 'https://isolaow.github.io/logged/app/';
function connLock_(f) { var L = LockService.getScriptLock(); L.waitLock(15000); try { return f(); } finally { L.releaseLock(); } }
function connStatus(who) { var P = PropertiesService.getScriptProperties(), o = { spotifyReady: !!P.getProperty('SPOTIFY_CLIENT_ID'), youtubeReady: !!(P.getProperty('GOOGLE_CLIENT_ID') && P.getProperty('GOOGLE_CLIENT_SECRET')) };
  ['sam', 'lewy'].forEach(function (p) { o[p] = { sp: !!P.getProperty('SPOT_RT_' + p), spErr: P.getProperty('CONN_ERR_sp_' + p) || '', spAt: P.getProperty('CONN_AT_sp_' + p) || '',
    spPlay: /user-modify-playback-state/.test(P.getProperty('SPOT_SCOPE_' + p) || ''), spScopeKnown: P.getProperty('SPOT_SCOPE_' + p) != null, yt: !!P.getProperty('YT_RT_' + p), ytErr: P.getProperty('CONN_ERR_yt_' + p) || '', ytAt: P.getProperty('CONN_AT_yt_' + p) || '', ytImp: P.getProperty('YT_IMP_' + p) || '' }; }); return o; }
function connBegin(svc, verifier, who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); if (svc !== 'sp' && svc !== 'yt') throw new Error('svc?');
  var n = Utilities.getUuid().replace(/-/g, '').slice(0, 20), st = svc + '_' + who + '_' + n; CacheService.getScriptCache().put('CONNST_' + n, JSON.stringify({ svc: svc, p: who, v: String(verifier || '').slice(0, 200) }), 1200);
  var P = PropertiesService.getScriptProperties(), u;
  if (svc === 'yt') u = 'https://accounts.google.com/o/oauth2/v2/auth?' + ['client_id=' + encodeURIComponent(P.getProperty('GOOGLE_CLIENT_ID') || ''), 'redirect_uri=' + encodeURIComponent(APP_REDIRECT_), 'response_type=code', 'scope=' + encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly'), 'access_type=offline', 'prompt=consent', 'include_granted_scopes=true', 'state=' + st].join('&');
  else u = 'https://accounts.spotify.com/authorize?' + ['client_id=' + encodeURIComponent(P.getProperty('SPOTIFY_CLIENT_ID') || ''), 'response_type=code', 'redirect_uri=' + encodeURIComponent(APP_REDIRECT_), 'code_challenge_method=S256', 'code_challenge=' + encodeURIComponent(String(verifier ? Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier, Utilities.Charset.US_ASCII)).replace(/=+$/, '') : '')), 'scope=' + encodeURIComponent('user-read-recently-played user-top-read user-modify-playback-state user-read-playback-state user-read-currently-playing'), 'state=' + st].join('&');
  return { url: u, state: st }; }
function connFinish(code, state) { var m = String(state || '').match(/^(sp|yt)_(sam|lewy)_(\w{20})$/); if (!m || !code) throw new Error('bad state');
  var C = CacheService.getScriptCache(), raw = C.get('CONNST_' + m[3]); if (!raw) throw new Error('Link expired — tap CONNECT again'); var s = JSON.parse(raw); C.remove('CONNST_' + m[3]); if (s.svc !== m[1] || s.p !== m[2]) throw new Error('bad state');
  var P = PropertiesService.getScriptProperties(), p = s.p, r, j;
  if (s.svc === 'sp') { r = UrlFetchApp.fetch('https://accounts.spotify.com/api/token', { method: 'post', muteHttpExceptions: true, payload: { grant_type: 'authorization_code', code: String(code), redirect_uri: APP_REDIRECT_, client_id: P.getProperty('SPOTIFY_CLIENT_ID'), code_verifier: s.v } }); j = JSON.parse(r.getContentText() || '{}');
    if (!j.refresh_token) throw new Error('Spotify: ' + (j.error_description || j.error || 'no token')); P.setProperty('SPOT_RT_' + p, j.refresh_token); if (j.access_token) C.put('SPOT_AT_' + p, j.access_token, 3000); P.setProperty('SPOT_SCOPE_' + p, String(j.scope || '')); P.deleteProperty('CONN_ERR_sp_' + p); P.setProperty('CONN_AT_sp_' + p, new Date().toISOString()); try { spotifyPollOne_(p); } catch (e) {} }
  else { r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true, payload: { grant_type: 'authorization_code', code: String(code), redirect_uri: APP_REDIRECT_, client_id: P.getProperty('GOOGLE_CLIENT_ID'), client_secret: P.getProperty('GOOGLE_CLIENT_SECRET') } }); j = JSON.parse(r.getContentText() || '{}');
    if (!j.access_token) throw new Error('YouTube: ' + (j.error_description || j.error || 'no token')); if (j.refresh_token) P.setProperty('YT_RT_' + p, j.refresh_token); else if (!P.getProperty('YT_RT_' + p)) throw new Error('YouTube: Google sent no offline token — remove Logged in your Google account permissions and connect again');
    C.put('YT_AT_' + p, j.access_token, 3000); P.deleteProperty('CONN_ERR_yt_' + p); P.setProperty('CONN_AT_yt_' + p, new Date().toISOString()); }
  return connStatus(); }
function spotTok_(p) { var C = CacheService.getScriptCache(), t = C.get('SPOT_AT_' + p); if (t) return t; return connLock_(function () { t = C.get('SPOT_AT_' + p); if (t) return t; var P = PropertiesService.getScriptProperties(), rt = P.getProperty('SPOT_RT_' + p); if (!rt) return '';
  var j = JSON.parse(UrlFetchApp.fetch('https://accounts.spotify.com/api/token', { method: 'post', muteHttpExceptions: true, payload: { grant_type: 'refresh_token', refresh_token: rt, client_id: P.getProperty('SPOTIFY_CLIENT_ID') } }).getContentText() || '{}');
  if (!j.access_token) { if (j.error === 'invalid_grant') { P.deleteProperty('SPOT_RT_' + p); P.setProperty('CONN_ERR_sp_' + p, 'expired'); } return ''; }
  if (j.refresh_token) P.setProperty('SPOT_RT_' + p, j.refresh_token); if (j.scope) P.setProperty('SPOT_SCOPE_' + p, String(j.scope)); C.put('SPOT_AT_' + p, j.access_token, 3000); return j.access_token; }); }
function ytTok_(p) { var C = CacheService.getScriptCache(), t = C.get('YT_AT_' + p); if (t) return t; return connLock_(function () { t = C.get('YT_AT_' + p); if (t) return t; var P = PropertiesService.getScriptProperties(), rt = P.getProperty('YT_RT_' + p); if (!rt) return '';
  var j = JSON.parse(UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true, payload: { grant_type: 'refresh_token', refresh_token: rt, client_id: P.getProperty('GOOGLE_CLIENT_ID'), client_secret: P.getProperty('GOOGLE_CLIENT_SECRET') } }).getContentText() || '{}');
  if (!j.access_token) { if (j.error === 'invalid_grant') { P.deleteProperty('YT_RT_' + p); P.setProperty('CONN_ERR_yt_' + p, 'expired'); } return ''; }
  C.put('YT_AT_' + p, j.access_token, Math.min(3000, (j.expires_in || 3600) - 300)); return j.access_token; }); }
/** Subs / likes / playlists for this person, fetched server-side with their stored token. */
function ytImportData(who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var t = ytTok_(who); if (!t) throw new Error(PropertiesService.getScriptProperties().getProperty('CONN_ERR_yt_' + who) === 'expired' ? 'YT_EXPIRED' : 'YT_NOT_CONNECTED');
  var g = function (u) { try { return JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/youtube/v3/' + u, { headers: { Authorization: 'Bearer ' + t }, muteHttpExceptions: true }).getContentText() || '{}'); } catch (e) { return {}; } };
  var R = [g('subscriptions?part=snippet&mine=true&maxResults=50'), g('videos?part=snippet&myRating=like&maxResults=25'), g('playlists?part=snippet&mine=true&maxResults=25')];
  PropertiesService.getScriptProperties().setProperty('YT_IMP_' + who, new Date().toISOString()); return R; }
function connDisconnect(svc, who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); var P = PropertiesService.getScriptProperties(), C = CacheService.getScriptCache();
  if (svc === 'sp') { spotifyDisconnect(who); C.remove('SPOT_AT_' + who); } else if (svc === 'yt') { var rt = P.getProperty('YT_RT_' + who); if (rt) try { UrlFetchApp.fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(rt), { method: 'post', muteHttpExceptions: true }); } catch (e) {} P.deleteProperty('YT_RT_' + who); P.deleteProperty('YT_IMP_' + who); C.remove('YT_AT_' + who); }
  P.deleteProperty('CONN_ERR_' + svc + '_' + who); P.deleteProperty('CONN_AT_' + svc + '_' + who); return connStatus(); }
/** daily: keeps both tokens warm (Spotify rotation) and flags expiry early so the app can prompt a reconnect. */
function connKeepAlive() { ['sam', 'lewy'].forEach(function (p) { try { CacheService.getScriptCache().remove('SPOT_AT_' + p); spotTok_(p); } catch (e) {} try { CacheService.getScriptCache().remove('YT_AT_' + p); ytTok_(p); } catch (e) {} }); }

/* ===== R38: per-person Interested / Not interested. Script Property INT_<p> = {key: {v:'y'|'n', t:title, at:ms, ...meta}}. key: 'r:<title>' list row, 't:<movie|tv>:<tmdbId>' new title, 'yt:<videoId>' YouTube. ===== */
function intWho_(w) { w = String(w || '').toLowerCase(); if (w !== 'sam' && w !== 'lewy') throw new Error('bad person'); return w; }
function getInterest(who) { var o = {}; ['sam', 'lewy'].forEach(function (p) { try { o[p] = JSON.parse(PropertiesService.getScriptProperties().getProperty('INT_' + p) || '{}'); } catch (e) { o[p] = {}; } }); return o; }
function setInterest(who, key, v, meta) { who = intWho_(who); key = String(key || '').slice(0, 160); if (!/^(r|t|yt):/.test(key)) throw new Error('bad key'); v = v === 'y' || v === 'n' ? v : '';
  return connLock_(function () { var P = PropertiesService.getScriptProperties(), k = 'INT_' + who, o = {}; try { o = JSON.parse(P.getProperty(k) || '{}'); } catch (e) {}
    if (!v) delete o[key]; else { var m = meta || {}; o[key] = { v: v, at: Date.now(), t: String(m.t || '').slice(0, 120), y: String(m.y || '').slice(0, 4), p: String(m.p || '').slice(0, 200), k: String(m.k || '').slice(0, 8) }; }
    var j = JSON.stringify(o); if (j.length > 8500) { var ks = Object.keys(o).sort(function (a, b) { return o[a].at - o[b].at; }); while (j.length > 8500 && ks.length) { var x = ks.shift(); o[x].p = ''; j = JSON.stringify(o); } }
    P.setProperty(k, j); return o; }); }
/** Brand-new / trending titles for the Interested deck (cached 3h). */
function tmdbFresh() { var key = PropertiesService.getScriptProperties().getProperty('TMDB_KEY'); if (!key) throw new Error('TMDB not set'); var C = CacheService.getScriptCache(), h = C.get('fresh1'); if (h) return JSON.parse(h);
  var out = [], seen = {}, add = function (x, k) { k = k || x.media_type; if (k !== 'movie' && k !== 'tv') return; var id = k + x.id; if (seen[id] || !x.poster_path) return; seen[id] = 1; out.push({ id: x.id, tv: k === 'tv', title: x.title || x.name, year: String(x.release_date || x.first_air_date || '').slice(0, 4), poster: 'https://image.tmdb.org/t/p/w342' + x.poster_path, overview: String(x.overview || '').slice(0, 220), vote: Math.round((x.vote_average || 0) * 10) / 10 }); };
  [1, 2, 3].forEach(function (pg) { ((fetchJson_('https://api.themoviedb.org/3/trending/all/week?language=en-AU&page=' + pg + '&api_key=' + encodeURIComponent(key)) || {}).results || []).forEach(function (x) { add(x); }); });
  ((fetchJson_('https://api.themoviedb.org/3/movie/now_playing?language=en-AU&region=AU&api_key=' + encodeURIComponent(key)) || {}).results || []).forEach(function (x) { add(x, 'movie'); });
  ((fetchJson_('https://api.themoviedb.org/3/tv/on_the_air?language=en-AU&api_key=' + encodeURIComponent(key)) || {}).results || []).forEach(function (x) { add(x, 'tv'); });
  try { C.put('fresh1', JSON.stringify(out), 10800); } catch (e) {} return out; }

/** Mood Pick "world" → TMDB keyword ids (resolved by name via /search/keyword, cached a week). */
function moodKw_(v, key) { var N = { medieval: ['medieval'], fantasy: ['magic', 'sword and sorcery'], ancient: ['ancient rome', 'ancient greece'], space: ['space', 'outer space'], cyber: ['cyberpunk', 'dystopia'], heist: ['heist'], apoc: ['post-apocalyptic future'], town: ['small town'], mafia: ['mafia', 'organized crime'], war: ['world war ii', 'war'], eighties: ['1980s'], school: ['high school'], road: ['road trip'], time: ['time travel'], haunt: ['haunted house'], killer: ['serial killer'], zombie: ['zombie'], hero: ['superhero'] }[v];
  if (!N) return ''; var C = CacheService.getScriptCache(), ck = 'mkw1|' + v, h = C.get(ck); if (h != null) return h;
  var ids = N.map(function (n) { var r = ((fetchJson_('https://api.themoviedb.org/3/search/keyword?query=' + encodeURIComponent(n) + '&api_key=' + encodeURIComponent(key)) || {}).results || []); var e = r.filter(function (x) { return String(x.name).toLowerCase() === n; })[0] || r[0]; return e ? e.id : null; }).filter(Boolean).join('|');
  C.put(ck, ids, 604800); return ids; }

/* ===== R42: SOUNDTRACK — auto tracklist per title (Spotify album + 'songs from' playlists → iTunes fallback), cached; Spotify Connect playback ===== */
function ostNorm_(t) { return String(t || '').toLowerCase().replace(/\s*\((s\d+|\d{4})\)\s*$/, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim(); }
function spGet_(tok, url) { var r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true }); return r.getResponseCode() === 200 ? JSON.parse(r.getContentText() || '{}') : null; }
function ostAlbum(title, year, kind, seasons, who) { var base = String(title || '').replace(/\s*\((S\d+|\d{4})\)\s*$/i, '').trim(), nb = ostNorm_(base); if (!nb) throw new Error('title?');
  var C = CacheService.getScriptCache(), ck = 'ostA3|' + nb + '|' + (year || ''), h = C.get(ck); if (h) return JSON.parse(h);
  var tok = '', ps = who === 'lewy' ? ['lewy', 'sam'] : ['sam', 'lewy']; for (var i = 0; i < ps.length && !tok; i++) tok = spotTok_(ps[i]);
  var out = { title: base, groups: [], src: '' }, OSTW = /(soundtrack|original score|music from|songs from|ost\b|original series|motion picture|music by)/i;
  var trk = function (t, al) { return { id: t.id, uri: t.uri, n: t.name, a: (t.artists || []).map(function (x) { return x.name; }).join(', '), s: Math.round((t.duration_ms || 0) / 1000), pv: t.preview_url || '', art: (((al || t.album || {}).images) || []).slice(-1).concat([{}])[0].url || '' }; };
  if (tok) { var nameOk = function (n) { var x = ostNorm_(n); return x.indexOf(nb) === 0 || x.indexOf(' ' + nb + ' ') >= 0 || x.indexOf(nb + ' ') >= 0; };
    var A = ((spGet_(tok, 'https://api.spotify.com/v1/search?type=album&limit=10&market=AU&q=' + encodeURIComponent(base + ' soundtrack')) || {}).albums || {}).items || [];
    A = A.filter(function (a) { return a && nameOk(a.name) && OSTW.test(a.name + ' ' + (a.album_type || '')); });
    var yr = Number(year) || 0; A.sort(function (a, b) { var d = function (x) { var y = Number(String(x.release_date || '').slice(0, 4)) || 0; return (yr ? Math.min(Math.abs(y - yr), 5) : 0) + (/score/i.test(x.name) ? 3 : 0) + (/(deluxe|anniversary|expanded)/i.test(x.name) ? 1 : 0); }; return d(a) - d(b); });
    var seen = {}, sn = Number(seasons) || 0;
    if (kind === 'tv' && sn > 1) for (var s = 1; s <= Math.min(sn, 8); s++) { var a = A.filter(function (x) { return new RegExp('season ' + s + '\\b|\\bs' + s + '\\b|series ' + s + '\\b', 'i').test(x.name); })[0]; if (a && !seen[a.id]) { seen[a.id] = 1; out.groups.push({ h: 'SEASON ' + s, al: a.name, url: (a.external_urls || {}).spotify || '', id: a.id }); } }
    if (!out.groups.length && A[0]) { seen[A[0].id] = 1; out.groups.push({ h: 'OFFICIAL SOUNDTRACK', al: A[0].name, url: (A[0].external_urls || {}).spotify || '', id: A[0].id }); }
    if (out.groups.length === 1 && !/score/i.test(out.groups[0].al)) { var sc = A.filter(function (x) { return !seen[x.id] && /score/i.test(x.name); })[0]; if (sc) { seen[sc.id] = 1; out.groups.push({ h: 'ORIGINAL SCORE', al: sc.name, url: (sc.external_urls || {}).spotify || '', id: sc.id }); } }
    out.groups.forEach(function (g) { var j = spGet_(tok, 'https://api.spotify.com/v1/albums/' + g.id + '?market=AU') || {}; g.tracks = ((j.tracks || {}).items || []).map(function (t) { return trk(t, j); }); });
    var PL = ((spGet_(tok, 'https://api.spotify.com/v1/search?type=playlist&limit=8&market=AU&q=' + encodeURIComponent('songs from ' + base)) || {}).playlists || {}).items || [];
    var pl = PL.filter(function (x) { return x && nameOk(x.name.replace(/^(songs|music) (from|in) /i, '')) && /(songs|music|soundtrack|ost)/i.test(x.name); })[0];
    if (pl) { var pj = spGet_(tok, 'https://api.spotify.com/v1/playlists/' + pl.id + '/tracks?market=AU&limit=60&fields=items(track(id,uri,name,duration_ms,preview_url,artists(name),album(images)))') || {}, have = {}; out.groups.forEach(function (g) { (g.tracks || []).forEach(function (t) { have[t.id] = 1; }); });
      var T = (pj.items || []).map(function (x) { return x.track; }).filter(function (t) { return t && t.id && !have[t.id]; }).map(function (t) { return trk(t); }); if (T.length) out.groups.push({ h: 'SONGS FROM ' + base.toUpperCase(), al: pl.name, url: (pl.external_urls || {}).spotify || '', tracks: T, pl: 1 }); }
    if (out.groups.length) out.src = 'spotify'; }
  if (!out.groups.length) { var j2 = fetchJson_('https://itunes.apple.com/search?country=AU&media=music&entity=album&limit=10&term=' + encodeURIComponent(base + ' soundtrack')) || {}, al = (j2.results || []).filter(function (x) { return nameOk2_(x.collectionName, nb) && OSTW.test(x.collectionName); })[0];
    if (al) { var lk = fetchJson_('https://itunes.apple.com/lookup?country=AU&entity=song&id=' + al.collectionId) || {}; var T2 = (lk.results || []).filter(function (x) { return x.wrapperType === 'track'; }).map(function (x) { return { id: 'it' + x.trackId, uri: '', n: x.trackName, a: x.artistName, s: Math.round((x.trackTimeMillis || 0) / 1000), pv: x.previewUrl || '', art: x.artworkUrl60 || '' }; });
      if (T2.length) { out.groups.push({ h: 'OFFICIAL SOUNDTRACK', al: al.collectionName, url: al.collectionViewUrl || '', tracks: T2 }); out.src = 'itunes'; } } }
  out.groups = out.groups.filter(function (g) { return g.tracks && g.tracks.length; }); out.at = Date.now();
  try { C.put(ck, JSON.stringify(out), out.groups.length ? 21600 : 3600); } catch (e) {} return out; }
function nameOk2_(n, nb) { var x = ostNorm_(n); return x.indexOf(nb) === 0 || x.indexOf(nb + ' ') >= 0; }
function spCall_(who, method, path, body) { var p = intWho_(who), tok = spotTok_(p); if (!tok) return { code: 401, err: 'NOT_CONNECTED' };
  var o = { method: method, headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true, contentType: 'application/json' }; if (body) o.payload = JSON.stringify(body); else if (method !== 'get') o.payload = '';
  var r = UrlFetchApp.fetch('https://api.spotify.com/v1' + path, o), c = r.getResponseCode(), t = r.getContentText(), j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) {} var er = ((j.error || {}).reason || (j.error || {}).message || ''); if ((c === 401 || c === 403) && /permission|scope/i.test(er)) return { code: 403, j: j, err: 'scope', scope: 1 }; return { code: c, j: j, err: er }; }
function spPlay(who, uris, offset) { uris = (uris || []).filter(function (u) { return /^spotify:track:\w+$/.test(u); }).slice(0, 50); if (!uris.length) throw new Error('no track');
  var body = { uris: uris, offset: { position: Math.max(0, Math.min(uris.length - 1, Number(offset) || 0)) } }, r = spCall_(who, 'put', '/me/player/play', body);
  if (r.code === 204 || r.code === 202 || r.code === 200) return { ok: 1 };
  if (r.code === 401 && r.err === 'NOT_CONNECTED') return { needConnect: 1 };
  if (r.scope) return { needScope: 1 };
  if (r.code === 403 && /premium/i.test(r.err)) return { needPremium: 1 };
  if (r.code === 404 || /NO_ACTIVE_DEVICE/.test(r.err)) { var d = spCall_(who, 'get', '/me/player/devices'), D = ((d.j || {}).devices || []).filter(function (x) { return !x.is_restricted; });
    if (d.scope) return { needScope: 1 }; if (!D.length) return { needDevice: 1 };
    var dv = D.filter(function (x) { return x.type === 'Smartphone'; })[0] || D[0], r2 = spCall_(who, 'put', '/me/player/play?device_id=' + encodeURIComponent(dv.id), body);
    if (r2.code === 204 || r2.code === 202 || r2.code === 200) return { ok: 1, device: dv.name }; return { needDevice: 1, err: r2.err }; }
  return { err: r.code + ' ' + r.err }; }
function spCtl(who, op) { var m = { pause: ['put', '/me/player/pause'], resume: ['put', '/me/player/play'], next: ['post', '/me/player/next'], prev: ['post', '/me/player/previous'] }[op]; if (!m) throw new Error('op?'); var r = spCall_(who, m[0], m[1]);
  return r.code < 300 ? { ok: 1 } : r.scope ? { needScope: 1 } : { err: r.code + ' ' + r.err }; }
function spNow(who) { var r = spCall_(who, 'get', '/me/player/currently-playing?market=AU'); if (r.code === 204) return { idle: 1 }; if (r.code !== 200) return r.scope ? { needScope: 1 } : { err: r.code + ' ' + r.err };
  var t = (r.j || {}).item || {}; return { playing: !!r.j.is_playing, n: t.name || '', a: (t.artists || []).map(function (x) { return x.name; }).join(', '), uri: t.uri || '', p: r.j.progress_ms || 0, d: t.duration_ms || 0, art: (((t.album || {}).images) || []).slice(-1).concat([{}])[0].url || '' }; }

/* ===== R44: YouTube trailer → TMDB title. Returns null unless the video is clearly a trailer/teaser AND the cleaned title matches a TMDB title exactly (normalised). ===== */
function trailerMatch(vt, ch) { vt = String(vt || ''); if (!/\b(trailer|teaser)\b/i.test(vt)) return null; var key = PropertiesService.getScriptProperties().getProperty('TMDB_KEY'); if (!key) return null;
  var C = CacheService.getScriptCache(), ck = 'trm1|' + Utilities.base64EncodeWebSafe(vt.slice(0, 120)), h = C.get(ck); if (h) return JSON.parse(h);
  var STU = ['netflix', 'hbo max', 'hbo', 'max', 'prime video', 'amazon prime video', 'amazon mgm studios', 'apple tv\\+?', 'apple tv plus', 'disney\\+?', 'disney plus', 'hulu', 'marvel entertainment', 'marvel studios', 'marvel', 'warner bros\\.? pictures', 'warner bros\\.?', 'universal pictures', 'universal', 'sony pictures entertainment', 'sony pictures', 'paramount pictures', 'paramount\\+?', 'a24', 'lionsgate movies', 'lionsgate', 'focus features', 'neon', '20th century studios', 'searchlight pictures', 'pixar', 'dreamworks', 'peacock', 'fx', 'showtime', 'bbc', 'imdb', 'rotten tomatoes trailers', 'ign', 'movieclips trailers', 'kinocheck international', 'kinocheck'];
  var y = (vt.match(/\b(19|20)\d{2}\b/) || [])[0] || '', t = vt.replace(/[\[(【].*?[\])】]/g, ' ').replace(/[|｜–—:-]\s*(official|teaser|final|main|new|international)?\s*(trailer|teaser).*$/i, ' ');
  t = t.split(/\s[|｜]\s/)[0].replace(/\b(official|final|main|new|international|teaser|trailer|hd|4k|uhd|#?\d\b|tv spot|clip)\b/gi, ' ').replace(/\b(19|20)\d{2}\b/g, ' ');
  if (ch) t = t.replace(new RegExp(String(ch).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
  t = t.replace(new RegExp('\\b(' + STU.join('|') + ')\\b', 'ig'), ' ').replace(/\b(season|series)\s*\d+\b/ig, ' ').replace(/[|｜–—:,'"!]+\s*$/g, '').replace(/\s{2,}/g, ' ').replace(/^[\s\-–—:|]+|[\s\-–—:|]+$/g, '').trim();
  var n = function (x) { return String(x || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ''); }; if (n(t).length < 2) return null;
  var j = fetchJson_('https://api.themoviedb.org/3/search/multi?language=en-AU&include_adult=false&query=' + encodeURIComponent(t) + '&api_key=' + encodeURIComponent(key)) || {};
  var R = (j.results || []).filter(function (x) { return (x.media_type === 'movie' || x.media_type === 'tv') && n(x.title || x.name) === n(t); });
  if (y) R.sort(function (a, b) { var d = function (x) { return Math.abs((Number(String(x.release_date || x.first_air_date || '').slice(0, 4)) || 0) - Number(y)); }; return d(a) - d(b); });
  var x = R[0], out = x ? { id: x.id, tv: x.media_type === 'tv', title: x.title || x.name, year: String(x.release_date || x.first_air_date || '').slice(0, 4), poster: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : '', q: t } : null;
  try { C.put(ck, JSON.stringify(out), 21600); } catch (e) {} return out; }

/* R52: TMDB genre/keyword/era/runtime profile for "what we don't like" (cached per title, read-only) */
function tmdbProfile(items) { var C = CacheService.getScriptCache(), out = {}, t0 = Date.now();
  (items || []).slice(0, 40).forEach(function (it) { var key = String(it.k || it.t || it.id || ''); if (!key) return; var ck = 'tpf1|' + (it.tv ? 't' : 'm') + '|' + String(it.id || it.t).slice(0, 180), h = C.get(ck); if (h) { out[key] = JSON.parse(h); return; }
    if (Date.now() - t0 > 20000) return; try { var kind = it.tv ? 'tv' : 'movie', id = it.id;
      if (!id && it.t) { var s = tmdb_('search/' + kind, { query: String(it.t).replace(/\s*\((S\d+|\d{4})\)\s*$/i, '') }) || {}; id = ((s.results || [])[0] || {}).id; }
      if (!id) { C.put(ck, JSON.stringify(null), 21600); return; }
      var d = tmdb_(kind + '/' + id, { append_to_response: 'keywords' }) || {}, kw = ((d.keywords || {}).keywords || (d.keywords || {}).results || []).map(function (x) { return x.name; }).slice(0, 12);
      var o = { g: (d.genres || []).map(function (x) { return x.name; }), kw: kw, yr: String(d.release_date || d.first_air_date || '').slice(0, 4), rt: d.runtime || ((d.episode_run_time || [])[0]) || 0 };
      out[key] = o; C.put(ck, JSON.stringify(o), 604800); } catch (e) {} });
  return out; }
