/* CLASS OF 2026 — backend (Google Apps Script). Steps: see README.md
   Run setup() once (authorize), then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
   After pasting a NEW version of this file: keep your own ADMIN_KEY, run setup() again, then
   Deploy > Manage deployments > Edit > New version. */
const ADMIN_KEY = 'CHANGE_THIS_SECRET';   // your secret; used at  yoursite/#admin  (admin tools, official page, delete anything)
const FOLDER = 'Class2026 Photos';        // Drive folder (created automatically)
const MAX_B64 = 4000000;                  // max photo size (base64 chars)
const MAX_AVATAR = 400000;                // max profile-picture size (base64 chars)
const COOLDOWN = 15;                      // seconds between photo/message posts from the same visitor
const COMMENT_COOLDOWN = 3;               // seconds between comments from the same profile
const COMMENT_IMG_COOLDOWN = 10;          // seconds between comments that carry a photo
const MAX_CIMG = 500000;                  // max comment-photo size (base64 chars)
const NAME_EDITS = 1;                     // how many times a username can be changed after it is created
const AVATAR_DAYS = 7;                    // a profile picture can be changed once every N days
const TOPFAN_COUNT = 3;                   // how many "Top fan" badges are shown at the same time
const TOPFAN_MIN = 5;                     // minimum score (1 per love, 3 per comment/reply) to be a top fan
const FEED_COMMENTS = 2000;               // newest comments sent to the posts page
const NOTIF_MAX = 40;                     // notifications kept per person
const RX_KEEP = 1000;                     // newest loves scanned for notifications
const SNAP_TTL = 600;                     // seconds the public data snapshot is cached (any write refreshes it at once)
const CHUNK = 30000;                      // cache chunk size (a cache value is limited to 100 KB)
const THEMES = ['wine', 'gold', 'sky', 'mint'];   // looks of an admin text post
const RESERVED = ['admin', 'administrator', 'official', 'moderator', 'support', 'ادمن', 'الادمن', 'مشرف', 'الادارة', 'ادارة']; // add your class page name here
const HEAD = {
  Messages: ['id', 'name', 'message', 'date'],
  Photos: ['id', 'name', 'category', 'caption', 'date', 'fileId', 'uid'],
  Votes: ['poll', 'option', 'date'],
  Users: ['uid', 'name', 'nameKey', 'sk', 'avatar', 'badges', 'ne', 'avatarAt', 'date'],
  Reactions: ['post', 'uid', 'date'],
  Comments: ['id', 'post', 'parent', 'uid', 'text', 'date', 'media'],   // media: s:STICKER_NAME  or  i:DRIVE_FILE_ID
  Notes: ['id', 'kind', 'title', 'body', 'extra', 'category', 'date'],   // admin posts: text / event (occasion) / poll
  PollVotes: ['post', 'uid', 'option', 'date']
};

