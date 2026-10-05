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
    bad: 'Something is wrong with this profile. Try again.',
    options: 'Add at least two options.',
    post: 'That post is no longer available.',
    option: 'That option does not exist.',
    kind: 'Unknown post type.'
  };
  const err = c => ERR[c] || (c ? 'Something went wrong. Try again.' : 'Could not reach the server. Check your connection.');

  const SVG = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    img: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>',
    smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M8 14s1.5 2.2 4 2.2 4-2.2 4-2.2M9 9.5h.01M15 9.5h.01"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
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
  const imgAdmin = () => DR(G('adminBadge'), 1) || CONFIG.logo;          // small badge next to admin names
  const imgOfficial = () => DR(G('officialAvatar'), 1) || CONFIG.logo;   // profile picture of the official page
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
    align: '',
    pmine: {},        // poll post id -> option I voted for
    nf: [], now: '', nfPrev: '',   // notifications, server time, my previous 'seen' marker
    sig: '', noteIds: '', again: false, stale: false, staleN: 0, mut: 0
  };
  const U = uid => uid === 'official' ? OFF : S.users[uid] || (ME && uid === ME.uid ? { n: ME.name, a: ME.avatar || '', b: ME.badges || '' } : null);
  /* admin posts (text / occasion / poll) become feed items; they never appear on the memory board */
  const noteView = n => ({ note: 1, pid: n.id, id: n.id, kind: n.kind, title: n.title, body: n.body, ex: n.extra || {}, cat: n.category || '', date: n.date, uid: 'official' });
  function feedList() {
    const ph = list().filter(m => !m.ev), ns = NOTES.filter(n => cat === 'ALL' || String(n.category || '').toUpperCase() === cat).map(noteView);
    if (!ns.length) return ph;
    const all = ph.concat(ns), d = sortDir === 'old' ? 1 : -1;
    return all.sort((a, b) => (String(a.date) < String(b.date) ? -1 : String(a.date) > String(b.date) ? 1 : 0) * d);
  }
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
      const oi = imgOfficial(); if (ok(oi)) { const i = new Image(); i.src = oi; i.alt = ''; a.append(i); } else a.textContent = '★';
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
      const bi = imgAdmin(); if (ok(bi)) { const i = new Image(); i.src = bi; i.alt = ''; s.append(i); } else s.innerHTML = SVG.shield;
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
    closeProfile(true); paintMe(); repaintAll(); fetchFeed();
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
  const banner = (t, retry) => {
    const n = $('#pvnote'); n.hidden = !t; n.replaceChildren(); if (!t) return;
    n.append(el('span', '', t));
    if (retry) { const b = el('button', 'pv-retry', 'Retry'); b.type = 'button'; b.onclick = () => fetchFeed(); n.append(b); }
  };
  const typing = () => { const a = document.activeElement; return !!(a && a.tagName === 'TEXTAREA' && pv.contains(a)); };
  async function fetchFeed() {
    if (!BACKEND.enabled) { S.loaded = true; repaintAll(); return; }
    if (S.loading) { S.again = true; return; }          // an identity change while loading: run once more afterwards
    S.loading = true; let changed = false; const epoch = S.mut;
    try {
      const uid = official() ? 'official' : ME ? ME.uid : '';
      const txt = await (await fetch(BACKEND.apiUrl + '?scope=feed&uid=' + encodeURIComponent(uid) + '&t=' + Date.now())).text(), j = JSON.parse(txt);
      if (!j.ok) throw 0;
      if ((S.mut !== epoch || S.busy.size) && S.staleN < 3) { S.stale = true; S.staleN++; }   // a love / vote / comment happened while this was loading: it may not include it
      else {
        S.staleN = 0;
        S.nf = j.nf || []; S.now = j.now || S.now; S.loaded = true; S.fetchedAt = Date.now(); banner('');
        const sig = h32(txt.replace(/"now":"[^"]*"/, ''));     // nothing new since last time -> skip all repainting
        if (sig !== S.sig) {
          S.sig = sig; changed = true;
          S.users = j.users || {}; S.top = new Set(j.top || []); S.mine = new Set(j.mine || []); S.pmine = j.pmine || {};
          LIKES = j.likes || {}; CC = j.cc || {}; NOTES = j.notes || []; PC = j.pc || {};
          S.com = {}; (j.comments || []).forEach(c => (S.com[c.post] = S.com[c.post] || []).push(c));
          Object.keys(S.com).forEach(k => S.com[k].sort((a, b) => String(a.date) < String(b.date) ? -1 : 1));
          if (ME && S.users[ME.uid]) { const u = S.users[ME.uid]; ME.name = u.n; ME.avatar = u.a; ME.badges = u.b; saveMe(); }
        }
      }
    } catch (e) { banner('Could not load comments and loves.', true); }
    S.loading = false; paintMe();
    if (changed) {
      const ids = NOTES.map(n => n.id).join();
      if (S.open && S.done && ids !== S.noteIds && !typing()) render('', true); else repaintAll();   // somebody published a new admin post
      $$('.slot[data-pid]').forEach(x => $$('.cc', x).forEach(y => paintCounts(y, x.dataset.pid)));
    }
    if (S.nfOpen) paintNf();
    if (S.stale) { S.stale = false; S.again = false; setTimeout(fetchFeed, 900); }        // ask again shortly, once the write has landed
    else if (S.again) { S.again = false; fetchFeed(); }
  }
  async function call(b) {
    S.mut++; const r = await api({ ...b, ...idp() }); S.mut++;       // epoch: lets fetchFeed drop an answer that may be older than this write
    if (!r.ok && !r.demo) {
      if (r.error === 'noauth' && !official() && ME) { ME = null; saveMe(); paintMe(); toast(ERR.noauth); r.handled = true; }
      else if ((r.error === 'key' || r.error === 'unset') && official()) { toast(err(r.error)); r.handled = true; }
    }
    return r;
  }
  const fail = r => { if (!r.handled) toast(err(r.error)); };

  /* =============================== post cards =============================== */
  const KIND = { text: 'Announcement', event: 'New occasion', poll: 'Poll' };
  const THEMES = ['wine', 'gold', 'sky', 'mint'];
  /* stickers = the site's own 3D icons (assets/icons/NAME.png) */
  const STICKERS = ['party_popper', 'confetti_ball', 'balloon', 'trophy', 'military_medal', 'star', 'sparkles', 'red_heart', 'heart_pulse', 'anatomical_heart', 'graduation_cap', 'grad_cap_flat', 'books', 'book_open', 'hot_beverage', 'pizza', 'sleeping_face', 'alarm_clock', 'stethoscope', 'microscope', 'syringe', 'pill', 'thermometer', 'scalpel', 'coat', 'lab_coat', 'health_worker', 'man_health_worker', 'hospital', 'ambulance', 'brain', 'tooth', 'bone', 'dna', 'family_group', 'camera'];
  const STK_RE = /^[a-z0-9_]{1,40}$/;

  function card(m) {
    const id = pidOf(m), c = el('article', 'pv-post' + (m.note ? ' is-note' : '')); c.dataset.pid = id; c._m = m;
    const hd = el('div', 'pv-head'), md = el('div', m.note ? 'pv-nb' : 'pv-media ld'), ac = el('div', 'pv-act'), st = el('div', 'pv-stat'), cp = el('div', 'pv-cap');
    const com = el('div', 'pv-com'), more = el('button', 'pv-cmore'), cl = el('div', 'pv-clist');
    more.type = 'button'; more.onclick = () => { S.all[id] = true; paintComments(c, true); };
    com.append(more, cl, composer(c, { ph: 'Add a comment…' }));
    c.append(hd, md, ac, st, cp, com);
    if (m.note) buildNote(c, md, m); else buildMedia(c, md, m);
    S.cards.set(id, c);
    paintHead(c); paintActions(c); paintCaption(c); paintComments(c, true);
    return c;
  }
  function catTag(md, m) {
    if (!m.cat) return; md.classList.add('has-tag');
    const t = el('button', 'pv-tag', m.cat); t.type = 'button'; t.title = 'Show only ' + m.cat; t.onclick = e => { e.stopPropagation(); setCat(m.cat.toUpperCase()); }; md.append(t);
  }
  /* click handler: double tap = love, single tap = optional action (enlarge a photo) */
  function tapLove(md, c, single) {
    let last = 0, timer = 0;
    md.onclick = e => {
      if (e.target.closest('.pv-tag,.pv-opt')) return;
      const t = Date.now();
      if (t - last < 320) { last = 0; clearTimeout(timer); burst(md); love(c, true); } else { last = t; if (single) timer = setTimeout(single, 320); }
    };
  }
  function buildMedia(c, md, m) {
    const u = m.mid || m.url || m.thumb, id = pidOf(m);
    if (safe(u)) {
      const i = new Image(); i.alt = m.cp || m.title || 'Memory photo'; i.decoding = 'async'; i.loading = 'lazy';
      i.onload = () => { md.classList.remove('ld'); realign(); }; i.onerror = () => md.classList.remove('ld'); i.src = u; md.append(i);
    } else { md.classList.remove('ld'); const s = el('span', 'pv-em', m.e || '📷'), h = parseInt(h32(id), 36) % 360; s.style.background = 'linear-gradient(135deg,hsl(' + h + ' 70% 84%),hsl(' + ((h + 40) % 360) + ' 65% 72%))'; md.append(s); }
    catTag(md, m);
    md.tabIndex = 0; md.setAttribute('role', 'button'); md.setAttribute('aria-label', 'Enlarge photo');   // tap = enlarge · double tap = love
    md.onkeydown = e => { if (e.key === 'Enter') openLB([m], 0); };
    tapLove(md, c, () => openLB([m], 0));
  }
  function burst(md) { const b = el('span', 'pv-burst'); b.innerHTML = SVG.heart; b.firstChild.setAttribute('fill', 'currentColor'); md.append(b); setTimeout(() => b.remove(), 800); }

  /* ---------- admin posts: text / occasion / poll ---------- */
  function evStatus(d) {
    const n = new Date(), a = new Date(n.getFullYear(), n.getMonth(), n.getDate()), b = new Date(d.getFullYear(), d.getMonth(), d.getDate()), days = Math.round((b - a) / 864e5);
    return days === 0 ? ['Today', 'now'] : days === 1 ? ['Tomorrow', 'soon'] : days > 1 ? ['In ' + days + ' days', 'soon'] : ['Ended', 'past'];
  }
  function buildNote(c, md, m) {
    const ex = m.ex || {}; catTag(md, m);
    if (m.kind === 'text') {
      md.classList.add('pv-tx', 'th-' + (THEMES.indexOf(ex.theme) > -1 ? ex.theme : 'wine'));
      if (m.title) { const h = el('h3', 'pv-nt', m.title); h.dir = 'auto'; md.append(h); }
      const p = el('p', 'pv-nbody', m.body); p.dir = 'auto'; md.append(p);
      tapLove(md, c);
    } else if (m.kind === 'event') {
      md.classList.add('pv-ev');
      const d = ex.when ? new Date(ex.when) : null, valid = d && !isNaN(d), box = el('div', 'pv-evw');
      if (valid) { const k = el('div', 'pv-ed'); k.append(el('span', 'pv-edm', d.toLocaleDateString(undefined, { month: 'short' })), el('b', '', String(d.getDate())), el('span', 'pv-edy', String(d.getFullYear()))); box.append(k); }
      const info = el('div', 'pv-ei'), top = el('div', 'pv-et'), h = el('h3', 'pv-nt', m.title); h.dir = 'auto';
      if (ex.emoji) top.append(el('span', 'pv-eemo', ex.emoji));
      top.append(h); info.append(top);
      const meta = el('div', 'pv-emeta');
      if (valid) meta.append(el('span', '', '🕒 ' + d.toLocaleString(undefined, /T\d/.test(ex.when) ? { weekday: 'long', hour: 'numeric', minute: '2-digit' } : { weekday: 'long' })));
      if (ex.place) { const pl = el('span', '', '📍 ' + ex.place); pl.dir = 'auto'; meta.append(pl); }
      if (meta.childNodes.length) info.append(meta);
      if (m.body) { const p = el('p', 'pv-nbody', m.body); p.dir = 'auto'; info.append(p); }
      if (valid) { const s = evStatus(d); info.append(el('span', 'pv-st ' + s[1], s[0])); }
      box.append(info); md.append(box); tapLove(md, c);
    } else {
      md.classList.add('pv-poll');
      const h = el('h3', 'pv-nt', m.title); h.dir = 'auto'; md.append(h);
      if (m.body) { const p = el('p', 'pv-nbody', m.body); p.dir = 'auto'; md.append(p); }
      md.append(el('div', 'pv-opts'), el('div', 'pv-pmeta')); paintPoll(c);
    }
  }
  function paintPoll(c) {
    const m = c._m, id = pidOf(m), opts = (m.ex && m.ex.options) || [], counts = PC[id] || [], mineOpt = S.pmine[id];
    const total = counts.reduce((a, b) => a + (b || 0), 0), show = mineOpt != null || official(), box = c.querySelector('.pv-opts'), meta = c.querySelector('.pv-pmeta');
    box.replaceChildren(...opts.map((o, i) => {
      const n = counts[i] || 0, pct = total ? Math.round(n * 100 / total) : 0, b = el('button', 'pv-opt' + (mineOpt === i ? ' on' : '') + (official() ? ' ro' : '')), f = el('i', 'pv-of'), l = el('span', 'pv-ol', o);
      b.type = 'button'; l.dir = 'auto'; f.style.width = (show ? pct : 0) + '%';
      if (official()) b.setAttribute('aria-disabled', 'true');
      b.append(f, l);
      if (show) b.append(el('em', 'pv-op', pct + '%'));
      b.onclick = () => votePoll(c, i);
      return b;
    }));
    meta.textContent = plural(total, 'vote', 'votes') + (mineOpt != null ? '  ·  You voted' : official() ? '  ·  Switch to My profile to vote' : '  ·  Tap an option to vote');
  }
  async function votePoll(c, i) {
    const id = pidOf(c._m), len = ((c._m.ex || {}).options || []).length;
    if (official()) return toast('The official page can only see results. Switch to My profile to vote.');
    if (S.busy.has('p' + id) || S.pmine[id] === i) return;
    if (!await needActor()) return;
    S.busy.add('p' + id);
    const prev = S.pmine[id], counts = (PC[id] || new Array(len).fill(0)).slice();
    if (prev != null) counts[prev] = Math.max(0, (counts[prev] || 0) - 1);
    counts[i] = (counts[i] || 0) + 1; PC[id] = counts; S.pmine[id] = i; paintPoll(c);
    const r = await call({ action: 'pollvote', post: id, option: i });
    S.busy.delete('p' + id);
    if (r.ok) { PC[id] = r.counts; S.pmine[id] = r.option; }
    else if (!r.demo) { const back = counts.slice(); back[i] = Math.max(0, back[i] - 1); if (prev != null) back[prev] = (back[prev] || 0) + 1; PC[id] = back; if (prev == null) delete S.pmine[id]; else S.pmine[id] = prev; fail(r); }
    paintPoll(c);
  }

  function paintHead(c) {
    const m = c._m, a = author(m), hd = c.querySelector('.pv-head'); hd.replaceChildren();
    const t = el('div', 'pv-hd'), when = el('div', 'pv-when');
    if (m.note) when.append(el('span', 'pv-kind ' + m.kind, KIND[m.kind] || 'Post'));
    when.append(document.createTextNode(fmt(m.date)));
    t.append(who(a.uid, a.name, a.u), when);
    hd.append(avatar(a.u, a.name, 42), t);
    if (m.id) {                                                  // only items stored in the backend can be deleted from here
      const x = el('button', 'pv-x'); x.type = 'button'; x.setAttribute('aria-label', 'Delete post'); x.title = 'Delete post'; x.innerHTML = SVG.trash;
      x.onclick = () => del(m.note ? 'note' : 'photo', m.id); hd.append(x);
    }
  }
  const RTL = /^[^\p{L}]*[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;   // does the caption itself start with an Arabic/Hebrew letter?
  function paintCaption(c) {
    const m = c._m, a = author(m), t = m.cp != null ? m.cp : m.title, box = c.querySelector('.pv-cap');
    box.replaceChildren();
    if (m.note || !t) { box.hidden = true; return; }
    box.hidden = false; box.dir = RTL.test(t) ? 'rtl' : 'ltr';   // direction follows the caption, not the author's name
    const b = el('b', ''), i = document.createElement('bdi'); i.textContent = a.name; b.append(i);
    box.append(b, document.createTextNode(' ' + t));
  }
  function paintActions(c) {
    const m = c._m, id = pidOf(m), ac = c.querySelector('.pv-act'), st = c.querySelector('.pv-stat'), liked = S.mine.has(id), noun = m.note ? 'post' : 'photo';
    const l = LIKES[id] || 0, n = (S.com[id] ? S.com[id].length : CC[id]) || 0;
    ac.replaceChildren();
    const b1 = el('button', 'pv-ab'), b2 = el('button', 'pv-ab'), b3 = el('button', 'pv-ab pv-share');
    [b1, b2, b3].forEach(b => b.type = 'button');
    b1.setAttribute('aria-pressed', String(liked)); b1.setAttribute('aria-label', liked ? 'Remove your love' : 'Love this ' + noun); b1.innerHTML = SVG.heart; b1.append(el('span', '', liked ? 'Loved' : 'Love')); b1.onclick = () => love(c);
    b2.setAttribute('aria-label', 'Write a comment'); b2.innerHTML = SVG.chat; b2.append(el('span', '', 'Comment')); b2.onclick = () => { S.all[id] = true; paintComments(c, true); c.querySelector('.pv-com > .pv-form textarea').focus(); };
    b3.setAttribute('aria-label', 'Share this ' + noun); b3.innerHTML = SVG.send; b3.append(el('span', '', 'Share')); b3.onclick = () => share(m);
    ac.append(b1, b2, b3);
    st.hidden = !l && !n; st.replaceChildren();
    if (l) st.append(el('b', '', plural(l, 'love', 'loves')));
    if (l && n) st.append(document.createTextNode('  '));
    if (n) st.append(el('span', '', plural(n, 'comment', 'comments')));
  }
  /* one love toggle for photos, admin posts (key = post id) and comments (key = c_<comment id>) */
  async function toggleLove(key, repaint, onlyAdd) {
    if (S.busy.has('l' + key) || (onlyAdd && S.mine.has(key))) return;
    if (!await needActor()) return;
    const had = S.mine.has(key); S.busy.add('l' + key);
    const set = (on, d) => { if (on) S.mine.add(key); else S.mine.delete(key); LIKES[key] = Math.max(0, (LIKES[key] || 0) + d); };
    set(!had, had ? -1 : 1); repaint();
    const r = await call({ action: 'react', post: key });
    S.busy.delete('l' + key);
    if (r.ok) { LIKES[key] = r.count; if (r.liked) S.mine.add(key); else S.mine.delete(key); }
    else if (!r.demo) { set(had, had ? 1 : -1); fail(r); }
    repaint();
  }
  const love = (c, onlyAdd) => { const id = pidOf(c._m); return toggleLove(id, () => { paintActions(c); syncCounts(id); }, onlyAdd); };
  function paintCL(b, key) {
    const on = S.mine.has(key), n = LIKES[key] || 0;
    b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Remove your love from this comment' : 'Love this comment');
    b.innerHTML = SVG.heart; if (n) b.append(el('span', '', String(n)));
  }
  async function share(m) {
    const url = location.href.split('#')[0] + '#/posts/' + pidOf(m);
    if (navigator.share) { try { await navigator.share({ title: document.title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast('Link copied.'); } catch (e) { prompt('Copy this link', url); }
  }

  /* ---------- comments ---------- */
  /* force = our own action (always repaint). Background refreshes never wipe a reply box somebody is filling in. */
  function paintComments(c, force) {
    const id = pidOf(c._m), box = c.querySelector('.pv-clist'), more = c.querySelector('.pv-cmore');
    if (!force && box.querySelector('.pv-form')) return;
    const all = S.com[id] || [], tops = all.filter(x => !x.parent), reps = {};
    all.filter(x => x.parent).forEach(x => (reps[x.parent] = reps[x.parent] || []).push(x));
    const expanded = S.all[id] || tops.length <= 2, vis = expanded ? tops : tops.slice(-2);
    more.hidden = expanded; more.textContent = 'View all ' + plural(all.length, 'comment', 'comments');
    box.replaceChildren(...vis.map(cm => comment(c, cm, reps[cm.id] || [])));
    if (!S.loaded && !all.length && (CC[id] || 0) > 0) box.append(el('p', 'pv-muted', 'Loading comments…'));
  }
  const canDel = cm => ADM || (ME && cm.uid === ME.uid);
  /* a comment's picture or sticker. media = 's:NAME' (site sticker) · 'i:DRIVE_FILE_ID' (uploaded photo) · 'u:DATA_URL' (local demo only) */
  function mediaEl(cm, name) {
    const m = String(cm.media || ''); if (m.length < 3) return null;
    const k = m[0], v = m.slice(2);
    if (k === 's') {
      if (!STK_RE.test(v)) return null;
      const i = new Image(); i.className = 'pv-cst'; i.alt = 'Sticker'; i.loading = 'lazy'; i.decoding = 'async'; i.src = 'assets/icons/' + v + '.png';
      i.onerror = () => i.replaceWith(el('span', 'pv-muted', 'Sticker')); return i;
    }
    if (k !== 'i' && k !== 'u') return null;
    const src = k === 'u' ? v : FID(v, 700), big = k === 'u' ? v : FID(v, 1600);
    if (k === 'i' && !/^[\w-]{2,80}$/.test(v)) return null;
    if (k === 'u' && v.indexOf('data:image/') !== 0) return null;
    const b = el('button', 'pv-cph'), i = new Image(); b.type = 'button'; b.setAttribute('aria-label', 'Open photo');
    i.alt = 'Photo from ' + name; i.loading = 'lazy'; i.decoding = 'async'; i.src = src; b.append(i);
    b.onclick = () => openLB([{ url: big, thumb: src, title: 'Photo from ' + name, cap: '', cat: '', date: cm.date }], 0);
    return b;
  }
  function comment(c, cm, reps, top, rbox) {
    const isReply = !!top, u = U(cm.uid), name = u ? u.n : 'Member', row = el('div', 'pv-cm' + (isReply ? ' rp' : '')); row.dataset.id = cm.id;
    const body = el('div', 'pv-cbody'), bub = el('div', 'pv-bub'), meta = el('div', 'pv-cmeta'), md = mediaEl(cm, name);
    bub.append(who(cm.uid, name, u)); if (cm.text) bub.append(textEl(cm.text)); if (md) bub.append(md);
    if (md && !cm.text) bub.classList.add('media-only');
    const tm = el('span', '', ago(cm.date)); tm.title = new Date(cm.date).toLocaleString(); meta.append(tm);
    const rp = el('button', '', 'Reply'); rp.type = 'button'; meta.append(rp);
    if (canDel(cm)) { const d = el('button', 'pv-del', 'Delete'); d.type = 'button'; d.onclick = () => delComment(c, cm, reps.length); meta.append(d); }
    body.append(bub, meta);
    if (!isReply) {
      const host = el('div', 'pv-rbox'); rp.onclick = () => openReply(c, host, cm, cm, false);
      if (reps.length) {
        const open = !!S.rep[cm.id], vr = el('button', 'pv-vr', open ? 'Hide replies' : 'View ' + plural(reps.length, 'reply', 'replies')); vr.type = 'button';
        vr.onclick = () => { S.rep[cm.id] = !open; paintComments(c, true); }; body.append(vr);
        if (open) { const rl = el('div', 'pv-reps'); reps.forEach(r => rl.append(comment(c, r, [], cm, host))); body.append(rl); }
      }
      body.append(host);
    } else rp.onclick = () => openReply(c, rbox, top, cm, true);
    const key = 'c_' + cm.id, lb = el('button', 'pv-cl'); lb.type = 'button'; paintCL(lb, key); lb.onclick = () => toggleLove(key, () => paintCL(lb, key));
    row.append(avatar(u, name, isReply ? 28 : 36), body, lb);
    return row;
  }
  function openReply(c, host, top, target, isReply) {
    if (host.firstChild && host._for === target.id) { host.replaceChildren(); host._for = ''; return; }
    host.replaceChildren(); host._for = target.id;
    const nm = (U(target.uid) || {}).n || '';
    const f = composer(c, { reply: true, parent: top.id, ph: 'Write a reply…', prefill: isReply && nm ? '@' + nm + ' ' : '', onDone: () => { host.replaceChildren(); host._for = ''; } });
    host.append(f); const ta = f.querySelector('textarea'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  /* ---------- the comment box: text + optional sticker or photo ---------- */
  function shrinkTo(f, max, q) {
    return new Promise((res, rej) => {
      const i = new Image(), u = URL.createObjectURL(f);
      i.onload = () => {
        const k = Math.min(1, max / Math.max(i.width, i.height)), cv = document.createElement('canvas'); cv.width = Math.round(i.width * k); cv.height = Math.round(i.height * k);
        const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(i, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(u); res(cv.toDataURL('image/jpeg', q));
      };
      i.onerror = () => { URL.revokeObjectURL(u); rej(); }; i.src = u;
    });
  }
  function composer(c, o) {
    const f = el('form', 'pv-form' + (o.reply ? ' rp' : '')), iw = el('div', 'pv-iw'), pre = el('div', 'pv-pre'), w = el('div', 'pv-in'), ta = el('textarea'), btn = el('button', 'pv-send', 'Post');
    const bImg = el('button', 'pv-ic'), bStk = el('button', 'pv-ic'), file = el('input'); let media = null, panel = null;
    f.noValidate = true; ta.rows = 1; ta.maxLength = 300; ta.dir = 'auto'; ta.placeholder = o.reply ? 'Reply…' : 'Comment…'; ta.setAttribute('aria-label', o.ph); ta.value = o.prefill || '';
    bImg.type = bStk.type = 'button'; bImg.innerHTML = SVG.img; bStk.innerHTML = SVG.smile; bImg.title = 'Add a photo'; bStk.title = 'Add a sticker'; bImg.setAttribute('aria-label', 'Add a photo'); bStk.setAttribute('aria-label', 'Add a sticker');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true; btn.type = 'submit'; pre.hidden = true;
    const has = () => { const v = ta.value.trim(); return (!!v && v !== (o.prefill || '').trim()) || !!media; };
    const upd = () => { btn.disabled = !has(); };
    const size = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
    function setMedia(x) {
      media = x; pre.replaceChildren(); pre.hidden = !x;
      if (x) {
        const t = el('div', 'pv-pi' + (x.sticker ? ' stk' : '')), i = new Image(), rm = el('button', '', '✕'); i.alt = '';
        i.src = x.sticker ? 'assets/icons/' + x.sticker + '.png' : x.image; rm.type = 'button'; rm.setAttribute('aria-label', 'Remove'); rm.onclick = () => { setMedia(null); ta.focus(); };
        t.append(i, rm); pre.append(t);
      }
      upd();
    }
    function closePanel() { if (panel) { panel.remove(); panel = null; bStk.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); } }
    function outside(e) { if (panel && !panel.contains(e.target) && !bStk.contains(e.target)) closePanel(); }
    bStk.onclick = () => {
      if (panel) return closePanel();
      panel = el('div', 'pv-stk'); panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Stickers');
      STICKERS.forEach(n => { const b = el('button', ''), i = new Image(); b.type = 'button'; b.title = n.replace(/_/g, ' '); b.setAttribute('aria-label', n.replace(/_/g, ' ')); i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; i.src = 'assets/icons/' + n + '.png'; b.append(i); b.onclick = () => { setMedia({ sticker: n }); closePanel(); ta.focus(); }; panel.append(b); });
      iw.append(panel); bStk.setAttribute('aria-expanded', 'true'); document.addEventListener('pointerdown', outside, true);
    };
    bImg.onclick = () => file.click();
    file.onchange = async () => {
      const x = file.files[0]; file.value = ''; if (!x || !/^image\//.test(x.type)) return;
      try { setMedia({ image: await shrinkTo(x, 1000, .8) }); } catch (e) { toast(ERR.image); }
    };
    btn.disabled = true; upd();
    ta.oninput = () => { size(); upd(); };
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!btn.disabled) btn.click(); } if (e.key === 'Escape' && panel) { e.stopPropagation(); closePanel(); } };
    w.append(ta, bImg, bStk, btn); iw.append(pre, w, file); f.append(meAvatar(o.reply ? 28 : 34), iw);
    if (o.reply) { const x = el('button', 'pv-cancel', 'Cancel'); x.type = 'button'; x.onclick = o.onDone; f.append(x); }
    f.onsubmit = async e => {
      e.preventDefault();
      const text = clean(ta.value, 300); if ((!text && !media) || btn.disabled) return;
      const id = pidOf(c._m); let parent = o.parent || '';
      if (!await needActor()) return;
      btn.disabled = true; closePanel();
      const known = (S.com[id] || []).find(x => x.id === parent); if (known) parent = known.parent || known.id;
      const r = await call({ action: 'comment', post: id, text, parent, ...(media ? (media.sticker ? { sticker: media.sticker } : { image: media.image }) : {}) });
      if (r.ok || r.demo) {
        const a = official() ? 'official' : ME.uid, md = media ? (media.sticker ? 's:' + media.sticker : 'u:' + media.image) : '';
        const it = r.item || { id: 'l' + Date.now().toString(36), post: id, parent, uid: a, text, media: md, date: new Date().toISOString() };
        (S.com[id] = S.com[id] || []).push(it); CC[id] = S.com[id].length; S.all[id] = true; if (it.parent) S.rep[it.parent] = true;
        ta.value = ''; size(); setMedia(null); if (o.onDone) o.onDone();
        paintComments(c, true); paintActions(c); syncCounts(id);
      } else { upd(); fail(r); }
    };
    return f;
  }
  async function delComment(c, cm, nReplies) {
    if (!await ask('Delete this comment?', nReplies ? 'Its ' + plural(nReplies, 'reply', 'replies') + ' will be removed too.' : 'This cannot be undone.')) return;
    const r = await call({ action: 'delcomment', id: cm.id, ...(ADM ? { key: ADK } : {}) });
    if (!r.ok && !r.demo) return fail(r);
    const id = cm.post, gone = new Set(r.removed && r.removed.length ? r.removed : [cm.id].concat((S.com[id] || []).filter(x => x.parent === cm.id).map(x => x.id)));
    S.com[id] = (S.com[id] || []).filter(x => !gone.has(x.id)); CC[id] = S.com[id].length;
    paintComments(c, true); paintActions(c); syncCounts(id); toast('Comment deleted.');
  }

  /* =============================== page: render, route =============================== */
  const pv = $('#pv'), listBox = $('#pvlist'), sent = $('#pvsent');
  function realign() { const c = S.align && S.cards.get(S.align); if (c) c.scrollIntoView({ block: 'start' }); }
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => pv.addEventListener(ev, () => { S.align = ''; }, { passive: true }));
  function skeleton() { listBox.replaceChildren(el('div', 'pv-sk'), el('div', 'pv-sk')); sent.hidden = true; }
  function empty() {
    const d = el('div', 'pv-empty'), i = new Image(); i.src = 'assets/icons/camera.png'; i.alt = '';
    const b = el('button', 'btn', 'ADD A MEMORY'); b.type = 'button'; b.onclick = openAdd;
    d.append(i, el('b', '', cat === 'ALL' ? 'No posts yet' : 'Nothing in ' + cat + ' yet'), el('p', '', 'Be the first to add a photo.'), b); return d;
  }
  function more(upTo) {
    const L = S.list; for (let i = S.shown; i < Math.min(upTo, L.length); i++) listBox.append(card(L[i]));
    S.shown = Math.min(upTo, L.length); sent.hidden = S.shown >= L.length;
    if (!sent.hidden) { io.unobserve(sent); io.observe(sent); }
  }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting && S.shown < S.list.length) more(S.shown + PAGE); }, { root: pv, rootMargin: '900px 0px' });
  function render(focus, keep) {
    const y = pv.scrollTop, L = feedList(); S.list = L; S.noteIds = NOTES.map(n => n.id).join();
    const prevShown = S.shown; listBox.replaceChildren(); S.cards.clear(); S.shown = 0;
    $('#pvcount').textContent = plural(L.length, 'post', 'posts') + (cat === 'ALL' ? '' : ' in ' + cat);
    $('#vsort').value = sortDir;
    S.done = true;
    if (!L.length) { sent.hidden = true; listBox.append(empty()); return; }
    let n = keep ? Math.max(PAGE, prevShown) : PAGE;
    if (focus) { const i = L.findIndex(m => pidOf(m) === focus); if (i >= n) n = i + 1; }
    more(n);
    const c = focus && S.cards.get(focus);
    if (c) { S.all[focus] = true; paintComments(c, true); S.align = focus; setTimeout(() => { if (S.align === focus) S.align = ''; }, 2500); c.scrollIntoView({ block: 'start' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1800); }
    else pv.scrollTop = keep ? y : 0;
  }
  const setInert = on => [...document.body.children].forEach(n => { if (n.id === 'pv' || n.id === 'toast' || n.id === 'intro' || n.tagName === 'SCRIPT' || n.tagName === 'DIALOG') return; if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
  const resetCat = () => { cat = 'ALL'; $$('.chip').forEach(x => x.classList.toggle('on', x.dataset.cat === 'ALL')); board(); };
  const exists = pid => MEM.some(m => pidOf(m) === pid) || NOTES.some(n => n.id === pid);
  function openPV(pid) {
    if (S.open && S.done && S.pid === pid) return;
    S.pid = pid;
    if (!S.open) {
      S.open = true; S.done = false; S.prev = document.activeElement; pv.hidden = false; document.body.classList.add('pvopen'); setInert(true); pv.scrollTop = 0;
      if (!S.loaded || Date.now() - S.fetchedAt > 20000) fetchFeed();
      setTimeout(() => $('#pvback').focus({ preventScroll: true }), 30);
    }
    if (!window.DATA_READY) return skeleton();
    if (pid && cat !== 'ALL' && !feedList().some(m => pidOf(m) === pid) && exists(pid)) resetCat();
    paintMe(); render(pid);
  }
  function closePV() {
    if (!S.open) return; closeNf(); S.open = false; S.done = false; S.align = ''; pv.hidden = true; document.body.classList.remove('pvopen'); setInert(false);
    listBox.replaceChildren(); S.cards.clear(); S.shown = 0;
    const p = S.prev; S.prev = null; if (p && p.focus && document.contains(p)) p.focus({ preventScroll: true });
  }
  function route() { const m = /^#\/posts(?:\/([\w-]+))?$/.exec(location.hash); if (m) openPV(m[1] || ''); else closePV(); }
  function back() { if (history.state && history.state.in) history.back(); else { history.replaceState(null, '', '#memories'); route(); const t = $('#memories'); if (t) t.scrollIntoView(); } }
  function repaintAll() {
    S.cards.forEach(c => { paintHead(c); paintCaption(c); paintActions(c); paintComments(c); if (c._m.kind === 'poll') paintPoll(c); });
    if (S.open) $('#vsort').value = sortDir;
  }
  /* jump to a post (and a comment inside it), e.g. from a notification */
  function focusPost(pid, cid) {
    if (!exists(pid)) return toast(ERR.post);
    if (!feedList().some(m => pidOf(m) === pid)) resetCat();
    S.pid = pid; try { history.replaceState(history.state, '', '#/posts/' + pid); } catch (e) {}
    render(pid);
    const c = S.cards.get(pid), cm = cid && (S.com[pid] || []).find(x => x.id === cid);
    if (c && cm) {
      if (cm.parent) S.rep[cm.parent] = true; paintComments(c, true);
      const row = c.querySelector('[data-id="' + cid + '"]');
      if (row) { S.align = ''; row.scrollIntoView({ block: 'center' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1800); }
    }
  }

  /* =============================== notifications (the bell) ===============================
     Simple and per identity: what happened to MY posts and comments. "Seen" is remembered on this device,
     so opening the bell clears the number — like any social site. */
  const seenKey = () => 'aud_seen_' + (official() ? 'official' : ME ? ME.uid : '');
  const hasActor = () => official() || !!ME;
  const unread = () => { if (!hasActor()) return 0; const s = LS.get(seenKey()) || ''; return S.nf.filter(n => n.d > s).length; };
  function paintBell() {
    const n = unread(), b = $('#pvbdg');
    b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
    $('#pvbell').setAttribute('aria-label', n ? 'Notifications, ' + n + ' new' : 'Notifications');
  }
  function nfWhat(n) {
    const thing = NOTES.some(x => x.id === n.p) ? 'post' : 'photo';
    return n.t === 'l' ? 'loved your ' + thing : n.t === 'cl' ? 'loved your comment' : n.t === 'c' ? 'commented on your ' + thing : n.t === 'r' ? 'replied to your comment' : 'mentioned you in a comment';
  }
  function paintNf() {
    const box = $('#pvnfl'); box.replaceChildren();
    if (!hasActor()) {
      const p = el('div', 'pv-nfe'), b = el('button', 'btn', 'CHOOSE A USERNAME'); b.type = 'button'; b.onclick = async () => { if (await openProfile()) fetchFeed(); };
      p.append(el('b', '', 'Get notified'), el('p', '', 'Pick a username to see when someone loves or comments on your posts.'), b); box.append(p); return;
    }
    if (!S.nf.length) { const p = el('div', 'pv-nfe'); p.append(el('b', '', 'You are all caught up'), el('p', '', 'Loves, comments and replies will show up here.')); box.append(p); return; }
    S.nf.forEach(n => {
      const u = n.by === 'official' ? OFF : U(n.by), name = u ? u.n : 'Someone', b = el('button', 'pv-ni' + (n.d > S.nfPrev ? ' new' : '')), t = el('div', 'pv-nt2'), line = el('div', 'pv-nl');
      b.type = 'button'; const bd = document.createElement('bdi'); bd.textContent = name; line.append(el('b', '', ''), document.createTextNode(' ' + nfWhat(n))); line.firstChild.append(bd);
      t.append(line);
      const q = n.x || (n.k === 's' ? 'Sent a sticker' : n.k ? 'Sent a photo' : ''); if (q && (n.t === 'c' || n.t === 'r' || n.t === 'm')) { const e = el('div', 'pv-nq', q); e.dir = 'auto'; t.append(e); }
      t.append(el('div', 'pv-na', ago(n.d)));
      b.append(avatar(u, name, 38), t); b.onclick = () => { closeNf(); focusPost(n.p, n.c); }; box.append(b);
    });
  }
  function openNf() {
    S.nfOpen = true; S.nfPrev = LS.get(seenKey()) || ''; $('#pvnf').hidden = false; $('#pvbell').setAttribute('aria-expanded', 'true'); paintNf();
    if (hasActor()) LS.set(seenKey(), S.now || new Date().toISOString());     // opening it = seen
    paintBell(); if (Date.now() - S.fetchedAt > 15000) fetchFeed();
  }
  function closeNf() { S.nfOpen = false; $('#pvnf').hidden = true; $('#pvbell').setAttribute('aria-expanded', 'false'); }
  $('#pvbell').onclick = () => S.nfOpen ? closeNf() : openNf();
  pv.addEventListener('pointerdown', e => { if (S.nfOpen && !e.target.closest('#pvnf,#pvbell')) closeNf(); });

  /* =============================== admin: publish a text post / occasion / poll =============================== */
  const NP = { kind: 'text', theme: 'wine', busy: false }, np = $('#np');
  const npErr = t => { const e = $('#npe'); e.hidden = !t; e.textContent = t || ''; };
  function paintTheme() { $$('#npth [data-t]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === NP.theme))); }
  function npKind(k) {
    NP.kind = k; npErr('');
    $$('#np .np-k [data-k]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    $$('#np [data-for]').forEach(d => d.hidden = d.dataset.for !== k);
    $('#npt').textContent = { text: 'New text post', event: 'New occasion', poll: 'New poll' }[k];
  }
  function npCount() { const n = $$('#npo .np-orow').length; $('#npadd').hidden = n >= 6; $$('#npo .np-orow button').forEach(b => b.hidden = n <= 2); }
  function npOpt() {
    const r = el('div', 'np-orow'), i = el('input'), x = el('button', '', '✕'); i.maxLength = 80; i.dir = 'auto'; i.placeholder = 'Option'; i.setAttribute('aria-label', 'Option');
    x.type = 'button'; x.setAttribute('aria-label', 'Remove option'); x.onclick = () => { if ($$('#npo .np-orow').length > 2) { r.remove(); npCount(); } };
    r.append(i, x); $('#npo').append(r); npCount();
  }
  function openNP(kind) {
    ['npt1', 'npb1', 'npt2', 'npwh', 'nppl', 'npb2', 'npt3', 'npem'].forEach(id => $('#' + id).value = '');
    $('#npo').replaceChildren(); npOpt(); npOpt(); NP.theme = 'wine'; paintTheme();
    const sel = $('#npcat'); sel.replaceChildren(new Option('None (only under ALL)', '')); [...$('#pc').options].forEach(o => sel.append(new Option(o.value, o.value)));
    npKind(kind || 'text'); np.showModal();
  }
  $$('#np .np-k [data-k]').forEach(b => b.onclick = () => npKind(b.dataset.k));
  $$('#npth [data-t]').forEach(b => b.onclick = () => { NP.theme = b.dataset.t; paintTheme(); });
  $$('#pvadm .pv-mk [data-k]').forEach(b => b.onclick = () => openNP(b.dataset.k));
  $('#npadd').onclick = () => { npOpt(); const l = $$('#npo input'); l[l.length - 1].focus(); };
  $('#npx').onclick = $('#npcx').onclick = () => np.close();
  $('#npf').onsubmit = async e => {
    e.preventDefault(); if (NP.busy) return;
    const k = NP.kind; let title = '', body = '', extra = {};
    if (k === 'text') { title = clean($('#npt1').value, 100); body = clean($('#npb1').value, 1500); extra.theme = NP.theme; if (!body) return npErr('Write the text of your post.'); }
    else if (k === 'event') {
      title = clean($('#npt2').value, 100); body = clean($('#npb2').value, 600); extra = { emoji: clean($('#npem').value, 8), when: $('#npwh').value, place: clean($('#nppl').value, 80) };
      if (!title) return npErr('Give the occasion a name.'); if (!extra.when) return npErr('Choose the date and time.');
    } else {
      title = clean($('#npt3').value, 100); extra.options = $$('#npo input').map(i => clean(i.value, 80)).filter(Boolean);
      if (!title) return npErr('Write the question.'); if (extra.options.length < 2) return npErr(ERR.options);
    }
    NP.busy = true; $('#npok').disabled = true; $('#npsp').hidden = false; npErr('');
    const r = await api({ action: 'note', key: ADK, kind: k, title, body, extra, category: $('#npcat').value });
    NP.busy = false; $('#npok').disabled = false; $('#npsp').hidden = true;
    if (!r.ok) return npErr(r.demo ? 'Connect the Backend link to publish.' : err(r.error));
    NOTES.unshift(r.item); np.close(); toast('Published.');
    sortDir = 'new'; $('#psort').value = $('#vsort').value = 'new'; setCat('ALL');           // show it at the top
  };

  /* ---------- top bar + admin strip ---------- */
  function paintMe() {
    const chip = $('#pvme'); chip.hidden = !(ME && !official());
    if (!chip.hidden) { const n = el('span', 'nm', ME.name); n.dir = 'auto'; chip.replaceChildren(avatar({ a: ME.avatar }, ME.name, 32), n); }
    $$('.pv-meav').forEach(x => x.replaceWith(meAvatar(parseInt(x.style.getPropertyValue('--s')) || 34)));
    $('#pvadm').hidden = !ADM; $$('#pvadm [data-as]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.as === AS)));
    paintBell();
  }
  $('#pvme').onclick = () => openProfile();
  $('#pvadd').onclick = openAdd;
  $('#pvback').onclick = back;
  $$('#pvadm [data-as]').forEach(b => b.onclick = () => {
    if (AS === b.dataset.as) return; AS = b.dataset.as; try { sessionStorage.setItem('aud_as', AS); } catch (e) {}
    S.mine = new Set(); S.pmine = {}; S.nf = []; S.sig = ''; closeNf(); paintMe(); repaintAll(); fetchFeed();
    toast(AS === 'official' ? 'Posting as the official page.' : ME ? 'Posting as ' + ME.name + '.' : 'Posting as a visitor. You will pick a username on your first love or comment.');
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    if (S.nfOpen) { e.preventDefault(); closeNf(); $('#pvbell').focus(); } else if (S.open) { e.preventDefault(); back(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.open && Date.now() - S.fetchedAt > 30000) fetchFeed(); });
  setInterval(() => { if (S.open && !document.hidden && BACKEND.enabled) fetchFeed(); }, 60000);   // keeps the bell and comments fresh while the page is open
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
    admin() { S.sig = ''; paintMe(); repaintAll(); if (S.open) fetchFeed(); }      // the admin key was accepted: reload loves + the bell as the official page
  };
  route();
  if (window.DATA_READY) window.PV.ready();
})();
