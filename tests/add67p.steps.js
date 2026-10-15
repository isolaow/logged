(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); });
await p.tap('#navLogM').catch(e => out.e1 = e.message.slice(0, 80)); await p.waitForTimeout(600);
out.items = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && /LOG IT/.test(b.innerText)).map(b => b.id + '|' + b.className));
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /LOG IT/.test(b.innerText) && b.id !== 'fab').pop(); b && b.setAttribute('data-t67', '1'); });
await p.tap('[data-t67]').catch(e => out.e2 = e.message.slice(0, 80)); await p.waitForTimeout(800);
out.st = await p.evaluate(() => { const a = document.getElementById('add'), t = document.getElementById('aTitle'), r = t.getBoundingClientRect(), kb = document.getElementById('kb'); return { open: a.classList.contains('open'), vis: getComputedStyle(a).visibility + '/' + getComputedStyle(a).display + '/' + getComputedStyle(a).opacity, t: [r.y, r.height], at: (document.elementFromPoint(r.x + 10, r.y + r.height / 2) || {}).id, act: document.activeElement && document.activeElement.id, kb: kb && kb.classList.contains('on'), kbR: kb && kb.getBoundingClientRect().y, kbz: kb && getComputedStyle(kb).zIndex, az: getComputedStyle(a).zIndex }; });
await p.screenshot({ path: '/workspace/logged-site/shots/r67_logit.png' });
console.log('ADD67 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