/* ---------- sheet helpers (every cell is written as plain text, so nothing a visitor types can become a formula) ---------- */
const TABS = {};                                       // sheets opened during this request
function cache() { return CacheService.getScriptCache(); }
function tab(n) {
  if (TABS[n]) return TABS[n];
  const ss = SpreadsheetApp.getActive(); let t = ss.getSheetByName(n);
  if (!t) { t = ss.insertSheet(n); t.getRange(1, 1, 1, HEAD[n].length).setValues([HEAD[n]]); }
  else if (!cache().get('hd_' + n + '_' + HEAD[n].length)) {                  // older sheet: add the new columns at the end (checked once, then remembered)
    const lc = Math.max(1, t.getLastColumn()), h = t.getRange(1, 1, 1, lc).getValues()[0].map(String), miss = HEAD[n].filter(k => h.indexOf(k) < 0);
    if (miss.length) t.getRange(1, lc + 1, 1, miss.length).setValues([miss]);
    cache().put('hd_' + n + '_' + HEAD[n].length, '1', 21600);
  }
  return TABS[n] = t;
}
function heads(t) { return t.getRange(1, 1, 1, t.getLastColumn()).getValues()[0].map(String); }
function rows(n) { const v = tab(n).getDataRange().getValues(), h = v.shift().map(String); return v.map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; }); }
function put(n, o) {
  const t = tab(n), h = heads(t), r = t.getLastRow() + 1;
  if (r > t.getMaxRows()) t.insertRowsAfter(t.getMaxRows(), 500);
  t.getRange(r, 1, 1, h.length).setNumberFormat('@').setValues([h.map(k => o[k] == null ? '' : String(o[k]))]);
}
function find(n, col, val) {                              // first row where col == val  ->  {row, o}  (row is 1-based)
  const v = tab(n).getDataRange().getValues(), h = v[0].map(String), c = h.indexOf(col);
  for (let i = 1; i < v.length; i++) if (String(v[i][c]) === String(val)) { const o = {}; h.forEach((k, j) => o[k] = v[i][j]); return { row: i + 1, o: o }; }
  return null;
}
function setRow(n, row, o) {
  const t = tab(n), h = heads(t);
  Object.keys(o).forEach(k => { const c = h.indexOf(k); if (c >= 0) t.getRange(row, c + 1).setNumberFormat('@').setValue(String(o[k])); });
}
function delWhere(n, col, val) {                          // delete every row where col == val (bottom-up); returns the deleted ids
  const t = tab(n), v = t.getDataRange().getValues(), c = v[0].map(String).indexOf(col), ic = v[0].map(String).indexOf('id'), gone = [];
  for (let i = v.length - 1; i > 0; i--) if (String(v[i][c]) === String(val)) { if (ic >= 0) gone.push(String(v[i][ic])); t.deleteRow(i + 1); }
  return gone;
}
function delRx(keys) {                                    // delete every love whose post/comment key is in keys (one pass, bottom-up)
  if (!keys.length) return; const set = {}; keys.forEach(k => set[String(k)] = 1);
  const t = tab('Reactions'), v = t.getDataRange().getValues();
  for (let i = v.length - 1; i > 0; i--) if (set[String(v[i][0])]) t.deleteRow(i + 1);
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function folder() { const f = DriveApp.getFoldersByName(FOLDER); return f.hasNext() ? f.next() : DriveApp.createFolder(FOLDER); }
function clean(x, n) { return String(x || '').replace(/[<>]/g, '').trim().slice(0, n); }
function limited(key, secs) { if (!key) return false; const c = CacheService.getScriptCache(), k = 'rl_' + key; if (c.get(k)) return true; c.put(k, '1', secs); return false; }
function sha(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s)).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }
function setup() { Object.keys(HEAD).forEach(tab); folder(); Logger.log('OK: sheets + Drive folder are ready.'); }

/* ---------- identity: a device profile (uid + private secret) or the admin key ---------- */
function adminState(k) {                                  // 'ok' | 'key' (wrong key) | 'unset' (the default ADMIN_KEY was not changed)
  if (ADMIN_KEY === 'CHANGE_THIS_SECRET') return 'unset';
  return k && String(k) === ADMIN_KEY ? 'ok' : 'key';
}
function adminOk(k) { return adminState(k) === 'ok'; }
function authUser(d) { if (!d.uid || !d.sk) return null; const f = find('Users', 'uid', d.uid); return f && String(f.o.sk) === sha(d.sk) ? f : null; }
function actor(d) {                                       // -> {uid} | {err}
  if (d.as === 'official') { const s = adminState(d.key); return s === 'ok' ? { uid: 'official' } : { err: s }; }
  const f = authUser(d); return f ? { uid: String(f.o.uid), f: f } : { err: 'noauth' };
}
function pub(o) { return { uid: String(o.uid), name: String(o.name), avatar: String(o.avatar || ''), badges: String(o.badges || ''), ne: Number(o.ne) || 0, at: String(o.avatarAt || '') }; }
function nameKey(n) { return n.toLowerCase().replace(/[\s._-]+/g, ''); }
function nameError(n, selfUid) {
  if (!/^(?=(?:.*[\p{L}\p{N}]){2})[\p{L}\p{N}_. -]{3,20}$/u.test(n)) return 'name_bad';
  const k = nameKey(n);
  if (RESERVED.some(r => nameKey(r) === k)) return 'name_reserved';
  const u = find('Users', 'nameKey', k);
  if (u && String(u.o.uid) !== String(selfUid)) return 'name_taken';
  return '';
}
function saveImg(img, prefix) {                            // data URL -> Drive file (anyone with the link can view); returns the file id
  const bytes = Utilities.base64Decode(img.split(',')[1]), f = folder().createFile(Utilities.newBlob(bytes, 'image/jpeg', prefix + Utilities.getUuid().slice(0, 8) + '.jpg'));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f.getId();
}
function trashFile(id) { if (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (x) {} } }
function saveAvatar(img, old) { const id = saveImg(img, 'av_'); trashFile(old); return id; }
function trashMedia(list) { list.forEach(m => { m = String(m || ''); if (m.indexOf('i:') === 0) trashFile(m.slice(2)); }); }   // comment photos are deleted with their comment

