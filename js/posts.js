/* =====================================================================================
   MEMORY POSTS PAGE
   - Hash routes:  #/posts   and   #/posts/POST_ID   (works with the browser Back button)
   - Identity is device-bound: no accounts, no emails. A random uid + secret live in localStorage.
   - Admin (open  yoursite/#admin): can post as the OFFICIAL page or as their own visitor profile.
     The two identities are completely separate, so there is never a conflict on the same device.
   Uses globals from app.js: $, $$, el, ok, safe, clean, fmt, FID, h32, toast, ask, api, BACKEND,
   CONFIG, MEM, LIKES, CC, cat, list, pidOf, board, openLB, openAdd, syncCounts, paintCounts, ADM, ADK, AS
   ===================================================================================== */
(function () {
  'use strict';

  /* ---------- constants (keep in sync with backend/Code.gs) ---------- */
  const PAGE = 8;                     // posts rendered per chunk (infinite scroll)
  const NAME_EDITS = 1, AVATAR_DAYS = 7;
  const NAME_RE = /^(?=(?:.*[\p{L}\p{N}]){2})[\p{L}\p{N}_. -]{3,20}$/u;
  const ERR = {
    wait: 'Slow down a little, then try again.',
    name_bad: 'Use 3–20 letters, numbers, spaces, dots, dashes or underscores.',
    name_taken: 'That username is taken. Try another one.',
    name_reserved: 'That name is reserved. Try another one.',
    name_locked: 'You already used your one username change.',
    image: 'That photo is too large or not supported.',
    noauth: 'Your profile was not recognised. Choose a username again.',
    key: 'The admin key was not accepted.',
    unset: 'Change ADMIN_KEY in backend/Code.gs first.',
    empty: 'Write something first.',
    parent: 'That comment no longer exists.',
    bad: 'Something is wrong with this profile. Try again.'
  };
  const err = c => ERR[c] || (c ? 'Something went wrong. Try again.' : 'Could not reach the server. Check your connection.');

  const SVG = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="17" height="17"><circle cx="12" cy="12" r="11" fill="#2f7fe8"/><path d="M7.2 12.4l3.2 3.2 6.4-6.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="#6b1a2e" d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z"/></svg>',
    anon: '<svg viewBox="0 0 24 24" width="55%" height="55%" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="#fff"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="#fff"/></svg>'
  };

  /* ---------- storage helpers ---------- */
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const rnd = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => (b % 36).toString(36)).join(''); };

  /* ---------- identity: this device's visitor profile ---------- */
  let ME = null;
  try { ME = JSON.parse(LS.get('aud_me') || 'null'); } catch (e) { ME = null; }
  if (!ME || !ME.uid || !ME.sk) ME = null;
  const saveMe = () => ME ? LS.set('aud_me', JSON.stringify(ME)) : LS.del('aud_me');
  const official = () => ADM && AS === 'official';
  const OFF = { n: CONFIG.className, a: '', b: 'admin,verified', off: 1 };
  /* credentials sent with every write: the official page (admin key) OR this device's profile */
  const idp = () => official() ? { as: 'official', key: ADK } : ME ? { uid: ME.uid, sk: ME.sk } : {};
  const me = () => official() ? { uid: 'official' } : ME ? { uid: ME.uid } : {};

  /* ---------- state ---------- */
  const S = {
    open: false, done: false, pid: '', prev: null, loaded: false, loading: false, fetchedAt: 0, shown: 0, list: [],
    com: {},          // post id -> [comments] (oldest first)
    users: {},        // uid -> {n, a, b}
    top: new Set(),   // uids that are "top fans"
    mine: new Set(),  // posts the current identity loved
    all: {},          // post id -> all comments expanded
    rep: {},          // comment id -> replies expanded
    busy: new Set(),
    cards: new Map(),
    align: ''
  };
  const U = uid => uid === 'official' ? OFF : S.users[uid] || (ME && uid === ME.uid ? { n: ME.name, a: ME.avatar || '', b: ME.badges || '' } : null);
  const feedList = () => list().filter(m => !m.ev);
  const ago = iso => {
    const t = new Date(iso).getTime(); if (!t) return '';
    const s = Math.max(0, (Date.now() - t) / 1e3);
    return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : s < 604800 ? Math.floor(s / 86400) + 'd' : fmt(iso);
  };
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);

  /* =============================== small UI pieces =============================== */
  const initial = n => ([...String(n || '?').trim()][0] || '?').toUpperCase();
  function avatar(u, name, px) {
    const a = el('span', 'pv-av'); a.style.setProperty('--s', px + 'px');
    if (u && u.off) {
      a.classList.add('logo');
      const ai = DR(G('officialAvatar'), 1) || CONFIG.logo;
if (ok(ai)) { const i = new Image(); i.src = ai; i.alt = ''; a.append(i); } else a.textContent = '★';
      return a;
    }
    const ini = () => { a.replaceChildren(); a.textContent = initial(name); a.style.setProperty('--h', parseInt(h32(String(name || '?')), 36) % 360); };
    const src = u && u.a ? (String(u.a).indexOf('data:') === 0 ? u.a : FID(u.a, px > 48 ? 240 : 120)) : '';
    if (src) { const i = new Image(); i.alt = ''; i.decoding = 'async'; i.onerror = ini; i.src = src; a.append(i); } else ini();
    return a;
  }
  function badge(k) {
    const s = el('span', 'pv-b ' + k);
    if (k === 'verified') { s.title = 'Verified'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Verified'); s.innerHTML = SVG.check; }
    else if (k === 'admin') {
      s.title = 'Admin'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Admin');
const bi = DR(G('adminBadge'), 1) || CONFIG.logo;
if (ok(bi)) { const i = new Image(); i.src = bi; i.alt = ''; s.append(i); } else s.innerHTML = SVG.shield;
    } else { s.title = 'One of the most active people here'; s.innerHTML = SVG.star + '<span>Top fan</span>'; }
    return s;
  }
  /* name + badges. Admins can click a visitor's name to give or remove badges. */
  function who(uid, name, u) {
    const w = el('span', 'pv-who'), n = el(ADM && uid && uid !== 'official' ? 'button' : 'span', 'pv-n', name);
    n.dir = 'auto'; if (n.tagName === 'BUTTON') { n.type = 'button'; n.title = 'Manage badges'; n.onclick = () => openUM(uid); }
    w.append(n);
    const b = ((u && u.b) || '').split(',');
    if (b.indexOf('admin') > -1) w.append(badge('admin'));
    if (b.indexOf('verified') > -1) w.append(badge('verified'));
    if (uid && S.top.has(uid)) w.append(badge('top'));
    return w;
  }
  function author(m) {
    if (m.uid) { const u = U(m.uid); return { uid: m.uid, name: u ? u.n : (m.name || 'Member'), u }; }
    if (m.name) return { uid: '', name: m.name, u: null };
    return { uid: 'official', name: OFF.n, u: OFF };          // photos from config.js belong to the site itself
  }
  function mentionLen(t) {
    if (t[0] !== '@') return 0;
    const low = t.slice(1).toLowerCase(); let best = 0;
    [OFF.n].concat(Object.values(S.users).map(u => u.n)).forEach(n => { if (n && low.indexOf(n.toLowerCase()) === 0 && n.length + 1 > best) best = n.length + 1; });
    if (!best) { const m = /^@\S+/.exec(t); best = m ? m[0].length : 0; }
    return best;
  }
  function textEl(t) {
    const p = el('p', 'pv-txt'); p.dir = 'auto'; const n = mentionLen(t);
    if (n) p.append(el('span', 'pv-mn', t.slice(0, n)), document.createTextNode(t.slice(n))); else p.textContent = t;
    return p;
  }
  const actorView = () => official() ? OFF : ME ? { n: ME.name, a: ME.avatar } : null;
  function meAvatar(px) {
    const u = actorView(), a = avatar(u, u ? u.n : '', px || 34); a.classList.add('pv-meav');
    if (!u) { a.classList.add('anon'); a.replaceChildren(); a.innerHTML = SVG.anon; }
    return a;
  }

  /* =============================== profile dialog =============================== */
  const P = { img: '', res: null, done: false, busy: false, avLocked: false };
  const pd = $('#pd');
  function perr(t) { const e = $('#pde'); e.hidden = !t; e.textContent = t || ''; }
  function pbusy(v) { P.busy = v; $('#pdok').disabled = v; $('#pdsp').hidden = !v; }
  function paintPick() {
    const name = $('#pdn').value || (ME ? ME.name : '');
    const u = P.img ? { a: P.img } : ME ? { a: ME.avatar } : null;
    $('#pdph').replaceChildren(avatar(u, name, 76));
  }
  function openProfile() {
    return new Promise(res => {
      P.res = res; P.img = ''; P.done = false; perr('');
      const edit = !!ME, nameLocked = edit && (ME.ne || 0) >= NAME_EDITS;
      $('#pdt').textContent = edit ? 'Your profile' : 'Choose a username';
      $('#pds').textContent = edit ? 'Saved on this device only. There is no account to log in to.' : 'No account or email needed. Your profile stays on this device.';
      $('#pdn').value = edit ? ME.name : ''; $('#pdn').disabled = nameLocked;
      $('#pdnn').textContent = nameLocked ? 'You already used your one username change.' : edit ? 'You can change your username once. Pick carefully.' : '3–20 characters. You can change it once later.';
      const until = edit && ME.at ? new Date(ME.at).getTime() + AVATAR_DAYS * 864e5 : 0;
      P.avLocked = until > Date.now();
      $('#pdfile').disabled = P.avLocked; $('#pdav').classList.toggle('locked', P.avLocked); $('#pdav').setAttribute('aria-disabled', String(P.avLocked));
      $('#pdavn').textContent = P.avLocked ? 'You can change your photo again on ' + fmt(new Date(until).toISOString()) + '.' : edit ? 'Change it now. After that, once every ' + AVATAR_DAYS + ' days.' : 'Optional. You can change it later, once every ' + AVATAR_DAYS + ' days.';
      $('#pdbt').textContent = edit ? 'SAVE CHANGES' : 'SAVE AND CONTINUE';
      $('#pdfile').value = ''; paintPick(); pbusy(false);
      pd.showModal(); if (!nameLocked) setTimeout(() => $('#pdn').focus(), 60);
    });
  }
  function closeProfile(v) { P.done = true; pd.close(); const r = P.res; P.res = null; if (r) r(v); }
  pd.addEventListener('close', () => { if (!P.done && P.res) { const r = P.res; P.res = null; r(false); } });
  $('#pdx').onclick = $('#pdc').onclick = () => pd.close();
  $('#pdn').oninput = () => { perr(''); if (!P.img && !(ME && ME.avatar)) paintPick(); };
  $('#pdav').onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && !P.avLocked) { e.preventDefault(); $('#pdfile').click(); } };
  $('#pdav').onclick = e => { if (P.avLocked) { e.preventDefault(); perr($('#pdavn').textContent); } };
  $('#pdfile').onchange = async () => {
    const f = $('#pdfile').files[0]; if (!f || !/^image\//.test(f.type)) return;
    try { P.img = await squarePhoto(f, 256); perr(''); paintPick(); } catch (e) { perr(ERR.image); }
  };
  function squarePhoto(f, px) {
    return new Promise((res, rej) => {
      const i = new Image(), u = URL.createObjectURL(f);
      i.onload = () => { const s = Math.min(i.width, i.height), c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(i, (i.width - s) / 2, (i.height - s) / 2, s, s, 0, 0, px, px); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .85)); };
      i.onerror = () => { URL.revokeObjectURL(u); rej(); }; i.src = u;
    });
  }
  $('#pdf').onsubmit = async e => {
    e.preventDefault(); if (P.busy) return;
    const edit = !!ME, name = clean($('#pdn').value, 20).replace(/\s+/g, ' '), changed = edit ? name !== ME.name : true;
    if (changed && !$('#pdn').disabled && !NAME_RE.test(name)) return perr(ERR.name_bad);
    if (edit && !changed && !P.img) return closeProfile(true);
    const uid = edit ? ME.uid : rnd(12), sk = edit ? ME.sk : rnd(32);
    pbusy(true);
    const r = await api({ action: 'profile', uid, sk, name: changed ? name : '', avatar: P.img || '' });
    pbusy(false);
    let u = null;
    if (r.ok) u = { name: r.user.name, avatar: r.user.avatar, badges: r.user.badges || '', ne: r.user.ne || 0, at: r.user.at || '' };
    else if (r.demo) u = { name: changed ? name : ME.name, avatar: P.img || (edit ? ME.avatar : ''), badges: edit ? ME.badges : '', ne: edit && changed ? (ME.ne || 0) + 1 : edit ? ME.ne : 0, at: P.img ? new Date().toISOString() : edit ? ME.at : '' };
    if (!u) {
      if (r.error === 'avatar_wait') return perr('You can change your photo again on ' + fmt(r.until) + '.');
      if (r.error === 'noauth' && edit) { ME = null; saveMe(); paintMe(); return perr(ERR.noauth); }
      return perr(err(r.error));
    }
    ME = { uid, sk, name: u.name, avatar: u.avatar, badges: u.badges, ne: u.ne, at: u.at }; saveMe();
    S.users[uid] = { n: ME.name, a: ME.avatar, b: ME.badges };
    closeProfile(true); paintMe(); repaintAll();
    toast(edit ? 'Profile saved.' : 'Welcome, ' + ME.name + '!');
  };
  /* make sure there is somebody to post as; asks for a username the first time */
  async function needActor() {
    if (official() || ME) return true;
    return await openProfile();
  }

  /* =============================== admin: badges =============================== */
  let umUid = '';
  function paintUM() {
    const u = U(umUid); if (!u) return;
    const b = (u.b || '').split(',');
    $('#umw').replaceChildren(avatar(u, u.n, 52), el('b', '', u.n));
    [['#umv', 'Verified', 'verified'], ['#uma', 'Admin', 'admin']].forEach(([sel, label, k]) => {
      const on = b.indexOf(k) > -1, x = $(sel); x.setAttribute('aria-pressed', String(on)); x.replaceChildren(badge(k), el('span', '', label), el('em', '', on ? 'On' : 'Off'));
    });
  }
  function openUM(uid) { if (!ADM || !uid || uid === 'official' || !U(uid)) return; umUid = uid; paintUM(); $('#um').showModal(); }
  async function toggleBadge(k) {
    const u = U(umUid); if (!u) return; const has = (u.b || '').split(',').indexOf(k) > -1;
    const r = await api({ action: 'badge', key: ADK, uid: umUid, badge: k, on: !has });
    if (!r.ok && !r.demo) return toast(err(r.error));
    const set = (u.b || '').split(',').filter(Boolean).filter(x => x !== k); if (!has) set.push(k);
    u.b = r.ok ? r.badges : set.join(','); S.users[umUid] = u;
    if (ME && ME.uid === umUid) { ME.badges = u.b; saveMe(); }
    paintUM(); repaintAll();
  }
  $('#umv').onclick = () => toggleBadge('verified'); $('#uma').onclick = () => toggleBadge('admin'); $('#umx').onclick = () => $('#um').close();

  /* =============================== feed data =============================== */
  const note = (t, retry) => {
    const n = $('#pvnote'); n.hidden = !t; n.replaceChildren(); if (!t) return;
    n.append(el('span', '', t));
    if (retry) { const b = el('button', 'pv-retry', 'Retry'); b.type = 'button'; b.onclick = () => fetchFeed(); n.append(b); }
  };
  async function fetchFeed() {
    if (!BACKEND.enabled) { S.loaded = true; repaintAll(); return; }
    if (S.loading) return; S.loading = true;
    try {
      const uid = official() ? 'official' : ME ? ME.uid : '';
      const j = await (await fetch(BACKEND.apiUrl + '?scope=feed&uid=' + encodeURIComponent(uid) + '&t=' + Date.now())).json();
      if (!j.ok) throw 0;
      S.users = j.users || {}; S.top = new Set(j.top || []); S.mine = new Set(j.mine || []);
      LIKES = j.likes || {}; CC = j.cc || {};
      S.com = {}; (j.comments || []).forEach(c => (S.com[c.post] = S.com[c.post] || []).push(c));
      Object.keys(S.com).forEach(k => S.com[k].sort((a, b) => String(a.date) < String(b.date) ? -1 : 1));
      S.loaded = true; S.fetchedAt = Date.now(); note('');
      if (ME && S.users[ME.uid]) { const u = S.users[ME.uid]; ME.name = u.n; ME.avatar = u.a; ME.badges = u.b; saveMe(); }
    } catch (e) { note('Could not load comments and loves.', true); }
    S.loading = false; paintMe(); repaintAll(); $$('.slot[data-pid]').forEach(s => $$('.cc', s).forEach(x => paintCounts(x, s.dataset.pid)));
  }
  async function call(b) {
    const r = await api({ ...b, ...idp() });
    if (!r.ok && !r.demo) {
      if (r.error === 'noauth' && !official() && ME) { ME = null; saveMe(); paintMe(); toast(ERR.noauth); r.handled = true; }
      else if ((r.error === 'key' || r.error === 'unset') && official()) { toast(err(r.error)); r.handled = true; }
    }
    return r;
  }
  const fail = r => { if (!r.handled) toast(err(r.error)); };

  /* =============================== post cards =============================== */
  function card(m) {
    const id = pidOf(m), c = el('article', 'pv-post'); c.dataset.pid = id; c._m = m;
    const hd = el('div', 'pv-head'), md = el('div', 'pv-media ld'), ac = el('div', 'pv-act'), st = el('div', 'pv-stat'), cp = el('div', 'pv-cap');
    const com = el('div', 'pv-com'), more = el('button', 'pv-cmore'), cl = el('div', 'pv-clist');
    more.type = 'button'; more.onclick = () => { S.all[id] = true; paintComments(c); };
    com.append(more, cl, composer(c, { ph: 'Add a comment…' }));
    c.append(hd, md, ac, st, cp, com);
    buildMedia(c, md, m); S.cards.set(id, c);
    paintHead(c); paintActions(c); paintCaption(c); paintComments(c);
    return c;
  }
  function buildMedia(c, md, m) {
    const u = m.mid || m.url || m.thumb, id = pidOf(m);
    if (safe(u)) {
      const i = new Image(); i.alt = m.cp || m.title || 'Memory photo'; i.decoding = 'async'; i.loading = 'lazy';
      i.onload = () => { md.classList.remove('ld'); realign(); }; i.onerror = () => md.classList.remove('ld'); i.src = u; md.append(i);
    } else { md.classList.remove('ld'); const s = el('span', 'pv-em', m.e || '📷'), h = parseInt(h32(id), 36) % 360; s.style.background = 'linear-gradient(135deg,hsl(' + h + ' 70% 84%),hsl(' + ((h + 40) % 360) + ' 65% 72%))'; md.append(s); }
    if (m.cat) { const t = el('button', 'pv-tag', m.cat); t.type = 'button'; t.title = 'Show only ' + m.cat; t.onclick = e => { e.stopPropagation(); setCat(m.cat.toUpperCase()); }; md.append(t); }
    /* tap = enlarge · double tap = love */
    let last = 0, timer = 0;
    md.tabIndex = 0; md.setAttribute('role', 'button'); md.setAttribute('aria-label', 'Enlarge photo');
    md.onkeydown = e => { if (e.key === 'Enter') openLB([m], 0); };
    md.onclick = e => {
      if (e.target.closest('.pv-tag')) return;
      const t = Date.now();
      if (t - last < 320) { last = 0; clearTimeout(timer); burst(md); love(c, true); } else { last = t; timer = setTimeout(() => openLB([m], 0), 320); }
    };
  }
  function burst(md) { const b = el('span', 'pv-burst'); b.innerHTML = SVG.heart; b.firstChild.setAttribute('fill', 'currentColor'); md.append(b); setTimeout(() => b.remove(), 800); }

  function paintHead(c) {
    const m = c._m, a = author(m), hd = c.querySelector('.pv-head'); hd.replaceChildren();
    const t = el('div', 'pv-hd'); t.append(who(a.uid, a.name, a.u), el('div', 'pv-when', fmt(m.date)));
    hd.append(avatar(a.u, a.name, 42), t);
    if (m.id) {                                                  // only photos stored in the backend can be deleted from here
      const x = el('button', 'pv-x'); x.type = 'button'; x.setAttribute('aria-label', 'Delete post'); x.title = 'Delete post'; x.innerHTML = SVG.trash;
      x.onclick = () => del('photo', m.id); hd.append(x);
    }
  }
  const RTL = /^[^\p{L}]*[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;   // does the caption itself start with an Arabic/Hebrew letter?
  function paintCaption(c) {
    const m = c._m, a = author(m), t = m.cp != null ? m.cp : m.title, box = c.querySelector('.pv-cap');
    box.hidden = !t; box.replaceChildren(); if (!t) return;
    box.dir = RTL.test(t) ? 'rtl' : 'ltr';                       // direction follows the caption, not the author's name
    const b = el('b', ''), i = document.createElement('bdi'); i.textContent = a.name; b.append(i);
    box.append(b, document.createTextNode(' ' + t));
  }
  function paintActions(c) {
    const id = pidOf(c._m), ac = c.querySelector('.pv-act'), st = c.querySelector('.pv-stat'), liked = S.mine.has(id);
    const l = LIKES[id] || 0, n = (S.com[id] ? S.com[id].length : CC[id]) || 0;
    ac.replaceChildren();
    const b1 = el('button', 'pv-ab'), b2 = el('button', 'pv-ab'), b3 = el('button', 'pv-ab pv-share');
    [b1, b2, b3].forEach(b => b.type = 'button');
    b1.setAttribute('aria-pressed', String(liked)); b1.setAttribute('aria-label', liked ? 'Remove your love' : 'Love this photo'); b1.innerHTML = SVG.heart; b1.append(el('span', '', liked ? 'Loved' : 'Love')); b1.onclick = () => love(c);
    b2.setAttribute('aria-label', 'Write a comment'); b2.innerHTML = SVG.chat; b2.append(el('span', '', 'Comment')); b2.onclick = () => { S.all[id] = true; paintComments(c); c.querySelector('.pv-com > .pv-form textarea').focus(); };
    b3.setAttribute('aria-label', 'Share this photo'); b3.innerHTML = SVG.send; b3.append(el('span', '', 'Share')); b3.onclick = () => share(c._m);
    ac.append(b1, b2, b3);
    st.hidden = !l && !n; st.replaceChildren();
    if (l) st.append(el('b', '', plural(l, 'love', 'loves')));
    if (l && n) st.append(document.createTextNode('  '));
    if (n) st.append(el('span', '', plural(n, 'comment', 'comments')));
  }
  async function love(c, onlyAdd) {
    const id = pidOf(c._m); if (S.busy.has('l' + id)) return;
    if (onlyAdd && S.mine.has(id)) return;
    if (!await needActor()) return;
    const had = S.mine.has(id); S.busy.add('l' + id);
    if (had) { S.mine.delete(id); LIKES[id] = Math.max(0, (LIKES[id] || 0) - 1); } else { S.mine.add(id); LIKES[id] = (LIKES[id] || 0) + 1; }
    paintActions(c); syncCounts(id);
    const r = await call({ action: 'react', post: id });
    S.busy.delete('l' + id);
    if (r.ok) { LIKES[id] = r.count; if (r.liked) S.mine.add(id); else S.mine.delete(id); }
    else if (!r.demo) { if (had) { S.mine.add(id); LIKES[id] = (LIKES[id] || 0) + 1; } else { S.mine.delete(id); LIKES[id] = Math.max(0, (LIKES[id] || 0) - 1); } fail(r); }
    paintActions(c); syncCounts(id);
  }
  async function share(m) {
    const url = location.href.split('#')[0] + '#/posts/' + pidOf(m);
    if (navigator.share) { try { await navigator.share({ title: document.title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast('Link copied.'); } catch (e) { prompt('Copy this link', url); }
  }

  /* ---------- comments ---------- */
  function paintComments(c) {
    const id = pidOf(c._m), box = c.querySelector('.pv-clist'), more = c.querySelector('.pv-cmore');
    const act = document.activeElement; if (act && act.tagName === 'TEXTAREA' && box.contains(act)) return;   // never wipe somebody who is typing a reply
    const all = S.com[id] || [], tops = all.filter(x => !x.parent), reps = {};
    all.filter(x => x.parent).forEach(x => (reps[x.parent] = reps[x.parent] || []).push(x));
    const expanded = S.all[id] || tops.length <= 2, vis = expanded ? tops : tops.slice(-2);
    more.hidden = expanded; more.textContent = 'View all ' + plural(all.length, 'comment', 'comments');
    box.replaceChildren(...vis.map(cm => comment(c, cm, reps[cm.id] || [])));
    if (!S.loaded && !all.length && (CC[id] || 0) > 0) box.append(el('p', 'pv-muted', 'Loading comments…'));
  }
  const canDel = cm => ADM || (ME && cm.uid === ME.uid);
  function comment(c, cm, reps, top, rbox) {
    const isReply = !!top, u = U(cm.uid), name = u ? u.n : 'Member', row = el('div', 'pv-cm' + (isReply ? ' rp' : '')); row.dataset.id = cm.id;
    const body = el('div', 'pv-cbody'), bub = el('div', 'pv-bub'), meta = el('div', 'pv-cmeta');
    bub.append(who(cm.uid, name, u), textEl(cm.text));
    const tm = el('span', '', ago(cm.date)); tm.title = new Date(cm.date).toLocaleString(); meta.append(tm);
    const rp = el('button', '', 'Reply'); rp.type = 'button'; meta.append(rp);
    if (canDel(cm)) { const d = el('button', 'pv-del', 'Delete'); d.type = 'button'; d.onclick = () => delComment(c, cm, reps.length); meta.append(d); }
    body.append(bub, meta);
    if (!isReply) {
      const host = el('div', 'pv-rbox'); rp.onclick = () => openReply(c, host, cm, cm, false);
      if (reps.length) {
        const open = !!S.rep[cm.id], vr = el('button', 'pv-vr', open ? 'Hide replies' : 'View ' + plural(reps.length, 'reply', 'replies')); vr.type = 'button';
        vr.onclick = () => { S.rep[cm.id] = !open; paintComments(c); }; body.append(vr);
        if (open) { const rl = el('div', 'pv-reps'); reps.forEach(r => rl.append(comment(c, r, [], cm, host))); body.append(rl); }
      }
      body.append(host);
    } else rp.onclick = () => openReply(c, rbox, top, cm, true);
    row.append(avatar(u, name, isReply ? 28 : 36), body);
    return row;
  }
  function openReply(c, host, top, target, isReply) {
    if (host.firstChild && host._for === target.id) { host.replaceChildren(); host._for = ''; return; }
    host.replaceChildren(); host._for = target.id;
    const nm = (U(target.uid) || {}).n || '';
    const f = composer(c, { reply: true, parent: top.id, ph: 'Write a reply…', prefill: isReply && nm ? '@' + nm + ' ' : '', onDone: () => { host.replaceChildren(); host._for = ''; } });
    host.append(f); const ta = f.querySelector('textarea'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }
  function composer(c, o) {
    const f = el('form', 'pv-form' + (o.reply ? ' rp' : '')), w = el('div', 'pv-in'), ta = el('textarea'), btn = el('button', 'pv-send', 'Post');
    f.noValidate = true; ta.rows = 1; ta.maxLength = 300; ta.dir = 'auto'; ta.placeholder = o.ph; ta.setAttribute('aria-label', o.ph); ta.value = o.prefill || '';
    const has = () => { const v = ta.value.trim(); return !!v && v !== (o.prefill || '').trim(); };
    btn.type = 'submit'; btn.disabled = !has();
    const size = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
    ta.oninput = () => { size(); btn.disabled = !has(); };
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!btn.disabled) btn.click(); } };
    w.append(ta, btn); f.append(meAvatar(o.reply ? 28 : 34), w);
    if (o.reply) { const x = el('button', 'pv-cancel', 'Cancel'); x.type = 'button'; x.onclick = o.onDone; f.append(x); }
    f.onsubmit = async e => {
      e.preventDefault();
      const text = clean(ta.value, 300); if (!text || btn.disabled) return;
      const id = pidOf(c._m); let parent = o.parent || '';
      if (!await needActor()) return;
      btn.disabled = true;
      const known = (S.com[id] || []).find(x => x.id === parent); if (known) parent = known.parent || known.id;
      const r = await call({ action: 'comment', post: id, text, parent });
      if (r.ok || r.demo) {
        const a = official() ? 'official' : ME.uid;
        const it = r.item || { id: 'l' + Date.now().toString(36), post: id, parent, uid: a, text, date: new Date().toISOString() };
        (S.com[id] = S.com[id] || []).push(it); CC[id] = S.com[id].length; S.all[id] = true; if (it.parent) S.rep[it.parent] = true;
        ta.value = ''; size(); if (o.onDone) o.onDone();
        paintComments(c); paintActions(c); syncCounts(id);
      } else { btn.disabled = false; fail(r); }
    };
    return f;
  }
  async function delComment(c, cm, nReplies) {
    if (!await ask('Delete this comment?', nReplies ? 'Its ' + plural(nReplies, 'reply', 'replies') + ' will be removed too.' : 'This cannot be undone.')) return;
    const r = await call({ action: 'delcomment', id: cm.id, ...(ADM ? { key: ADK } : {}) });
    if (!r.ok && !r.demo) return fail(r);
    const id = cm.post, gone = new Set(r.removed && r.removed.length ? r.removed : [cm.id].concat((S.com[id] || []).filter(x => x.parent === cm.id).map(x => x.id)));
    S.com[id] = (S.com[id] || []).filter(x => !gone.has(x.id)); CC[id] = S.com[id].length;
    paintComments(c); paintActions(c); syncCounts(id); toast('Comment deleted.');
  }

  /* =============================== page: render, route =============================== */
  const pv = $('#pv'), listBox = $('#pvlist'), sent = $('#pvsent');
  function realign() { const c = S.align && S.cards.get(S.align); if (c) c.scrollIntoView({ block: 'start' }); }
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => pv.addEventListener(ev, () => { S.align = ''; }, { passive: true }));
  function skeleton() { listBox.replaceChildren(el('div', 'pv-sk'), el('div', 'pv-sk')); sent.hidden = true; }
  function empty() {
    const d = el('div', 'pv-empty'), i = new Image(); i.src = 'assets/icons/camera.png'; i.alt = '';
    const b = el('button', 'btn', 'ADD A MEMORY'); b.type = 'button'; b.onclick = openAdd;
    d.append(i, el('b', '', cat === 'ALL' ? 'No photos yet' : 'No photos in ' + cat + ' yet'), el('p', '', 'Be the first to add one.'), b); return d;
  }
  function more(upTo) {
    const L = S.list; for (let i = S.shown; i < Math.min(upTo, L.length); i++) listBox.append(card(L[i]));
    S.shown = Math.min(upTo, L.length); sent.hidden = S.shown >= L.length;
    if (!sent.hidden) { io.unobserve(sent); io.observe(sent); }
  }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting && S.shown < S.list.length) more(S.shown + PAGE); }, { root: pv, rootMargin: '900px 0px' });
  function render(focus, keep) {
    const y = pv.scrollTop, L = feedList(); S.list = L;
    const prevShown = S.shown; listBox.replaceChildren(); S.cards.clear(); S.shown = 0;
    $('#pvcount').textContent = plural(L.length, 'photo', 'photos') + (cat === 'ALL' ? '' : ' in ' + cat);
    $('#vsort').value = sortDir;
    S.done = true;
    if (!L.length) { sent.hidden = true; listBox.append(empty()); return; }
    let n = keep ? Math.max(PAGE, prevShown) : PAGE;
    if (focus) { const i = L.findIndex(m => pidOf(m) === focus); if (i >= n) n = i + 1; }
    more(n);
    const c = focus && S.cards.get(focus);
    if (c) { S.all[focus] = true; paintComments(c); S.align = focus; setTimeout(() => { if (S.align === focus) S.align = ''; }, 2500); c.scrollIntoView({ block: 'start' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1800); }
    else pv.scrollTop = keep ? y : 0;
  }
  const setInert = on => [...document.body.children].forEach(n => { if (n.id === 'pv' || n.id === 'toast' || n.id === 'intro' || n.tagName === 'SCRIPT' || n.tagName === 'DIALOG') return; if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
  function openPV(pid) {
    if (S.open && S.done && S.pid === pid) return;
    S.pid = pid;
    if (!S.open) {
      S.open = true; S.done = false; S.prev = document.activeElement; pv.hidden = false; document.body.classList.add('pvopen'); setInert(true); pv.scrollTop = 0;
      if (!S.loaded || Date.now() - S.fetchedAt > 20000) fetchFeed();
      setTimeout(() => $('#pvback').focus({ preventScroll: true }), 30);
    }
    if (!window.DATA_READY) return skeleton();
    if (pid && cat !== 'ALL' && !feedList().some(m => pidOf(m) === pid) && MEM.some(m => pidOf(m) === pid)) { cat = 'ALL'; $$('.chip').forEach(x => x.classList.toggle('on', x.dataset.cat === 'ALL')); board(); }
    paintMe(); render(pid);
  }
  function closePV() {
    if (!S.open) return; S.open = false; S.done = false; S.align = ''; pv.hidden = true; document.body.classList.remove('pvopen'); setInert(false);
    listBox.replaceChildren(); S.cards.clear(); S.shown = 0;
    const p = S.prev; S.prev = null; if (p && p.focus && document.contains(p)) p.focus({ preventScroll: true });
  }
  function route() { const m = /^#\/posts(?:\/([\w-]+))?$/.exec(location.hash); if (m) openPV(m[1] || ''); else closePV(); }
  function back() { if (history.state && history.state.in) history.back(); else { history.replaceState(null, '', '#memories'); route(); const t = $('#memories'); if (t) t.scrollIntoView(); } }
  function repaintAll() { S.cards.forEach(c => { paintHead(c); paintCaption(c); paintActions(c); paintComments(c); }); if (S.open) $('#vsort').value = sortDir; }

  /* ---------- top bar + admin strip ---------- */
  function paintMe() {
    const chip = $('#pvme'); chip.hidden = !(ME && !official());
    if (!chip.hidden) { const n = el('span', 'nm', ME.name); n.dir = 'auto'; chip.replaceChildren(avatar({ a: ME.avatar }, ME.name, 32), n); }
    $$('.pv-meav').forEach(x => x.replaceWith(meAvatar(parseInt(x.style.getPropertyValue('--s')) || 34)));
    $('#pvadm').hidden = !ADM; $$('#pvadm [data-as]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.as === AS)));
  }
  $('#pvme').onclick = () => openProfile();
  $('#pvadd').onclick = openAdd;
  $('#pvback').onclick = back;
  $$('#pvadm [data-as]').forEach(b => b.onclick = () => {
    if (AS === b.dataset.as) return; AS = b.dataset.as; try { sessionStorage.setItem('aud_as', AS); } catch (e) {}
    S.mine = new Set(); paintMe(); repaintAll(); fetchFeed();
    toast(AS === 'official' ? 'Posting as the official page.' : ME ? 'Posting as ' + ME.name + '.' : 'Posting as a visitor. You will pick a username on your first love or comment.');
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && S.open && !document.querySelector('dialog[open]')) { e.preventDefault(); back(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.open && Date.now() - S.fetchedAt > 60000) fetchFeed(); });
  addEventListener('hashchange', route); addEventListener('popstate', route);

  /* the "Add your memory" dialog posts as the official page, as this device's profile, or as a typed guest name */
  function prepAdd() {
    const as = $('#amas'), pn = $('#pn');
    if (official()) { pn.value = OFF.n; pn.readOnly = true; as.hidden = false; as.textContent = 'Posting as the official page'; }
    else if (ME) { pn.value = ME.name; pn.readOnly = true; as.hidden = false; as.textContent = 'Posting as ' + ME.name; }
    else { pn.readOnly = false; as.hidden = true; }
  }

  /* ---------- public hooks used by app.js ---------- */
  window.PV = {
    route, idp, me, err, prepAdd,
    refresh: keep => { if (S.open && window.DATA_READY) render('', keep); },
    ready() { if (ADM) this.admin(); route(); },
    admin() { paintMe(); repaintAll(); }
  };
  route();
  if (window.DATA_READY) window.PV.ready();
})();
