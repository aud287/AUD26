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
const NAME_EDITS = 1;                     // how many times a username can be changed after it is created
const AVATAR_DAYS = 7;                    // a profile picture can be changed once every N days
const TOPFAN_COUNT = 3;                   // how many "Top fan" badges are shown at the same time
const TOPFAN_MIN = 5;                     // minimum score (1 per love, 3 per comment/reply) to be a top fan
const FEED_COMMENTS = 2000;               // newest comments sent to the posts page
const RESERVED = ['admin', 'administrator', 'official', 'moderator', 'support', 'ادمن', 'الادمن', 'مشرف', 'الادارة', 'ادارة']; // add your class page name here
const HEAD = {
  Messages: ['id', 'name', 'message', 'date'],
  Photos: ['id', 'name', 'category', 'caption', 'date', 'fileId', 'uid'],
  Votes: ['poll', 'option', 'date'],
  Users: ['uid', 'name', 'nameKey', 'sk', 'avatar', 'badges', 'ne', 'avatarAt', 'date'],
  Reactions: ['post', 'uid', 'date'],
  Comments: ['id', 'post', 'parent', 'uid', 'text', 'date']
};

/* ---------- sheet helpers (every cell is written as plain text, so nothing a visitor types can become a formula) ---------- */
function tab(n) {
  const ss = SpreadsheetApp.getActive();
  let t = ss.getSheetByName(n);
  if (!t) { t = ss.insertSheet(n); t.getRange(1, 1, 1, HEAD[n].length).setValues([HEAD[n]]); return t; }
  if (t.getLastColumn() < HEAD[n].length) {            // older sheet: add the new columns at the end
    const lc = Math.max(1, t.getLastColumn()), h = t.getRange(1, 1, 1, lc).getValues()[0].map(String), miss = HEAD[n].filter(k => h.indexOf(k) < 0);
    if (miss.length) t.getRange(1, lc + 1, 1, miss.length).setValues([miss]);
  }
  return t;
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
function saveAvatar(img, old) {
  const bytes = Utilities.base64Decode(img.split(',')[1]), f = folder().createFile(Utilities.newBlob(bytes, 'image/jpeg', 'av_' + Utilities.getUuid().slice(0, 8) + '.jpg'));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (x) {} }
  return f.getId();
}

