/* Node unit test for server-side vote-skip + daily scoring (Apps Script globals stubbed; no network, no real data). */
const fs = require('fs'), vm = require('vm'), D = process.argv[2] || '/workspace/watchlist/appscript';
const store = {}, props = {}; const ctx = { console, JSON, Math, Date, String, Number, Object, Array, isNaN,
  CacheService: { getScriptCache: () => ({ get: k => store[k] || null, put: (k, v) => { store[k] = v; } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; }, getKeys: () => Object.keys(props), getProperties: () => props }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }, Utilities: { base64EncodeWebSafe: b => Buffer.from(b).toString('base64'), computeDigest: (a, s) => require('crypto').createHash('md5').update(s).digest(), DigestAlgorithm: {}, formatDate: () => '2026-10-14' } };
vm.createContext(ctx); for (const f of ['Code.gs', 'B55.gs', 'B56.gs']) vm.runInContext(fs.readFileSync(D + '/' + f, 'utf8'), ctx);
let pass = 0, fail = 0; const ok = (n, v, d) => { v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); };
const g = { code: '1234', host: 'sam', guest: 'lewy', phase: 'q', i: 0, at: Date.now(), qs: [{ q: 'Q1?', opts: ['a', 'b'], a: 1, kind: 'year' }, { q: 'Q2?', opts: ['a', 'b'], a: 0 }], ans: { sam: {}, lewy: {} }, sc: { sam: 0, lewy: 0 } };
ctx.tvPut_(g);
let v = ctx.triviaVoteSkip('1234', 'sam', 0); ok('live: one vote does not skip', v.phase === 'q' && v.skipV.sam === 1 && !v.skipped, v.skipV);
v = ctx.triviaVoteSkip('1234', 'lewy', 0); ok('live: both votes skip → reveal, skipped, no points', v.phase === 'reveal' && v.skipped && v.sc.sam === 0 && v.sc.lewy === 0, { ph: v.phase, sc: v.sc });
ok('skip logged with question id', ctx.triviaSkips().length === 1 && ctx.triviaSkips()[0].mode === 'live' && !!ctx.triviaSkips()[0].id, ctx.triviaSkips()[0]);
console.log(pass + '/' + (pass + fail)); process.exit(fail ? 1 : 0);
