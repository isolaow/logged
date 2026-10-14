(async () => { const res = {};
const audit = (label) => p.evaluate(label => { const isP = u => /tmdb|wikimedia|example\.invalid/.test(u || '');
  const imgs = [...document.querySelectorAll('img')].filter(i => isP(i.dataset.src) || isP(i.getAttribute('src')));
  const raw = imgs.filter(i => !/^data:/.test(i.getAttribute('src') || '')).map(i => (i.closest('[id]') || {}).id + ':' + (i.getAttribute('src') || '').slice(0, 50));
  return { n: imgs.length, raw, px: imgs.filter(i => i.dataset.px).length, ph: imgs.filter(i => i.classList.contains('pxph')).length }; }, label);
const settle = async () => { await p.waitForTimeout(400); for (let i = 0; i < 40; i++) { const a = await p.evaluate(() => document.querySelectorAll('img.poster.loading').length); if (!a) break; await p.waitForTimeout(500); } };
for (const v of ['all', 'logging', 'int', 'home', 'stats']) { await p.evaluate(v => { v === 'int' ? navTap('navInt') : v === 'logging' ? navTap('navLog') : navTap(v); }, v); await settle(); res[v] = await audit(v); }
await p.evaluate(() => { const r = rows.filter(x => x.title === 'Inception')[0]; openDetail(r); }); await settle(); res.details = await audit();
await p.evaluate(() => { closeAll && closeAll(); }).catch(() => {});
await p.evaluate(() => { try { ipDeck(); } catch (e) {} }); await settle(); res.deck = await audit();
await p.evaluate(() => { try { document.querySelectorAll('.ov.open,.sheet.open').forEach(x => x.classList.remove('open')); mpOpen(); } catch (e) {} }); await settle(); res.mood = await audit();
/* legacy raw renderers (search/trailer/GW style): inject raw poster imgs — must be adopted & pixelated */
await p.evaluate(() => { const d = document.createElement('div'); d.id = 'rawtest'; d.innerHTML = '<img loading="lazy" src="' + posters['Garfield'] + '"><img src="' + posters['Breaking Bad (S2)'] + '" onerror="this.remove()">'; document.querySelector('main').appendChild(d); }); await settle(); res.injected = await audit();
res.injectedState = await p.evaluate(() => [...document.querySelectorAll('#rawtest img')].map(i => ({ px: i.dataset.px, ph: i.classList.contains('pxph'), data: /^data:image\/png/.test(i.src) })));
let ok = 0, n = 0; for (const k in res) { if (k === 'injectedState') continue; n++; const pass = !res[k].raw.length; ok += pass; console.log((pass ? 'PASS ' : 'FAIL ') + 'poster ' + k + ' ' + JSON.stringify(res[k])); }
console.log('INJ ' + JSON.stringify(res.injectedState)); console.log('POSTERS ' + ok + '/' + n); await p.screenshot({ path: '/workspace/logged-site/shots/r49_pxposter.png' }); console.log('errors', JSON.stringify(errs)); })()
