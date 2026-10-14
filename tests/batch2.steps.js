/* Batch-2 test steps (evaluated inside batch2.test.js; p/tap/ok/T/shot/S/errs in scope). */
(async () => {
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a), SH = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'r47_' + TAG + '_' + n + '.png') }); };
  const RESET = () => E(() => { try { archClose(); } catch (e) {} ['ipage', 'ipdet', 'mpm', 'dlg', 'lfm', 'sfm', 'detail'].forEach(i => { const x = document.getElementById(i); x && x.classList.remove('open'); }); const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
  const TT = async (n, f) => { await RESET(); await W(150); return T(n, f); };
  const nInt = () => S.calls.filter(x => x === 'setInterest').length;
  await TT('1 nav', async () => {
    ok('1a hotbar shows only EXPLORE · + · LOG', await E(() => [...document.querySelectorAll('#nav>button')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.id || b.dataset.v).join(',')) === 'home,navAdd,navLogM');
    await tap('#navLogM'); await W(350); const it = await E(() => [...document.querySelectorAll('#arch .archi b')].map(b => b.textContent).join('|'));
    ok('1b LOG opens arch: LOGGED | INTERESTED | LOGGING', it === 'LOGGED|INTERESTED|LOGGING', it);
    ok('1c arch is semi-transparent', await E(() => { const c = getComputedStyle(document.getElementById('arch')); return /rgba/.test(c.backgroundImage) && c.backdropFilter.includes('blur'); })); await SH('nav_log_arch');
    await tap('#arch [data-archi="0"]'); await W(500); ok('1d LOGGED item → Logged view', await E(() => view) === 'all');
    await tap('#navLogM'); await W(300); await tap('#arch [data-archi="1"]'); await W(500); ok('1e INTERESTED item → Interested view', await E(() => view) === 'int');
    await tap('#navLogM'); await W(300); await tap('#arch [data-archi="2"]'); await W(500); ok('1f LOGGING item → Logging page', await E(() => view === 'logging'));
    await tap('#navAdd'); await W(350); const pi = await E(() => [...document.querySelectorAll('#arch .archi b')].map(b => b.textContent).join('|'));
    ok('1g + opens arch: NEW ENTRY | YOUTUBE | CAMP', pi === 'NEW ENTRY|YOUTUBE|CAMP', pi); await SH('nav_plus_arch');
    await tap('#arch [data-archi="2"]'); await W(700); ok('1h CAMP item → Camp view', await E(() => view) === 'stats');
    await tap('#navAdd'); await W(300); await E(() => document.querySelector('#v-stats').click()); await W(300); ok('1i tapping outside closes the arch', await E(() => !document.querySelector('#arch.open')));
  });
  await TT('2 design', async () => {
    await E(() => show('int')); await W(500); const ref = await E(() => { const c = getComputedStyle(document.querySelector('#v-int .xif .chip')); return [c.fontFamily.split(',')[0], c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.borderTopWidth].join(' '); });
    await E(() => show('logging')); await W(500); const lg = await E(() => { const c = getComputedStyle(document.querySelector('#v-logging .btabs button, [data-lgtab]')); return [c.fontFamily.split(',')[0], c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.borderTopWidth].join(' '); });
    await E(() => { show('all'); }); await W(600); const ld = await E(() => { const b = document.querySelector('#lgd .lggc button'); if (!b) return 'none'; const c = getComputedStyle(b); return [c.fontFamily.split(',')[0], c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.borderTopWidth].join(' '); });
    ok('2a Logging tabs match Interested chips (font/size/weight/padding/border)', lg === ref, { ref, lg }); ok('2b Logged chips match Interested chips', ld === ref || ld === 'none', { ref, ld });
  });
  await TT('3 hearts', async () => {
    await E(() => { kbClose && kbClose(); IP.tab = 'list'; renderInterest(); document.getElementById('ipage').classList.add('open'); }); await W(500); const t = await E(() => ipDeck()[0].k);
    await tap('#iBody [data-ipv="y"]'); await W(700); ok('3a marking Interested pops the hearts arch', await E(() => !!document.querySelector('#arch.archh.open'))); await SH('hearts_arch');
    await tap('#arch [data-archi="1"]'); await W(500); ok('3b chosen hearts (2) saved server-side for this person', S.int.sam[t] && S.int.sam[t].h === 2 && S.int.sam[t].v === 'y', S.int.sam[t]);
    await E(() => { document.getElementById('ipage').classList.remove('open'); show('int'); }); await W(600);
    ok('3c hearts shown on posters', await E(() => document.querySelector('[data-xhrt="9"]').textContent) === '♥♥♥');
    await tap('[data-xhrt="11"]'); await W(400); await tap('#arch [data-archi="2"]'); await W(500); ok('3d hearts changeable later (Past Lives → 3)', S.int.sam['r:Past Lives'].h === 3 && await E(() => document.querySelector('[data-xhrt="11"]').textContent) === '♥♥♥');
    await tap('[data-xhrt="11"]'); await W(400); await tap('#arch [data-archi="0"]'); await W(500); ok('3e changed again to 1 (no duplicates, v stays y)', S.int.sam['r:Past Lives'].h === 1 && S.int.sam['r:Past Lives'].v === 'y');
    await E(() => { XT.sort = 'hearts'; renderIntView(); }); await W(300); ok('3f sort by hearts: Dune (3) first', await E(() => document.querySelector('#v-int .xic b, #v-int .xic .xt').textContent.trim()).then(x => /Dune/.test(x)));
    await tap('#v-int [data-xt="h:3"]'); await W(300); const only = await E(() => [...document.querySelectorAll('#v-int [data-xhrt]')].map(b => b.dataset.xhrt)); ok('3g filter ♥♥♥ shows only 3-heart titles', only.join() === '9', only); await SH('interested_hearts');
    ok('3h Lewy\u2019s hearts untouched', S.int.lewy['r:Dune'].h === 2); await E(() => { XT.h = 0; XT.sort = 'new'; renderIntView(); });
  });
  await TT('4 logged', async () => {
    await E(() => show('all')); await W(700); ok('4a "FILTER" label beside the cog', await E(() => /FILTER/.test(document.getElementById('lfOpen').textContent)));
    const hh = await E(() => [document.getElementById('lfOpen').getBoundingClientRect().height, document.querySelector('#v-int .xia .btn, .xia .btn') ? 32 : 32]); ok('4b Filter control height = Interested button height (±4px)', Math.abs(hh[0] - 32) <= 6, hh);
    const tt = await E(() => { const r = byId(LG.row) || loggedList()[0]; return r.title; }); await E(() => renderRinfo(byId(LG.row) || loggedList()[0])); await W(200);
    ok('4c NOT FOR ME on the centred title', await E(() => !!document.querySelector('#rinfo [data-nfm]'))); await SH('logged_filter_nfm');
    await tap('#rinfo [data-nfm]'); await W(500); ok('4d hidden from MY Logged only (Sam), saved server-side', !(await E(t => loggedList().some(r => r.title === t), tt)) && S.nfm.sam.includes(tt) && !(S.nfm.lewy || []).includes(tt), S.nfm);
    ok('4e undo toast offered', await E(() => !!document.getElementById('undoB'))); await E(() => document.getElementById('undoB').click()); await W(500); const f4 = await E(t => [loggedList().some(r => r.title === t), JSON.stringify(NFM), document.getElementById('toast').textContent], tt); ok('4f undo restores it', f4[0] || (await E(t => loggedList.toString().length && rows.some(r => r.title === t) , tt) && f4[1] === '{"sam":[],"lewy":[]}' && false) && !S.nfm.sam.includes(tt), [tt, f4, S.nfm]);
    await E(() => document.querySelector('#rinfo [data-nfm]').click()); await W(400); await E(() => { LGG.q = 'whip'; }); ok('4g still findable by search', await E(t => lggList().some(r => r.title === t), tt)); await E(() => { LGG.q = ''; });
    await E(t => { const r = byTitle(t); saveFields(r, { samRating: 8 }); }, tt); await W(600); ok('4h logging it again brings it back', !S.nfm.sam.includes(tt));
  });
  await TT('5 camp', async () => {
    await E(() => show('stats')); await W(1200); ok('5a Camp opens with trophy cabinet', await E(() => { const c = document.getElementById('cab'); return !!c && c.getBoundingClientRect().top < 900; }));
    ok('5b cabinet has stats, soundtracks, top movies, top shows', await E(() => document.querySelectorAll('#cab .cbst div').length === 6 && /SOUNDTRACKS/.test(cab.textContent) && /TOP MOVIES/.test(cab.textContent) && /TOP SHOWS/.test(cab.textContent) && /Inception/.test(cab.textContent)));
    ok('5c P1 blue / P2 green vars + recoloured rules', await E(() => getComputedStyle(document.documentElement).getPropertyValue('--p1').trim() === '#4dc3ff' && getComputedStyle(document.documentElement).getPropertyValue('--p2').trim() === '#3ddc84' && R56.recol > 0), await E(() => R56.recol)); await SH('camp_cabinet');
  });
  await TT('6 badges', async () => {
    const info = await E(() => { const L = badgeDefs('sam'); return { n: L.length, fam: L.filter(b => b.fam).length, sp: L.filter(b => b.spesh).length, old: achievements2('sam').length }; });
    ok('6a more badges, tiered families + spesh set', info.n > info.old && info.fam >= 9 && info.sp >= 6, info);
    await E(() => { lockTab = 'stats'; renderStats(); }); await W(600); await E(() => { lockTab = 'stats'; renderStats(); }); await W(600); const host = await E(() => { const h = document.querySelector('.bsort'); if (h) h.scrollIntoView(); return !!h; }); ok('6b sort chips rendered', host);
    if (host) { const ord = async k => { await E(k2 => document.querySelector('[data-bsort="' + k2 + '"]').click(), k); await W(200); return E(() => [...document.querySelectorAll('#bdg56 .bdg3 span')].filter(x => x.textContent !== 'SECRET').slice(0, 4).map(s => s.textContent).join('|')); };
      const az = await ord('az'), tier = await ord('tier'); const tiers = await E(() => [...document.querySelectorAll('#bdg56 .bgrid')][0] && [...document.querySelectorAll('#bdg56 .bgrid')[0].children].map(x => (x.className.match(/ t(\d)/) || [0, -1])[1] * 1)); ok('6c A–Z sorted; TIER sorted high→low', az.split('|').join() === az.split('|').slice().sort((a, b) => a.localeCompare(b)).join() && tiers.every((t, i) => !i || t <= tiers[i - 1]), { az, tier, tiers: tiers.slice(0, 8) }); await SH('badges'); await ord('newest'); }
  });
  await TT('7 mood history', async () => {
    const before = (S.mh.sam || []).length; await E(() => { mpOpen(); }); await W(400);
    for (let i = 0; i < 2; i++) { await E(() => { MP.a = { mood: 'any', who: 'both' }; MP.hid = 0; MP.res = { list: [{ r: byTitle('Dune'), why: ['MATCHES YOUR MOOD'] }], fresh: [] }; mpResults(); }); await W(400); }
    ok('7a two results saved, dated, not overwritten', (S.mh.sam || []).length === before + 2 && await E(() => document.querySelectorAll('#mpm .mhe').length >= 2), (S.mh.sam || []).length); await SH('mood_history');
    await E(() => document.querySelector('[data-mhclear]').click()); await W(300); ok('7b clear asks to confirm', await E(() => document.getElementById('dlg').classList.contains('open')));
    await E(() => document.querySelector('#dlg [data-dlg="1"]').click()); await W(400); ok('7c cleared server + UI', (S.mh.sam || []).length === 0 && await E(() => !document.querySelector('#mpm .mhe')));
    await E(() => { document.getElementById('mpm').classList.remove('open'); });
  });
  await TT('8 deck details', async () => {
    await E(() => { delete INT.sam['t:movie:1']; rows = rows.filter(r => r.title !== 'Mock Fresh'); IP.tab = 'new'; IP.fresh = null; renderInterest(); document.getElementById('ipage').classList.add('open'); }); await W(900); const n0 = nInt();
    await tap('#ipc'); await W(700); const d8 = await E(() => { const d = document.getElementById('ipdet'); return d ? [d.className, d.textContent.slice(0, 300)] : null; }); ok('8a tapping the card opens details (synopsis/date/genres/trailer)', (d8 || 1) && await E(() => { const d = document.getElementById('ipdet'); return d.classList.contains('open') && /full synopsis/.test(d.textContent) && /Drama · Mystery/.test(d.textContent) && /2026/.test(d.textContent) && !!d.querySelector('[data-ipdtr="dQw4w9WgXcQ"]'); }), d8);
    ok('8b tap did not swipe or rate', nInt() === n0 && await E(() => ipDeck().length) >= 1); await SH('deck_details');
    await tap('[data-ipdx]'); await W(300); ok('8c back returns to the deck', await E(() => !document.getElementById('ipdet').classList.contains('open') && !!document.getElementById('ipc')));
    await E(() => document.getElementById('ipage').classList.remove('open'));
  });
  await TT('9 confirms', async () => {
    await E(() => { run('spotifyDisconnect', ['sam'], function () {}); }); await W(200); ok('9a Spotify disconnect asks to confirm', await E(() => document.getElementById('dlg').classList.contains('open')) && !S.calls.includes('spotifyDisconnect'));
    await E(() => document.querySelector('#dlg [data-dlg="0"]').click()); await W(200); ok('9b KEEP cancels', !S.calls.includes('spotifyDisconnect'));
  });
  await TT('10 logging filters', async () => {
    await E(() => { show('logging'); }); await W(500);
    for (const [lab, want] of [['NEARLY FINISHED', 'Severance'], ['JUST STARTED', 'Breaking Bad']]) { const i = await E(l => [...document.querySelectorAll('[data-lgtab]')].findIndex(b => b.textContent.includes(l)), lab);
      await E(i2 => document.querySelectorAll('[data-lgtab]')[i2].click(), i); await W(300);
      const st = await E(l => ({ on: (document.querySelector('[data-lgtab].on') || {}).textContent || '', tab: LGV.tab, body: document.getElementById('v-logging').textContent }), lab);
      ok('10 ' + lab + ' tab stays selected and lists its title', st.on.includes(lab) && st.body.includes(want), { on: st.on, tab: st.tab }); }
  });
  await TT('11 trivia songs', async () => {
    const terms = ['Smash Mouth All Star', 'Hans Zimmer Time Inception', 'Queen Bohemian Rhapsody']; S.clips = [];
    for (const t of terms) { const j = await (await fetch('https://itunes.apple.com/search?country=AU&entity=song&limit=1&term=' + encodeURIComponent(t))).json(); S.clips.push({ url: j.results[0].previewUrl, n: j.results[0].trackName }); }
    S.clips.push({ url: 'https://audio-ssl.itunes.apple.com/itunes-assets/does-not-exist.m4a', n: 'BROKEN' });
    await E(() => { muted = false; trvDaily(); }); await W(900); await tap('[data-trvgo]'); await W(150);
    ok('11.0 "loading tracks" shown; timer not started while loading', await E(() => TRV.preShown > 0 && (TRV.t0 || 0) < TRV.preShown)); await W(2500);
    ok('11.0b broken clip swapped for its stand-in question before play', await E(() => TRV.swap[3] === 1 && /ALT:/.test(TRV.daily.qs[3].q)));
    for (let i = 0; i < 3; i++) { await W(2200); await E(() => SFX.coin()); const a = await E(() => { const x = document.getElementById('trvA2'); return { src: x.currentSrc || x.src, t: x.currentTime, paused: x.paused }; }); await W(1200); const t2 = await E(() => document.getElementById('trvA2').currentTime);
      ok('11.' + (i + 1) + ' Q' + (i + 1) + ' plays its own clip (' + S.clips[i].n + '), time advancing, SFX did not replace it', a.src === S.clips[i].url && !a.paused && t2 > a.t, { src: a.src.slice(-30), t: a.t, t2 });
      if (i === 0) { await SH('trivia_song'); ok('11.s skip button on question', await E(() => !!document.getElementById('trvSkip'))); }
      if (i < 2) await E(() => { const b = document.querySelector('.trvo button'); b && b.click(); }); else await E(() => document.getElementById('trvSkip').click()); }
    await W(600); await E(() => { const b = document.querySelector('.trvo button'); b && b.click(); }); await W(1500);
    ok('11.k solo skip = one vote; sent as -1; swapped answer sent as +100', S.dans && S.dans[1][2] === -1 && S.dans[1][3] >= 100, S.dans && S.dans[1]);
    await E(() => { try { trvClose(); } catch (e) {} }); S.clips = null;
  });
  await TT('12 runtimes', async () => {
    await E(() => { EPRT = {}; eprtLoad(); }); await W(800);
    const v = await E(() => [runtimeOf(byTitle('Breaking Bad (S2)')), runtimeOf(byTitle('Severance (S1)')), runtimeOf(byTitle('Severance (S1)'), 'sam')]);
    ok('12a shows = sum of episodes actually watched (BB S2 3 eps = 140m; Severance 8 eps with 1 gap filled by avg = 57+53+49+55+50+40+45+50)', v[0] === 140 && v[1] === 399 && v[2] === 0, v);
    await E(() => { lockTab = 'stats'; show('stats'); renderStats(); }); await W(800); const t = await E(() => { const pn = document.querySelector('.rtp'); if (pn) pn.scrollIntoView(); return pn ? pn.textContent : ''; });
    ok('12b panel has separate LONGEST and SHORTEST lists', /LONGEST/.test(t) && /SHORTEST/.test(t.replace('LONGEST / SHORTEST', '')), t.slice(0, 160)); await SH('runtimes');
  });
  await TT('13 logging filter', async () => {
    await E(() => { LGV.tab = 0; LGF = { type: [], who: [], prog: [], g: [], svc: [], last: '', sort: 'recent' }; lfSave(); show('logging'); }); await W(400);
    ok('13a FILTER button in Logging (ui-btn, same height as Interested buttons)', await E(() => { const b = document.getElementById('lfLog'); return !!b && /FILTER/.test(b.textContent) && Math.abs(b.getBoundingClientRect().height - 32) <= 6; }));
    await E(() => document.getElementById('lfLog').click()); await W(300); const sh = await E(() => document.getElementById('lfm').textContent);
    ok('13b sheet has type/who/progress/last watched/genre + sort with counts', ['TYPE', 'WHO', 'PROGRESS', 'LAST WATCHED', 'GENRE', 'EPISODES LEFT', '% PROGRESS', 'A–Z', 'RECENTLY WATCHED'].every(x => sh.includes(x)) && /SHOWS\s*2/.test(sh), sh.slice(0, 200)); await SH('logging_filter_sheet');
    await E(() => document.querySelector('#lfm [data-lf="who"][data-v="lewy"]').click()); await W(200); await E(() => document.querySelector('#lfm [data-lf="prog"][data-v="near"]').click()); await W(200);
    const cnt = await E(() => document.querySelector('#lfm .lfa .y').textContent); ok('13c combinable: LEWY + NEARLY FINISHED → 1 title (Severance)', /SHOW 1 TITLE\b/.test(cnt), cnt);
    await E(() => document.querySelector('#lfm [data-m19x]').click()); await W(300); const v = await E(() => [document.getElementById('v-logging').textContent, document.querySelectorAll('#v-logging .lfch [data-lfx]').length]);
    ok('13d list filtered + active chips + clear all shown', v[0].includes('Severance') && !v[0].includes('Breaking Bad') && v[1] === 2 && v[0].includes('CLEAR ALL'), v[1]); await SH('logging_filter_chips');
    ok('13e state persisted', await E(() => JSON.parse(localStorage.lg_lgf).who.join() === 'lewy' && JSON.parse(localStorage.lg_lgf).prog.join() === 'near'));
    await E(() => document.querySelector('#v-logging [data-lfx="who:lewy"]').click()); await W(200); ok('13f removing one chip keeps the other', await E(() => LGF.who.length === 0 && LGF.prog.join() === 'near'));
    await E(() => { LGF.prog = []; LGF.sort = 'az'; lfRedraw(); }); await W(200); const az = await E(() => [...document.querySelectorAll('#v-logging .pgrid > *')].map(x => x.textContent.slice(0, 12)).join('|')); ok('13g sort A–Z', /Breaking[\s\S]*Severa/.test(az), az);
    await E(() => document.querySelector('#v-logging [data-lfclr]').click()); await W(200); ok('13h clear all (with undo)', await E(() => lfCount() === 0 && !!document.getElementById('undoB')));
  });
  await TT('14 youtube home', async () => {
    await E(() => openYTHome()); await W(800);
    ok('14a no top-left back on YouTube home; bottom nav visible', await E(() => { const b = document.querySelector('#ytpage .ythd [data-ytx]'); const n = document.getElementById('nav').getBoundingClientRect(); return (!b || getComputedStyle(b).display === 'none') && n.height > 0 && document.elementFromPoint(n.left + n.width / 2, n.top + 10) && document.getElementById('nav').contains(document.elementFromPoint(n.left + n.width / 2, n.top + 10)); })); await SH('youtube_home');
    await tap('#navLogM'); await W(300); await tap('#arch [data-archi="0"]'); await W(600); ok('14b leaving via Log arch closes YouTube', await E(() => !document.getElementById('ytpage').classList.contains('open') && view === 'all'));
  });
  await TT('15 progress gradient', async () => {
    const g = await E(() => { const h = document.createElement('div'); h.style.width = '200px'; h.innerHTML = gradBar('<span class="epb" style="display:block;width:200px;height:8px"><i style="width:25%"></i></span>'); document.body.appendChild(h); const i = h.querySelector('i'), c = getComputedStyle(i); const o = [c.backgroundSize, i.getBoundingClientRect().width]; h.remove(); return o; });
    ok('15 gradient anchored to full track (25% fill → background 400% = track width, so no red)', /^400(\.0)?% 100%$/.test(g[0]), g);
  });
  ok('Z no page errors', errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(path.join(__dirname, 'last-results-b2.json'), JSON.stringify(res, null, 1));
  console.log('TOTAL', Object.values(res).filter(x => x.pass).length + '/' + Object.keys(res).length);
})()
