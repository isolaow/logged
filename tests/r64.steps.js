(async () => { const out = {}; await p.evaluate(() => { const s = document.getElementById('splash'); s && s.remove(); }); const who = await p.evaluate(() => me()); out.who = who;
const arc = async (label) => { await p.tap('#nav [data-v=stats]', { timeout: 4000 }); await p.waitForTimeout(500); const ok = await p.evaluate(l => { const b = [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)); if (!b) return false; return true; }, label); if (!ok) return 'no item'; await p.evaluate(l => { [...document.querySelectorAll('#arch .archi')].find(x => x.innerText.toUpperCase().includes(l)).click(); }, label); await p.waitForTimeout(900); };
await arc('PROFILE'); await p.waitForTimeout(500);
const secs = () => p.evaluate(() => [...document.querySelectorAll('#cab > [data-sec]')].map(x => x.dataset.sec));
out.secs0 = await secs();
/* quotes: pick from bank */
await p.tap('#cab [data-fav="qt"]', { timeout: 4000 }).catch(e => out.qErr = e.message.slice(0, 80)); await p.waitForTimeout(300);
await p.fill('#ed61q', 'downward', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(800);
out.qRes = await p.evaluate(() => [...document.querySelectorAll('#ed61 .e61r .e61i b')].map(b => b.innerText));
await p.tap('#ed61 .e61r .e61i:not(:first-child) [data-e61^=add], #ed61 .e61r .e61i [data-e61^=add] >> nth=1').catch(() => {}); await p.waitForTimeout(400);
/* custom quote → attach a title */
await p.fill('#ed61q', 'Yeah science! — Jesse', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(800);
await p.tap('#ed61 .e61r [data-e61="add:0"]').catch(e => out.cErr = e.message.slice(0, 80)); await p.waitForTimeout(300);
out.attachPh = await p.evaluate(() => document.getElementById('ed61q').placeholder);
await p.fill('#ed61q', 'oppen', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1000);
out.attachRes = await p.evaluate(() => [...document.querySelectorAll('#ed61 .e61r .e61i small')].map(b => b.innerText).slice(0, 3));
await p.tap('#ed61 .e61r [data-e61="add:0"]').catch(() => {}); await p.waitForTimeout(400);
out.qCur = await p.evaluate(() => ED61() && ED61().L.map(s => P61(s)).map(o => o.q + ' | ' + o.who + ' | ' + o.t));
await p.tap('#ed61 [data-e61x]').catch(() => {}); await p.waitForTimeout(700);
out.qShelf = await p.evaluate(() => [...document.querySelectorAll('#cab .qt64 li')].map(li => li.innerText.replace(/\s+/g, ' ')));
/* arrange: move QUOTES up to the top */
await p.tap('#cab [data-arr64="toggle"]').catch(e => out.aErr = e.message.slice(0, 80)); await p.waitForTimeout(400);
for (let i = 0; i < 8; i++) { const ok = await p.evaluate(() => { const b = document.querySelector('[data-arr64="up:QUOTES"]'); return b && !b.disabled; }); if (!ok) break; await p.tap('[data-arr64="up:QUOTES"]').catch(() => {}); await p.waitForTimeout(250); }
await p.tap('#cab [data-arr64="toggle"]').catch(() => {}); await p.waitForTimeout(900);
out.secs1 = await secs(); out.layServer = (S.prof && S.prof[who] || {}).lay;
await p.screenshot({ path: '/workspace/logged-site/shots/r56_profile_' + who + '.png' });
/* profile song via Settings > Profile */
await p.evaluate(() => { window.PL = []; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { PL.push({ src: this.src, loop: this.loop, vol: this.volume }); return Promise.resolve(); }; setOpen58(); }); await p.waitForTimeout(400);
out.setRows = await p.evaluate(() => [...document.querySelectorAll('#set58 [data-seta="psong"], #set58 .ps63t, #set58 .who62')].map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 40)));
await p.tap('#set58 [data-seta="psong"]').catch(e => out.psErr = e.message.slice(0, 80)); await p.waitForTimeout(300);
await p.fill('#ed61q', 'baby', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(900); await p.tap('#ed61 .e61r [data-e61="add:0"]').catch(() => {}); await p.waitForTimeout(500);
await p.tap('#ed61 [data-e61x]').catch(() => {}); await p.waitForTimeout(900);
out.psServer = (S.prof && S.prof[who] || {}).ps;
await p.evaluate(() => { const c = document.querySelector('#set58 [data-seta=close]'); c && c.click(); }); await p.waitForTimeout(300);
await arc('BADGES'); await arc('PROFILE'); await p.waitForTimeout(2500);
out.chip = await p.evaluate(() => { const c = document.querySelector('.ps64'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
out.playing = await p.evaluate(() => ({ mode: OXS.mode, loop: OXA.loop, vol: OXA.volume, src: OXA.src.slice(-12), plays: PL.length }));
await p.tap('.ps64 [data-ps64m]').catch(e => out.mErr = e.message.slice(0, 80)); await p.waitForTimeout(300);
out.muted = await p.evaluate(() => [localStorage.lg_psmute, OXS.mode]);
await p.tap('.ps64 [data-ps64m]').catch(() => {}); await p.waitForTimeout(300); out.unmuted = await p.evaluate(() => OXS.mode);
await p.tap('#nav [data-v=home]').catch(() => {}); await p.waitForTimeout(400); await p.evaluate(() => { try { archClose(); } catch (e) {} if (typeof show === 'function') show('home'); }); await p.waitForTimeout(300);
out.leftCamp = await p.evaluate(() => ({ mode: OXS.mode, loop: OXA.loop }));
/* settings off */
await p.evaluate(() => { localStorage.lg_psoff = '1'; show('stats'); }); await p.waitForTimeout(800); out.offMode = await p.evaluate(() => OXS.mode); await p.evaluate(() => { localStorage.lg_psoff = '0'; });
console.log('R64 ' + JSON.stringify(out)); console.log('errors', JSON.stringify(errs)); })()
