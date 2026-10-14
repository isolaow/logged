/* Recordings ('Record your own' soundtrack): ≤30 s mic clips stored as base64 text files in Drive folder 'Logged recordings'.
   Needs the Drive scope: Sam runs authDrive() once in the editor and approves. */
function authDrive() { return recFolder_().getName(); }
function recFolder_() { var P = PropertiesService.getScriptProperties(), id = P.getProperty('REC_FOLDER');
  if (id) try { return DriveApp.getFolderById(id); } catch (e) {}
  var it = DriveApp.getFoldersByName('Logged recordings'), f = it.hasNext() ? it.next() : DriveApp.createFolder('Logged recordings'); P.setProperty('REC_FOLDER', f.getId()); return f; }
function recFns_() { return {
  save: function (title, mime, b64, who) { if (who !== 'sam' && who !== 'lewy') throw new Error('who?'); b64 = String(b64 || ''); mime = String(mime || '').slice(0, 60);
    if (!/^audio\//.test(mime) || !/^[A-Za-z0-9+/=]+$/.test(b64) || b64.length > 1400000) throw new Error('bad recording');
    var f = recFolder_().createFile(String(title || 'clip').slice(0, 60).replace(/[^\w .-]/g, '') + ' - ' + who + ' - ' + Utilities.formatDate(new Date(), 'Australia/Sydney', 'yyyy-MM-dd HHmm') + '.b64.txt', mime + '\n' + b64, 'text/plain');
    return { id: f.getId() }; },
  get: function (id) { id = String(id || '').replace(/[^\w-]/g, ''); var C = CacheService.getScriptCache(), h = C.get('rec_' + id); if (h) return h;
    var f = DriveApp.getFileById(id); if (f.getParents().next().getId() !== recFolder_().getId()) throw new Error('not a recording');
    var t = f.getBlob().getDataAsString(), i = t.indexOf('\n'), out = 'data:' + t.slice(0, i) + ';base64,' + t.slice(i + 1); if (out.length < 99000) try { C.put('rec_' + id, out, 21600); } catch (e) {} return out; } }; }