/* ---------- read ---------- */
/* Everything public is computed once into a "snapshot" that is cached. Every successful write changes the cache version,
   so the next read rebuilds it — readers never see stale data, and normal page loads do not touch the spreadsheet at all. */
function ver() { const c = cache(); let v = c.get('ver'); if (!v) { v = Utilities.getUuid().slice(0, 8); c.put('ver', v, 21600); } return v; }
function bump() { cache().put('ver', Utilities.getUuid().slice(0, 8), 21600); }
function snap() {
  const c = cache(), v = ver(), meta = c.get('s_' + v);
  if (meta) {
    const keys = []; for (let i = 0; i < Number(meta); i++) keys.push('s_' + v + '_' + i);
    const got = c.getAll(keys); let str = '';
    for (let i = 0; i < keys.length; i++) { if (got[keys[i]] == null) { str = null; break; } str += got[keys[i]]; }
    if (str != null) { try { return JSON.parse(str); } catch (e) {} }
  }
  const d = buildSnap(), str = JSON.stringify(d), kv = {}; let n = 0;
  for (let i = 0; i < str.length;) {                   // never cut between the two halves of an emoji
    let j = Math.min(i + CHUNK, str.length); if (j < str.length) { const k = str.charCodeAt(j - 1); if (k >= 0xD800 && k <= 0xDBFF) j--; }
    kv['s_' + v + '_' + n++] = str.slice(i, j); i = j;
  }
  try { c.putAll(kv, SNAP_TTL); c.put('s_' + v, String(n), SNAP_TTL); } catch (e) {}
  return d;
}
function noteOut(r) { let x = {}; try { x = JSON.parse(String(r.extra || '{}')); } catch (e) {} return { id: String(r.id), kind: String(r.kind), title: String(r.title || ''), body: String(r.body || ''), extra: x, category: String(r.category || ''), date: String(r.date) }; }
function buildSnap() {
  const R = rows('Reactions'), C = rows('Comments'), P = rows('Photos'), N = rows('Notes'), V = rows('PollVotes');
  const likes = {}, cc = {}, score = {}, mineIdx = {}, po = {}, pc = {}, pvIdx = {}, users = {}, optLen = {};
  R.forEach(r => { const k = String(r.post), u = String(r.uid); likes[k] = (likes[k] || 0) + 1; (mineIdx[u] = mineIdx[u] || []).push(k); if (u !== 'official') score[u] = (score[u] || 0) + 1; });
  C.forEach(c => { const k = String(c.post); cc[k] = (cc[k] || 0) + 1; if (c.uid !== 'official') score[c.uid] = (score[c.uid] || 0) + 3; });
  P.forEach(r => po[String(r.id)] = String(r.uid || ''));
  rows('Users').forEach(u => users[u.uid] = { n: String(u.name), a: String(u.avatar || ''), b: String(u.badges || '') });
  const notes = N.slice().reverse().slice(0, 100).map(noteOut);
  N.forEach(r => { if (r.kind === 'poll') { let x = {}; try { x = JSON.parse(String(r.extra || '{}')); } catch (e) {} optLen[String(r.id)] = (x.options || []).length; } });
  V.forEach(v => { const k = String(v.post), n = optLen[k], o = Number(v.option); if (!n || !(o >= 0 && o < n)) return; (pc[k] = pc[k] || new Array(n).fill(0))[o]++; (pvIdx[String(v.uid)] = pvIdx[String(v.uid)] || {})[k] = o; });
  const top = Object.keys(score).filter(u => users[u] && score[u] >= TOPFAN_MIN).sort((a, b) => score[b] - score[a]).slice(0, TOPFAN_COUNT);
  const votes = {}; rows('Votes').forEach(r => { const k = r.poll + '_' + r.option; votes[k] = (votes[k] || 0) + 1; });
  return {
    photos: P.slice().reverse().slice(0, 300).map(r => ({ id: String(r.id), name: r.name, category: r.category, caption: r.caption, date: r.date, fileId: r.fileId, uid: String(r.uid || '') })),
    messages: rows('Messages').reverse().slice(0, 200), votes: votes, likes: likes, cc: cc, notes: notes, pc: pc, users: users, top: top, mineIdx: mineIdx, pvIdx: pvIdx, po: po,
    rx: R.slice(-RX_KEEP).map(r => [String(r.post), String(r.uid), String(r.date)]),
    comments: C.slice(-FEED_COMMENTS).map(c => ({ id: String(c.id), post: String(c.post), parent: String(c.parent || ''), uid: String(c.uid), text: String(c.text), date: String(c.date), media: String(c.media || '') }))
  };
}
/* notifications for one person (uid, or 'official'): loves + comments on their posts, replies / mentions / loves on their comments */
function notifs(s, uid) {
  const out = [], co = {}, me = s.users[uid] ? String(s.users[uid].n).toLowerCase() : '';
  s.comments.forEach(c => co[c.id] = c);
  const mine = post => uid === 'official' ? (!(post in s.po) || s.po[post] === 'official') : s.po[post] === uid;   // official owns config photos + admin posts
  s.rx.forEach(r => {
    if (r[1] === uid) return;
    if (r[0].indexOf('c_') === 0) { const c = co[r[0].slice(2)]; if (c && c.uid === uid) out.push({ t: 'cl', p: c.post, c: c.id, by: r[1], d: r[2] }); }
    else if (mine(r[0])) out.push({ t: 'l', p: r[0], by: r[1], d: r[2] });
  });
  s.comments.forEach(c => {
    if (c.uid === uid) return;
    const x = c.text.slice(0, 80), k = c.media ? c.media[0] : '';
    if (!c.parent) { if (mine(c.post)) out.push({ t: 'c', p: c.post, c: c.id, by: c.uid, d: c.date, x: x, k: k }); return; }
    const root = co[c.parent], mention = me && c.text.toLowerCase().indexOf('@' + me) === 0;
    if ((root && root.uid === uid) || mention) out.push({ t: root && root.uid === uid ? 'r' : 'm', p: c.post, c: c.id, by: c.uid, d: c.date, x: x, k: k });
  });
  return out.sort((a, b) => a.d < b.d ? 1 : -1).slice(0, NOTIF_MAX);
}
function doGet(e) {
  const p = (e && e.parameter) || {}, s = snap();
  if (p.scope !== 'feed') return out({ ok: 1, messages: s.messages, photos: s.photos, votes: s.votes, likes: s.likes, cc: s.cc, notes: s.notes, pc: s.pc });
  const uid = clean(p.uid, 24);
  return out({ ok: 1, likes: s.likes, cc: s.cc, comments: s.comments, users: s.users, top: s.top, notes: s.notes, pc: s.pc,
    mine: uid ? (s.mineIdx[uid] || []) : [], pmine: uid ? (s.pvIdx[uid] || {}) : {}, nf: uid ? notifs(s, uid) : [], now: new Date().toISOString() });
}

