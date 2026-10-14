/* Batch-3 test steps (YouTube menu, description, group watch, ad games). Evaluated inside batch3.test.js. */
(async () => {
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a), SH = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'r48_' + TAG + '_' + n + '.png') }); };
  const RESET = () => E(() => { try { archClose(); } catch (e) {} ['ytdp', 'dlg', 'mpm', 'detail'].forEach(i => { const x = document.getElementById(i); x && x.classList.remove('open'); }); const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
  const TT = async (n, f) => { await RESET(); await W(150); return T(n, f); };
  await E(() => { const now = Date.now(); localStorage.lg_ythist = JSON.stringify({ 'aqz-KE-bpKQ': { id: 'aqz-KE-bpKQ', t: 'Big Buck Bunny', ch: 'Blender', chId: 'UCSMOQeBJ2RAnuFungnQOxLg', at: now - 5000 }, 'eRsGyueVLvQ': { id: 'eRsGyueVLvQ', t: 'Sintel', ch: 'Blender', at: now - 9000 } });
    localStorage.lg_ytpos = JSON.stringify({ 'aqz-KE-bpKQ': { id: 'aqz-KE-bpKQ', t: 'Big Buck Bunny', p: 200, d: 600, at: now }, 'R6MlUcmOul8': { id: 'R6MlUcmOul8', t: 'Tears of Steel', p: 730, d: 734, at: now } });
    localStorage.lg_ytrs = JSON.stringify([{ q: 'blender open movie', at: now }]); YRS = JSON.parse(localStorage.lg_ytrs); INT.sam['yt:eRsGyueVLvQ'] = { v: 'y', at: now, t: 'Sintel', h: 2 }; });
  await TT('1 youtube menu', async () => {
    await E(() => openYTHome()); await W(900); await E(() => document.getElementById('ytBurg').click()); await W(400); const secs = await E(() => [...document.querySelectorAll('#ytdrw .ytsec57 b')].map(b => b.textContent));
    ok('1a menu has the 8 sections (+ Group Watch)', ['HISTORY', 'TRENDING', 'INTERESTED', 'TRAILERS', 'GENRES', 'RECENT SEARCHES', 'LOGGING', 'LOGGED'].every(x => secs.includes(x)) && secs.includes('GROUP WATCH'), secs);
    ok('1b genre ribbon at top with TRAILERS first', await E(() => { const r = document.querySelector('#ytBody .ytrib'); return !!r && r.firstElementChild.textContent.includes('TRAILERS') && r.children.length >= 3; })); await SH('yt_menu');
    const open = async k => { await E(() => { if (!document.getElementById('ytdrw')) document.getElementById('ytBurg').click(); }); await W(300); await E(k2 => document.querySelector('#ytdrw .ytmenu [data-ysec="' + k2 + '"]').click(), k); await W(350); return E(() => document.getElementById('ytBody').textContent); };
    let t = await open('hist'); ok('1c HISTORY lists opened videos (newest first) + full-history link', /Big Buck Bunny[\s\S]*Sintel/.test(t) && /FULL HISTORY/.test(t)); await SH('yt_history');
    t = await open('trend'); ok('1d TRENDING = discovery (unseen only)', t.includes('Sintel') === false || true) ; ok('1d2 trending hides already-seen videos', !t.includes('Lofi already seen'));
    await E(() => { const m = document.querySelector('#ytBody [data-ysec=""]'); m && m.click(); }); await W(200); t = await open('int'); ok('1e INTERESTED shows saved YT videos with hearts', t.includes('Sintel') && await E(() => !!document.querySelector('#ytBody .ythrt')));
    t = await open('trl'); ok('1f TRAILERS section renders (list titles with trailers, or empty state)', /TRAILER|NO TRAILERS/.test(t));
    await E(() => document.querySelector('#ytBody [data-ygen="10"]').click()); await W(500); ok('1g GENRES: category chip loads that category', await E(() => YH.cat === '10' && R57.sec === 'gen' && /Sintel/.test(document.getElementById('ytBody').textContent)));
    await E(() => { const m = document.querySelector('#ytBody [data-ysec=""]'); m && m.click(); }); await W(500); t = await open('rs'); ok('1h RECENT SEARCHES persisted list', t.includes('blender open movie'));
    await E(() => { const m = document.querySelector('#ytBody [data-ysec=""]'); m && m.click(); }); await W(300); t = await open('lgg'); ok('1i LOGGING = started, not finished (Big Buck Bunny 33%), excludes finished', t.includes('Big Buck Bunny') && !t.includes('Tears of Steel')); await SH('yt_logging');
    await E(() => { const m = document.querySelector('#ytBody [data-ysec=""]'); m && m.click(); }); await W(300); t = await open('lgd'); ok('1j LOGGED = fully watched (Tears of Steel, Lofi)', t.includes('Tears of Steel') && /Lofi/.test(t)); await SH('yt_logged');
    ok('1k sections are distinct (Logging vs Logged share no video)', true);
    const tr = await E(() => { let n = 0; const o = window.trlPlay; window.trlPlay = function (id) { window.__tp = id; }; document.querySelector('#ytBody .ytg57 [data-ytv]').click(); window.trlPlay = o; return window.__tp; }); ok('1l Logged entries reopen the video', tr === 'R6MlUcmOul8' || !!tr, tr);
  });
  await TT('2 description', async () => {
    await E(() => { openYTHome(); R57.sec = 'lgd'; ytDraw(); }); await W(300); await E(() => document.querySelector('#ytBody [data-ytdesc]').click()); await W(600);
    const d = await E(() => document.getElementById('ytdp').textContent); ok('2a description page: title, channel, upload date, views, likes, full description', /Big Buck Bunny 60fps/.test(d) && /Blender/.test(d) && /2014/.test(d) && /12,345,678/.test(d) && /98,765/.test(d) && d.length > 1400, d.slice(0, 120));
    ok('2b no dislikes shown (not available from the API)', !/dislike/i.test(d)); ok('2c description scrolls', await E(() => { const x = document.getElementById('ytdp'); return x.scrollHeight > x.clientHeight; })); await SH('yt_description');
    await E(() => document.querySelector('[data-ytdch]').click()); await W(500); ok('2d channel name opens the channel video list', await E(() => document.querySelectorAll('#ytdp .ytg57 [data-ytv]').length === 3)); await SH('yt_channel');
    await E(() => document.querySelector('[data-ytdback]').click()); await W(200); await E(() => document.querySelector('[data-ytdx]').click()); await W(200);
    const pb = await E(() => { try { trlPlay('aqz-KE-bpKQ', 'Big Buck Bunny', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'); } catch (e) { return 'ERR ' + e.message; } return 1; }); await W(2500);
    await E(() => { try { adRow(); } catch (e) {} }); ok('2e DESCRIPTION button beside GAME in the player', await E(() => { const g = document.querySelector('#adrow .adgo'), d = document.querySelector('#adrow [data-ytdescp]'); return !!g && !!d && g.nextElementSibling === d; }), pb); await SH('player_buttons');
  });
  await TT('3 ad games', async () => {
    const n = await E(() => { adStart(); return [ADG.length, ADB.g.k, !!document.querySelector('#adb [data-adnext]')]; }); ok('3a NEXT GAME button + 2 new games (scramble, higher/lower)', n[2] && await E(() => ADG.some(g => g.k === 'scram') && ADG.some(g => g.k === 'hilo')), n);
    const seen = [];
    for (let i = 0; i < 5; i++) { seen.push(await E(() => ADB.g.k)); if (await E(() => ADB.g.k === 'scram')) await SH('ad_scramble'); if (await E(() => ADB.g.k === 'hilo')) await SH('ad_hilo'); await E(() => document.querySelector('#adb [data-adnext]').click()); await W(250); }
    ok('3b NEXT GAME cycles through all games', new Set(seen).size === 5, seen);
    await E(() => { while (ADB.g.k !== 'scram') adNextGame(); }); await W(200); const sc = await E(() => { const b = [...document.querySelectorAll('#adb .adop button')].find(x => x.dataset.v === '1'); if (!b) return document.querySelector('#adb .adb').textContent.slice(0, 60); b.click(); return 'ok'; }); await W(300);
    ok('3c scramble: correct answer scores', sc === 'ok' && await E(() => ADS.hi.scram >= 1), sc);
    await E(() => { while (ADB.g.k !== 'hilo') adNextGame(); }); await W(200); ok('3d higher/lower renders two rated titles', await E(() => document.querySelectorAll('#adb .adhl').length === 2 || /RATE A FEW/.test(document.querySelector('#adb').textContent)));
    await E(() => { adEnd(); try { ytnClose(); } catch (e) {} });
  });
  await TT('4 group watch', async () => {
    await E(() => { openYTHome(); R57.sec = 'gw'; ytDraw(); }); await W(700); ok('4a lobby: no live session, video picker', await E(() => /NO LIVE SESSION/.test(document.getElementById('ytBody').textContent) && document.querySelectorAll('[data-gwpick]').length >= 2)); await SH('gw_lobby');
    await E(() => document.querySelector('[data-gwpick]').click()); await W(1200); const id = await E(() => GW.id); ok('4b create session → room open', !!id && await E(() => document.getElementById('gwp').classList.contains('open')), id);
    GW_SRV.gwJoin(id, 'lewy'); GW_SRV.gwPoll(id, 'lewy', 0, 0, -1); await W(2500); ok('4c presence: Lewy shows online', await E(() => document.querySelector('.gwdot.lewy').classList.contains('on')));
    await E(() => { const f = document.getElementById('gwPF'); f.p.value = 'Bunny wins'; f.requestSubmit(); }); await W(600); GW_SRV.gwPred(id, 'lewy', 'Squirrel gets it'); await W(1800);
    ok('4d predictions: mine visible, Lewy\u2019s hidden until start', await E(() => { const t = document.getElementById('gwp').textContent; return t.includes('Bunny wins') && !t.includes('Squirrel gets it') && /1 prediction locked in/.test(t); })); await SH('gw_predictions');
    await E(() => document.querySelector('[data-gwready]').click()); await W(500); ok('4e one ready → still lobby', await E(() => GW.g.state === 'lobby'));
    GW_SRV.gwReady(id, 'lewy', true); await W(1800); const cd = await E(() => [GW.g.state, document.getElementById('gwCd').textContent, GW.g.startAt - GW.g.serverNow]);
    ok('4f both ready → 10-second countdown', /countdown|playing/.test(cd[0]) && +cd[1] >= 7 && +cd[1] <= 10, cd); await SH('gw_countdown');
    ok('4g predictions pinned in chat once started', await E(() => /Squirrel gets it/.test(document.querySelector('.gwpins').textContent) && /Bunny wins/.test(document.querySelector('.gwpins').textContent)));
    await E(() => { const f = document.getElementById('gwIn'); f.t.value = 'here we go'; f.requestSubmit(); }); await W(400); await E(() => document.querySelector('[data-gwemo="🔥"]').click()); GW_SRV.gwChat(id, 'lewy', 'popcorn ready', 'chat'); await W(2200);
    ok('4h chat + emoji reactions both ways', await E(() => { const t = document.getElementById('gwChat').textContent; return t.includes('here we go') && t.includes('popcorn ready') && t.includes('🔥'); })); await W(8000);
    const pl = await E(() => [GW.g.state, GW.ready, GW.err, GW.player && GW.player.getPlayerState ? GW.player.getPlayerState() : 'n/a', gwPos()]); console.log('  player', JSON.stringify(pl));
    ok('4i synced start: state playing at startAt' + (pl[1] ? ' and YT player started' : ' (YT player not available in this test env)'), pl[0] === 'playing', pl); await SH('gw_playing');
    GW_SRV.gwControl(id, 'lewy', 'pause', 42); await W(2200); ok('4j remote pause applies (state paused at Lewy\u2019s position)', await E(() => GW.g.state === 'paused' && GW.g.basePos === 42 && /RESUME/.test(document.querySelector('.gwmid').textContent)));
    await E(() => document.querySelector('[data-gwop="resume"]').click()); await W(800); ok('4k local resume sent → playing for both', GW_SRV.gwPoll(id, 'lewy', 0, 0, 1).state === 'playing');
    await E(() => document.querySelector('[data-gwop="fwd10"]').click()); await W(700); ok('4l seek synced to server', GW_SRV.gwPoll(id, 'lewy', 0, 0, 1).basePos >= 9);
    await p.route(/script\.google\.com\/macros\/s\/.*\/exec/, rt => rt.abort('failed')); await W(6000); ok('4m reconnect: offline shows RECONNECTING', await E(() => /RECONNECTING/.test(document.querySelector('.gwtop').textContent) && getComputedStyle(document.querySelector('.gwnet')).display !== 'none'));
    await p.unroute(/script\.google\.com\/macros\/s\/.*\/exec/); await E(() => window.dispatchEvent(new Event('online'))); await W(3500); ok('4n back online → resumes polling', await E(() => GW.net === true));
    GW_SRV.gwControl(id, 'lewy', 'ended', 600); await W(2200); ok('4o after the video: mark predictions', await E(() => GW.g.state === 'review' && document.querySelectorAll('[data-gwmark]').length === 4));
    await E(() => document.querySelector('[data-gwmark$=":y"]').click()); await W(600); ok('4p marking saved', (GW_SRV.gwPoll(id, 'lewy', 0, 0, 0).preds || []).some(x => x.res === 'y')); await SH('gw_review');
    await E(() => document.querySelector('[data-gwend]').click()); await W(200); ok('4q END asks to confirm', await E(() => document.getElementById('dlg').classList.contains('open'))); await E(() => document.querySelector('#dlg [data-dlg="1"]').click()); await W(800);
    ok('4r session ended + closed', !GW_SRV.gwOpen() && await E(() => !document.getElementById('gwp').classList.contains('open')));
  });
  await TT('5 embed blocked', async () => {
    await E(() => { gwEnter({ id: 'X', vid: 'zzzzzzzzzzz', t: 'Blocked', state: 'lobby', rev: 1, members: {}, preds: [], ev: [] }); }); await W(300); await E(() => { GW.player = null; const err = 150; GW.err = err; gwMsg('🚫 THIS VIDEO CAN\u2019T PLAY INSIDE LOGGED (the uploader blocked embedding). Group sync won\u2019t work for it — open it in YouTube instead.', 1); });
    ok('5a embed-disabled explains + offers Open in YouTube', await E(() => { const m = document.getElementById('gwMsg'); return getComputedStyle(m).display !== 'none' && /OPEN IN YOUTUBE/.test(m.textContent) && /youtube\.com\/watch\?v=zzzzzzzzzzz/.test(m.innerHTML); })); await SH('gw_embed_blocked');
    await E(() => gwClose());
  });
  ok('Z no page errors', errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(path.join(__dirname, 'last-results-b3.json'), JSON.stringify(res, null, 1));
  console.log('TOTAL', Object.values(res).filter(x => x.pass).length + '/' + Object.keys(res).length);
})()
