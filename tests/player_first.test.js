/* r58b regression: player.html with a 'next' list must start the REQUESTED video, not playlist[0]. Run: node tests/player_first.test.js */
const { webkit, devices } = require(process.env.PW || '/tmp/pw/node_modules/playwright-core'); const fs = require('fs'), path = require('path');
(async () => { const b = await webkit.launch(), c = await b.newContext(Object.assign({ serviceWorkers: 'block' }, devices['iPhone 15'])), p = await c.newPage();
  await c.route(/isolaow\.github\.io\/logged\/player\.html/, rt => rt.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(path.join(__dirname, process.env.PF || '../player.html'), 'utf8') }));
  const want = 'aqz-KE-bpKQ'; await p.goto('https://isolaow.github.io/logged/player.html?v=' + want + '&next=eRsGyueVLvQ,R6MlUcmOul8&playsinline=1');
  let id = null, pl = null; for (let i = 0; i < 30 && !id; i++) { await p.waitForTimeout(500); [id, pl] = await p.evaluate(() => { try { const x = window.__p; return [x && x.getVideoData && x.getVideoData().video_id, x && x.getPlaylist && x.getPlaylist()]; } catch (e) { return [null, null]; } }); }
  console.log((id === want ? 'PASS' : 'FAIL') + ' player starts requested video — loaded=' + id + ' playlist=' + JSON.stringify(pl)); await b.close(); })();