/* ---------- read ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {}, feed = p.scope === 'feed', R = rows('Reactions'), C = rows('Comments'), likes = {}, cc = {}, mine = [], score = {};
  R.forEach(r => { const k = String(r.post); likes[k] = (likes[k] || 0) + 1; if (feed && p.uid && String(r.uid) === p.uid) mine.push(k); if (r.uid !== 'official') score[r.uid] = (score[r.uid] || 0) + 1; });
  C.forEach(c => { const k = String(c.post); cc[k] = (cc[k] || 0) + 1; if (c.uid !== 'official') score[c.uid] = (score[c.uid] || 0) + 3; });
  const photos = rows('Photos').reverse().slice(0, 300).map(r => ({ id: String(r.id), name: r.name, category: r.category, caption: r.caption, date: r.date, fileId: r.fileId, uid: String(r.uid || '') }));
  if (!feed) {
    const votes = {}; rows('Votes').forEach(r => { const k = r.poll + '_' + r.option; votes[k] = (votes[k] || 0) + 1; });
    return out({ ok: 1, messages: rows('Messages').reverse().slice(0, 200), photos: photos, votes: votes, likes: likes, cc: cc });
  }
  const users = {}; rows('Users').forEach(u => users[u.uid] = { n: String(u.name), a: String(u.avatar || ''), b: String(u.badges || '') });
  const top = Object.keys(score).filter(u => users[u] && score[u] >= TOPFAN_MIN).sort((a, b) => score[b] - score[a]).slice(0, TOPFAN_COUNT);
  const comments = C.slice(-FEED_COMMENTS).map(c => ({ id: String(c.id), post: String(c.post), parent: String(c.parent || ''), uid: String(c.uid), text: String(c.text), date: String(c.date) }));
  return out({ ok: 1, likes: likes, cc: cc, mine: mine, comments: comments, users: users, top: top });
}

/* ---------- write ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents), now = new Date().toISOString(), id = Utilities.getUuid().slice(0, 8), A = ACT[d.action];
    return A ? A(d, now, id) : out({ ok: 0, error: 'action' });
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
  react(d, now) {                                          // toggles a love on a post
    const a = actor(d); if (a.err) return out({ ok: 0, error: a.err });
    const post = clean(d.post, 40); if (!post) return out({ ok: 0, error: 'post' });
    if (limited('r_' + a.uid + '_' + post, 1)) return out({ ok: 0, error: 'wait' });
    const t = tab('Reactions'), v = t.getDataRange().getValues(); let liked = true, count = 0, mineRow = 0;
    for (let i = 1; i < v.length; i++) if (String(v[i][0]) === post) { count++; if (String(v[i][1]) === a.uid) mineRow = i + 1; }
    if (mineRow) { t.deleteRow(mineRow); liked = false; count--; } else { put('Reactions', { post: post, uid: a.uid, date: now }); count++; }
    return out({ ok: 1, liked: liked, count: count });
  },
  comment(d, now, id) {                                    // comment, or a reply (replies are always one level deep)
    const a = actor(d); if (a.err) return out({ ok: 0, error: a.err });
    const post = clean(d.post, 40), text = clean(d.text, 300); if (!post || !text) return out({ ok: 0, error: 'empty' });
    if (limited('c_' + a.uid, COMMENT_COOLDOWN)) return out({ ok: 0, error: 'wait' });
    let parent = clean(d.parent, 20);
    if (parent) { const p = find('Comments', 'id', parent); if (!p || String(p.o.post) !== post) return out({ ok: 0, error: 'parent' }); parent = String(p.o.parent || p.o.id); }
    const it = { id: id, post: post, parent: parent, uid: a.uid, text: text, date: now };
    put('Comments', it); return out({ ok: 1, item: it });
  },
  delcomment(d) {                                          // admin: any comment · visitor: their own comment
    const c = find('Comments', 'id', clean(d.id, 20)); if (!c) return out({ ok: 1, removed: [] });
    let allowed = false;
    if (d.key) { const s = adminState(d.key); if (s !== 'ok') return out({ ok: 0, error: s }); allowed = true; }
    else { const f = authUser(d); allowed = !!f && String(f.o.uid) === String(c.o.uid); }
    if (!allowed) return out({ ok: 0, error: 'noauth' });
    const removed = delWhere('Comments', 'parent', c.o.id); const again = find('Comments', 'id', c.o.id);
    if (again) { tab('Comments').deleteRow(again.row); removed.push(String(c.o.id)); }
    return out({ ok: 1, removed: removed });
  },
  badge(d) {                                               // admin: give / remove "verified" or "admin" badge
    const s = adminState(d.key); if (s !== 'ok') return out({ ok: 0, error: s });
    const b = String(d.badge); if (b !== 'verified' && b !== 'admin') return out({ ok: 0, error: 'badge' });
    const u = find('Users', 'uid', clean(d.uid, 24)); if (!u) return out({ ok: 0, error: 'user' });
    const set = String(u.o.badges || '').split(',').filter(Boolean).filter(x => x !== b); if (d.on) set.push(b);
    setRow('Users', u.row, { badges: set.join(',') }); return out({ ok: 1, badges: set.join(',') });
  },
  delete(d) {                                              // admin: delete a photo (with its comments and loves) or a message
    const s = adminState(d.key); if (s !== 'ok') return out({ ok: 0, error: s });
    const n = d.type === 'photo' ? 'Photos' : 'Messages', t = tab(n), v = t.getDataRange().getValues();
    for (let i = v.length - 1; i > 0; i--) if (String(v[i][0]) === String(d.id)) {
      if (n === 'Photos') { try { DriveApp.getFileById(v[i][5]).setTrashed(true); } catch (x) {} delWhere('Comments', 'post', d.id); delWhere('Reactions', 'post', d.id); }
      t.deleteRow(i + 1);
    }
    return out({ ok: 1 });
  }
};