/* ---------- write ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents), now = new Date().toISOString(), id = Utilities.getUuid().slice(0, 8), A = ACT[d.action];
    if (!A) return out({ ok: 0, error: 'action' });
    const res = A(d, now, id);
    if (d.action !== 'auth' && d.action !== 'me') { try { if (res.getContent().indexOf('"ok":1') > -1) bump(); } catch (x) {} }
    return res;
  } catch (err) { return out({ ok: 0, error: String(err) }); }
  finally { lock.releaseLock(); }
}
const ACT = {
  message(d, now, id) {
    const it = { id: id, name: clean(d.name, 30), message: clean(d.message, 240), date: now };
    if (!it.name || !it.message) return out({ ok: 0, error: 'empty' });
    if (limited(d.cid, COOLDOWN)) return out({ ok: 0, error: 'wait' });
    put('Messages', it); return out({ ok: 1, item: it });
  },
  photo(d, now, id) {                                      // visitor photo, or an official-page photo (admin key)
    const img = String(d.image || ''); if (img.indexOf('data:image/') !== 0 || img.length > MAX_B64) return out({ ok: 0, error: 'image' });
    let uid = '', name = clean(d.name, 30) || 'Anonymous';
    if (d.as === 'official') { const a = actor(d); if (a.err) return out({ ok: 0, error: a.err }); uid = 'official'; }
    else {
      if (limited(d.cid, COOLDOWN)) return out({ ok: 0, error: 'wait' });
      if (d.uid) { const f = authUser(d); if (f) { uid = String(f.o.uid); name = String(f.o.name); } }
    }
    const bytes = Utilities.base64Decode(img.split(',')[1]);
    const f = folder().createFile(Utilities.newBlob(bytes, 'image/jpeg', id + '.jpg'));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const it = { id: id, name: name, category: clean(d.category, 40), caption: clean(d.caption, 140), date: now, fileId: f.getId(), uid: uid };
    put('Photos', it); return out({ ok: 1, item: it });
  },
  vote(d, now) { put('Votes', { poll: Number(d.poll) || 0, option: Number(d.option) || 0, date: now }); return out({ ok: 1 }); },
  auth(d) { const s = adminState(d.key); return out(s === 'ok' ? { ok: 1 } : { ok: 0, error: s }); },
  me(d) { const f = authUser(d); return out(f ? { ok: 1, user: pub(f.o) } : { ok: 0, error: find('Users', 'uid', d.uid) ? 'noauth' : 'unknown' }); },
  profile(d, now) {                                        // create (first time) or edit: username once, picture every AVATAR_DAYS days
    const uid = clean(d.uid, 24), sk = String(d.sk || ''); if (uid.length < 8 || sk.length < 16 || uid === 'official') return out({ ok: 0, error: 'bad' });
    const ex = find('Users', 'uid', uid), name = clean(d.name, 40).replace(/\s+/g, ' '), img = String(d.avatar || '');
    if (img && (img.indexOf('data:image/') !== 0 || img.length > MAX_AVATAR)) return out({ ok: 0, error: 'image' });
    if (!ex) {
      const err = nameError(name, uid); if (err) return out({ ok: 0, error: err });
      const o = { uid: uid, name: name, nameKey: nameKey(name), sk: sha(sk), avatar: img ? saveAvatar(img, '') : '', badges: '', ne: 0, avatarAt: img ? now : '', date: now };
      put('Users', o); return out({ ok: 1, user: pub(o) });
    }
    if (String(ex.o.sk) !== sha(sk)) return out({ ok: 0, error: 'noauth' });
    const upd = {};
    if (name && name !== String(ex.o.name)) {
      if (Number(ex.o.ne) >= NAME_EDITS) return out({ ok: 0, error: 'name_locked' });
      const err = nameError(name, uid); if (err) return out({ ok: 0, error: err });
      upd.name = name; upd.nameKey = nameKey(name); upd.ne = Number(ex.o.ne) + 1;
    }
    if (img) {
      const last = ex.o.avatarAt ? new Date(String(ex.o.avatarAt)).getTime() : 0, until = last + AVATAR_DAYS * 864e5;
      if (last && Date.now() < until) return out({ ok: 0, error: 'avatar_wait', until: new Date(until).toISOString() });
      upd.avatar = saveAvatar(img, String(ex.o.avatar || '')); upd.avatarAt = now;
    }
    if (Object.keys(upd).length) setRow('Users', ex.row, upd);
    return out({ ok: 1, user: pub(Object.assign({}, ex.o, upd)) });
  },
  react(d, now) {                                          // toggles a love on a photo / admin post (key = its id) or on a comment (key = c_<comment id>)
    const a = actor(d); if (a.err) return out({ ok: 0, error: a.err });
    const post = clean(d.post, 40); if (!post) return out({ ok: 0, error: 'post' });
    if (post.indexOf('c_') === 0 && !find('Comments', 'id', post.slice(2))) return out({ ok: 0, error: 'post' });
    if (limited('r_' + a.uid + '_' + post, 1)) return out({ ok: 0, error: 'wait' });
    const t = tab('Reactions'), lr = t.getLastRow(), v = lr > 1 ? t.getRange(2, 1, lr - 1, 2).getValues() : []; let liked = true, count = 0, mineRow = 0;
    for (let i = 0; i < v.length; i++) if (String(v[i][0]) === post) { count++; if (String(v[i][1]) === a.uid) mineRow = i + 2; }
    if (mineRow) { t.deleteRow(mineRow); liked = false; count--; } else { put('Reactions', { post: post, uid: a.uid, date: now }); count++; }
    return out({ ok: 1, liked: liked, count: count });
  },
  comment(d, now, id) {                                    // comment or reply (replies are always one level deep); may carry a sticker or a photo
    const a = actor(d); if (a.err) return out({ ok: 0, error: a.err });
    const post = clean(d.post, 40), text = clean(d.text, 300), st = String(d.sticker || ''), img = String(d.image || '');
    if (!post || (!text && !st && !img)) return out({ ok: 0, error: 'empty' });
    if (st && !/^[a-z0-9_]{1,40}$/.test(st)) return out({ ok: 0, error: 'sticker' });
    if (!st && img && (img.indexOf('data:image/') !== 0 || img.length > MAX_CIMG)) return out({ ok: 0, error: 'image' });
    if (limited('c_' + a.uid, !st && img ? COMMENT_IMG_COOLDOWN : COMMENT_COOLDOWN)) return out({ ok: 0, error: 'wait' });
    let parent = clean(d.parent, 20);
    if (parent) { const p = find('Comments', 'id', parent); if (!p || String(p.o.post) !== post) return out({ ok: 0, error: 'parent' }); parent = String(p.o.parent || p.o.id); }
    const media = st ? 's:' + st : img ? 'i:' + saveImg(img, 'cm_') : '';
    const it = { id: id, post: post, parent: parent, uid: a.uid, text: text, date: now, media: media };
    put('Comments', it); return out({ ok: 1, item: it });
  },
  delcomment(d) {                                          // admin: any comment · visitor: their own comment
    const c = find('Comments', 'id', clean(d.id, 20)); if (!c) return out({ ok: 1, removed: [] });
    let allowed = false;
    if (d.key) { const s = adminState(d.key); if (s !== 'ok') return out({ ok: 0, error: s }); allowed = true; }
    else { const f = authUser(d); allowed = !!f && String(f.o.uid) === String(c.o.uid); }
    if (!allowed) return out({ ok: 0, error: 'noauth' });
    trashMedia([c.o.media].concat(rows('Comments').filter(x => String(x.parent) === String(c.o.id)).map(x => x.media)));
    const removed = delWhere('Comments', 'parent', c.o.id); const again = find('Comments', 'id', c.o.id);
    if (again) { tab('Comments').deleteRow(again.row); removed.push(String(c.o.id)); }
    delRx(removed.map(i => 'c_' + i));
    return out({ ok: 1, removed: removed });
  },
  badge(d) {                                               // admin: give / remove "verified" or "admin" badge
    const s = adminState(d.key); if (s !== 'ok') return out({ ok: 0, error: s });
    const b = String(d.badge); if (b !== 'verified' && b !== 'admin') return out({ ok: 0, error: 'badge' });
    const u = find('Users', 'uid', clean(d.uid, 24)); if (!u) return out({ ok: 0, error: 'user' });
    const set = String(u.o.badges || '').split(',').filter(Boolean).filter(x => x !== b); if (d.on) set.push(b);
    setRow('Users', u.row, { badges: set.join(',') }); return out({ ok: 1, badges: set.join(',') });
  },
  delete(d) {                                              // admin: delete a photo or an admin post (with its comments, loves, votes) or a message
    const s = adminState(d.key); if (s !== 'ok') return out({ ok: 0, error: s });
    const n = d.type === 'photo' ? 'Photos' : d.type === 'note' ? 'Notes' : 'Messages', t = tab(n), v = t.getDataRange().getValues();
    for (let i = v.length - 1; i > 0; i--) if (String(v[i][0]) === String(d.id)) {
      if (n === 'Photos') { try { DriveApp.getFileById(v[i][5]).setTrashed(true); } catch (x) {} }
      if (n !== 'Messages') { trashMedia(rows('Comments').filter(x => String(x.post) === String(d.id)).map(x => x.media)); const gone = delWhere('Comments', 'post', d.id); delRx([String(d.id)].concat(gone.map(k => 'c_' + k))); if (n === 'Notes') delWhere('PollVotes', 'post', d.id); }
      t.deleteRow(i + 1);
    }
    return out({ ok: 1 });
  },
  note(d, now, id) {                                       // admin only: text post / new occasion / poll, shown in the posts page (never on the memory board)
    const s = adminState(d.key); if (s !== 'ok') return out({ ok: 0, error: s });
    const kind = String(d.kind), x = d.extra || {}, extra = {}, title = clean(d.title, 100), body = clean(d.body, 1500);
    if (['text', 'event', 'poll'].indexOf(kind) < 0) return out({ ok: 0, error: 'kind' });
    if (kind === 'text') { if (!body) return out({ ok: 0, error: 'empty' }); extra.theme = THEMES.indexOf(x.theme) >= 0 ? x.theme : 'wine'; }
    if (kind === 'event') { if (!title) return out({ ok: 0, error: 'empty' }); extra.emoji = clean(x.emoji, 8); extra.when = clean(x.when, 32); extra.place = clean(x.place, 80); }
    if (kind === 'poll') {
      if (!title) return out({ ok: 0, error: 'empty' });
      extra.options = (Array.isArray(x.options) ? x.options : []).map(o => clean(o, 80)).filter(Boolean).slice(0, 6);
      if (extra.options.length < 2) return out({ ok: 0, error: 'options' });
    }
    const it = { id: id, kind: kind, title: title, body: body, extra: JSON.stringify(extra), category: clean(d.category, 40), date: now };
    put('Notes', it); return out({ ok: 1, item: noteOut(it) });
  },
  pollvote(d, now) {                                       // a member votes (or changes the vote) in an admin poll
    const f = authUser(d); if (!f) return out({ ok: 0, error: 'noauth' });
    const post = clean(d.post, 40), opt = Number(d.option), n = find('Notes', 'id', post);
    if (!n || n.o.kind !== 'poll') return out({ ok: 0, error: 'post' });
    let len = 0; try { len = (JSON.parse(String(n.o.extra)).options || []).length; } catch (x) {}
    if (!(opt >= 0 && opt < len && opt % 1 === 0)) return out({ ok: 0, error: 'option' });
    if (limited('v_' + f.o.uid + '_' + post, 1)) return out({ ok: 0, error: 'wait' });
    const t = tab('PollVotes'), v = t.getDataRange().getValues(), uid = String(f.o.uid); let done = false;
    for (let i = 1; i < v.length; i++) if (String(v[i][0]) === post && String(v[i][1]) === uid) { t.getRange(i + 1, 3, 1, 2).setNumberFormat('@').setValues([[String(opt), now]]); v[i][2] = String(opt); done = true; break; }
    if (!done) { put('PollVotes', { post: post, uid: uid, option: opt, date: now }); v.push([post, uid, String(opt), now]); }
    const counts = new Array(len).fill(0); for (let i = 1; i < v.length; i++) if (String(v[i][0]) === post) { const o = Number(v[i][2]); if (o >= 0 && o < len) counts[o]++; }
    return out({ ok: 1, option: opt, counts: counts });
  }
};
