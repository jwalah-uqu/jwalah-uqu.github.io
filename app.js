/* منصة نادي الجوالة — جامعة أم القرى
   تعمل بوضعين:
   - مباشر: إذا كان firebase-config.js فيه apiKey ← Firebase Auth + Firestore (والحماية في firestore.rules)
   - تجريبي: بدون إعدادات ← البيانات في متصفح الزائر فقط (للمعاينة) */
{
// ===================== الإعدادات =====================
const COMMITTEES = [
  { id: 'hr',      name: 'لجنة الموارد البشرية' },
  { id: 'quality', name: 'لجنة جودة الحياة' },
  { id: 'comp',    name: 'لجنة المسابقات والأنشطة' },
  { id: 'pr',      name: 'لجنة العلاقات العامة' },
  { id: 'media',   name: 'قسم الإعلام والتصميم' },
];
// الهيكل: رئيس واحد + ٣ نواب، ولكل لجنة قائدان ونائبان (للطلاب، ومثلهم للطالبات)
const LIMITS = { president: 1, vp: 3, leader: 2, deputy: 2 };
const COLLEGES = ['كلية الحاسبات', 'كلية الهندسة والعمارة الإسلامية', 'كلية العلوم التطبيقية', 'كلية الطب', 'كلية طب الأسنان', 'كلية الصيدلة', 'كلية العلوم الطبية التطبيقية', 'كلية التمريض', 'كلية الصحة العامة والمعلوماتية الصحية', 'كلية إدارة الأعمال', 'كلية الشريعة والدراسات الإسلامية', 'كلية الدعوة وأصول الدين', 'كلية اللغة العربية وآدابها', 'كلية التربية', 'كلية العلوم الاجتماعية'];
const ROLES = { president: 'رئيس النادي', vp: 'نائب الرئيس', leader: 'قائد لجنة', deputy: 'نائب قائد لجنة', member: 'عضو' };
const SIGNUP_ROLES = ['member', 'deputy', 'leader', 'vp'];
const LEAD = ['president', 'vp', 'leader', 'deputy'];
const ADMIN = ['president', 'vp'];
const GENDERS = { m: 'طالب', f: 'طالبة' };
const ROLES_F = { president: 'رئيسة النادي', vp: 'نائبة الرئيس', leader: 'قائدة لجنة', deputy: 'نائبة قائدة لجنة', member: 'عضوة' };
const roleName = u => (u.gender === 'f' ? ROLES_F : ROLES)[u.role] || '';
const GROUPS = { m: 'الطلاب', f: 'الطالبات' };
const ROLE_ORDER = { president: 0, vp: 1, leader: 2, deputy: 3, member: 4 };

// ===================== أدوات =====================
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ar = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const cname = id => COMMITTEES.find(c => c.id === id)?.name || '';
const initial = n => esc((n || '؟').trim().charAt(0));
const fmtDate = t => { try { return new Date(t).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' }); } catch { return ''; } };
const isLead = u => !!u && u.approved && LEAD.includes(u.role);
const isAdmin = u => !!u && u.approved && ADMIN.includes(u.role);

function xUrl(v) {
  v = (v || '').trim(); if (!v) return '';
  const h = v.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
  return /^[A-Za-z0-9_]{1,15}$/.test(h) ? 'https://x.com/' + h : null;
}
function liUrl(v) {
  v = (v || '').trim(); if (!v) return '';
  try { const u = new URL(/^https?:/i.test(v) ? v : 'https://' + v); return /(^|\.)linkedin\.com$/i.test(u.hostname) ? 'https://' + u.hostname + u.pathname : null; } catch { return null; }
}
function postUrl(v) {
  try { const u = new URL(v.trim()); return /^(www\.)?(x|twitter)\.com$/i.test(u.hostname) ? 'https://x.com' + u.pathname : null; } catch { return null; }
}
let toastT;
function toast(msg, bad) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.toggle('bad', !!bad); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200);
}
function errMsg(e) {
  const c = e?.code || e?.message || String(e);
  const map = {
    'auth/email-already-in-use': 'البريد مسجّل مسبقًا، جرّب تسجيل الدخول.',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.', 'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحة.', 'auth/user-not-found': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/weak-password': 'كلمة المرور ضعيفة، استخدم ٦ أحرف على الأقل.', 'auth/invalid-email': 'صيغة البريد غير صحيحة.',
    'auth/too-many-requests': 'محاولات كثيرة، انتظر قليلًا ثم حاول.', 'permission-denied': 'ما عندك صلاحية لهذا الإجراء.',
  };
  return map[c] || (typeof e === 'string' ? e : 'صار خطأ، حاول مرة ثانية.');
}
async function busy(btn, fn) { btn.disabled = true; try { return await fn(); } finally { btn.disabled = false; } }

// ===================== طبقة البيانات: تجريبي =====================
function DemoBackend() {
  const KEY = 'jwalah-demo-v4', SKEY = 'jwalah-demo-session';
  const H123 = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
  const now = Date.now(), day = 864e5;
  const P = (uid, name, role, committee, extra = {}) => ({ uid, name, role, committee, email: uid + '@demo.sa', pw: H123, approved: true, public: role !== 'member', gender: 'm', x: '', linkedin: '', position: '', createdAt: now, ...extra });
  const seed = () => ({
    users: [
      P('president', 'عبدالله الحربي', 'president', '', { x: 'https://x.com/jwalah_uqu' }),
      P('vp1', 'فيصل الغامدي', 'vp', ''), P('vp2', 'محمد الزهراني', 'vp', ''),
      P('l1', 'سعد العتيبي', 'leader', 'comp'), P('d1', 'خالد المالكي', 'deputy', 'comp'),
      P('l2', 'عمر الشهري', 'leader', 'quality'), P('d2', 'يوسف القرشي', 'deputy', 'quality'),
      P('l3', 'بندر السلمي', 'leader', 'pr'), P('l4', 'نواف الثبيتي', 'leader', 'hr'),
      P('l5', 'تركي الحارثي', 'leader', 'media'),
      P('m1', 'أحمد الجهني', 'member', 'comp'), P('m2', 'ريان اللحياني', 'member', 'quality'),
      P('m3', 'مازن الشريف', 'member', 'quality'), P('m4', 'سلطان المطيري', 'member', 'media'),
      P('p1', 'إياد البقمي', 'leader', 'pr', { approved: false, public: false }),
      P('fl1', 'ريم العمري', 'leader', 'comp', { gender: 'f' }), P('fd1', 'لمى الحربي', 'deputy', 'comp', { gender: 'f' }),
      P('fl2', 'سارة الغامدي', 'leader', 'quality', { gender: 'f' }), P('fm1', 'نورة الزهراني', 'member', 'quality', { gender: 'f' }),
      P('fm2', 'جود الشهري', 'member', 'quality', { gender: 'f' }), P('fl3', 'هيا القحطاني', 'leader', 'media', { gender: 'f' }),
      P('fm3', 'رهف المالكي', 'member', 'media', { gender: 'f' }),
    ],
    ann: [
      { id: 'a1', committee: 'general', text: 'فتح باب التسجيل في معسكرات الخدمة العامة، سجّل من حسابك وتابع لجنتك.', authorUid: 'president', authorName: 'عبدالله الحربي', createdAt: now - day },
      { id: 'a2', committee: 'general', text: 'اجتماع عام لأعضاء النادي يوم الأحد بعد العصر في مقر النادي.', authorUid: 'vp1', authorName: 'فيصل الغامدي', createdAt: now - 3 * day },
      { id: 'a3', committee: 'quality', text: 'توزيع المناطق على الأعضاء غدًا، الحضور ٨ صباحًا.', authorUid: 'l2', authorName: 'عمر الشهري', createdAt: now - 2 * day },
      { id: 'a4', committee: 'quality', text: 'اجتماع الطالبات في اللجنة يوم الثلاثاء الساعة ١٠ صباحًا.', authorUid: 'fl2', authorName: 'سارة الغامدي', createdAt: now - day },
    ],
    points: [
      { id: 'p1', committee: 'media', amount: 2, reason: 'تغطية معسكر الخدمة العامة', by: 'عبدالله الحربي', createdAt: now - day },
      { id: 'p2', committee: 'quality', amount: 3, reason: 'تنظيم لقاء الطالبات', by: 'عبدالله الحربي', createdAt: now - day },
    ],
    events: [
      { id: 'e1', title: 'لقاء تعريفي بنادي الجوالة', date: new Date(now + 3 * day).toISOString().slice(0, 10), time: '٧ مساءً', place: 'مقر النادي', audience: 'm', committee: '', desc: 'تعرّف على النادي ولجانه وبرنامج الفصل.', attendees: [], createdAt: now },
      { id: 'e2', title: 'ورشة الإسعافات الأولية', date: new Date(now + 6 * day).toISOString().slice(0, 10), time: '١٠ صباحًا', place: 'قاعة الأنشطة', audience: 'f', committee: 'quality', desc: '', attendees: [], createdAt: now },
    ],
    tweets: [
      { id: 't1', url: 'https://x.com/jwalah_uqu', text: 'الجوالة.. شرف الخدمة وروح العطاء 🤍\n#الكشفية_درب_تعلم_لاينتهي', createdAt: now - day },
      { id: 't2', url: 'https://x.com/jwalah_uqu', text: 'شكرًا لجوالة جامعة أم القرى على مشاركتهم في معسكرات الخدمة العامة حج ١٤٤٧هـ.', createdAt: now - 4 * day },
    ],
  });
  let mem; try { mem = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!mem || !mem.users) mem = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {} };
  let sess = null; try { sess = sessionStorage.getItem(SKEY); } catch {}
  let cb = () => {};
  const strip = u => { const { pw, ...r } = u; return { ...r }; };
  const me = () => mem.users.find(u => u.uid === sess);
  const emit = () => cb(me() ? strip(me()) : null);
  const setSess = v => { sess = v; try { v ? sessionStorage.setItem(SKEY, v) : sessionStorage.removeItem(SKEY); } catch {} };
  async function hash(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch { return 'p:' + s; } }
  const need = ok => { if (!ok) throw { code: 'permission-denied' }; };
  return {
    mode: 'demo',
    onAuth(f) { cb = f; emit(); },
    async signUp(d) {
      if (mem.users.some(u => u.email === d.email.toLowerCase())) throw { code: 'auth/email-already-in-use' };
      const uid = 'u' + Date.now();
      mem.users.push({ uid, email: d.email.toLowerCase(), pw: await hash(d.password), ...d.profile }); save(); setSess(uid); emit();
    },
    async signIn(email, pw) {
      const u = mem.users.find(x => x.email === email.toLowerCase());
      if (!u || u.pw !== await hash(pw)) throw { code: 'auth/invalid-credential' };
      setSess(u.uid); emit();
    },
    async signOut() { setSess(null); emit(); },
    async resetPassword() { throw 'استعادة كلمة المرور تعمل في الوضع المباشر فقط.'; },
    async publicLeaders() { return mem.users.filter(u => u.public && u.approved).map(strip); },
    async users(committee, gender) {
      const m = me(); need(m && m.approved);
      return mem.users.filter(u => committee ? u.committee === committee : true).map(strip);
    },
    async updateUser(uid, data) {
      const m = me(), u = mem.users.find(x => x.uid === uid);
      need(u && (isAdmin(m) || (m.uid === uid && Object.keys(data).every(k => ['name', 'x', 'linkedin', 'position', 'college'].includes(k)))));
      Object.assign(u, data); save(); if (uid === sess) emit();
    },
    async deleteUser(uid) { need(isAdmin(me())); mem.users = mem.users.filter(u => u.uid !== uid); save(); },
    async announcements(committee) { return mem.ann.filter(a => a.committee === committee).sort((a, b) => b.createdAt - a.createdAt); },
    async addAnnouncement(a) { need(isLead(me())); mem.ann.push({ id: 'a' + Date.now(), createdAt: Date.now(), ...a }); save(); },
    async deleteAnnouncement(id) { need(isLead(me())); mem.ann = mem.ann.filter(a => a.id !== id); save(); },
    async points() { return mem.points || []; },
    async addPoints(p) { need(isAdmin(me())); (mem.points ||= []).push({ id: 'p' + Date.now(), createdAt: Date.now(), ...p }); save(); },
    async deletePoints(id) { need(isAdmin(me())); mem.points = (mem.points || []).filter(p => p.id !== id); save(); },
    async events() { return mem.events || []; },
    async addEvent(e) { need(isLead(me())); (mem.events ||= []).push({ id: 'e' + Date.now(), createdAt: Date.now(), attendees: [], ...e }); save(); },
    async deleteEvent(id) { need(isLead(me())); mem.events = mem.events.filter(e => e.id !== id); save(); },
    async attend(id, on) { const m = me(); need(m && m.approved); const e = mem.events.find(x => x.id === id); e.attendees = (e.attendees || []).filter(u => u !== m.uid); if (on) e.attendees.push(m.uid); save(); },
    async tweets() { return [...mem.tweets].sort((a, b) => b.createdAt - a.createdAt); },
    async addTweet(t) { need(isLead(me())); mem.tweets.push({ id: 't' + Date.now(), createdAt: Date.now(), ...t }); save(); },
    async deleteTweet(id) { need(isLead(me())); mem.tweets = mem.tweets.filter(t => t.id !== id); save(); },
  };
}

// ===================== طبقة البيانات: Firebase =====================
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); }); }
async function FirebaseBackend(cfg) {
  const V = 'https://www.gstatic.com/firebasejs/10.12.2/';
  await loadScript(V + 'firebase-app-compat.js');
  await Promise.all([loadScript(V + 'firebase-auth-compat.js'), loadScript(V + 'firebase-firestore-compat.js')]);
  firebase.initializeApp(cfg);
  const auth = firebase.auth(), fs = firebase.firestore();
  const users = fs.collection('users'), annC = fs.collection('announcements'), twC = fs.collection('tweets');
  const docs = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
  let cb = () => {};
  async function emit() {
    const u = auth.currentUser; if (!u) return cb(null);
    const s = await users.doc(u.uid).get();
    cb(s.exists ? { uid: u.uid, email: u.email, ...s.data() } : null);
  }
  return {
    mode: 'live',
    onAuth(f) { cb = f; auth.onAuthStateChanged(() => emit().catch(() => cb(null))); },
    async signUp(d) {
      const c = await auth.createUserWithEmailAndPassword(d.email, d.password);
      await users.doc(c.user.uid).set(d.profile); await emit();
    },
    async signIn(e, p) { await auth.signInWithEmailAndPassword(e, p); },
    async signOut() { await auth.signOut(); },
    async resetPassword(e) { await auth.sendPasswordResetEmail(e); },
    async publicLeaders() { return docs(await users.where('public', '==', true).get()).map(u => ({ uid: u.id, ...u })); },
    async users(committee) { const q = committee ? users.where('committee', '==', committee) : users; return docs(await q.get()).map(u => ({ uid: u.id, ...u })); },
    async updateUser(uid, data) { await users.doc(uid).update(data); if (uid === auth.currentUser?.uid) await emit(); },
    async deleteUser(uid) { await users.doc(uid).delete(); },
    async announcements(committee) { return docs(await annC.where('committee', '==', committee).get()).sort((a, b) => b.createdAt - a.createdAt); },
    async addAnnouncement(a) { await annC.add({ ...a, createdAt: Date.now() }); },
    async deleteAnnouncement(id) { await annC.doc(id).delete(); },
    async points() { return docs(await fs.collection('points').get()); },
    async addPoints(p) { await fs.collection('points').add({ ...p, createdAt: Date.now() }); },
    async deletePoints(id) { await fs.collection('points').doc(id).delete(); },
    async events() { return docs(await fs.collection('events').get()); },
    async addEvent(e) { await fs.collection('events').add({ ...e, attendees: [], createdAt: Date.now() }); },
    async deleteEvent(id) { await fs.collection('events').doc(id).delete(); },
    async attend(id, on) { const F = firebase.firestore.FieldValue; await fs.collection('events').doc(id).update({ attendees: on ? F.arrayUnion(auth.currentUser.uid) : F.arrayRemove(auth.currentUser.uid) }); },
    async tweets() { return docs(await twC.get()).sort((a, b) => b.createdAt - a.createdAt); },
    async addTweet(t) { await twC.add({ ...t, createdAt: Date.now() }); },
    async deleteTweet(id) { await twC.doc(id).delete(); },
  };
}

// ===================== الحالة والتوجيه =====================
let api, me = null;
const PAGES = ['home', 'about', 'leaders', 'committees', 'events', 'join', 'profile', 'admin'];
let current = 'home';

function route() {
  if (!api) return;
  let p = location.hash.slice(1) || 'home';
  if (!PAGES.includes(p)) p = 'home';
  if (p === 'join' && me) p = 'profile';
  if (p === 'profile' && !me) p = 'join';
  if (p === 'admin' && !isAdmin(me)) p = me ? 'home' : 'join';
  const changed = p !== current; current = p;
  document.querySelectorAll('.page').forEach(s => s.hidden = s.dataset.page !== p);
  document.querySelectorAll('#links a').forEach(a => a.classList.toggle('on', a.dataset.p === p));
  if (changed) window.scrollTo(0, 0);
  (RENDER[p] || (() => {}))();
}

function paintNav() {
  $('#navJoin').hidden = !!me; $('#navMe').hidden = !me; $('#navAdmin').hidden = !isAdmin(me);
  if (me) $('#navName').textContent = (me.name || 'حسابي').split(' ')[0];
  $('#heroCta').hidden = !!me;
  $('#twAdd').hidden = !isLead(me); $('#annAdd').hidden = !isLead(me);
}

// ===================== الرئيسية =====================
let twTimer, twIdx = 0, twCount = 0;
async function renderTweets() {
  const list = await api.tweets().catch(() => []);
  twCount = list.length;
  const can = isLead(me);
  $('#twTrack').innerHTML = list.length ? list.map(t => `
    <article class="tw">
      <div class="who"><img src="assets/img/club-logo.jpg" alt=""><div>نادي الجوالة <span>@jwalah_uqu</span></div></div>
      <p>${esc(t.text)}</p>
      <div class="act">
        <a class="open" href="${esc(postUrl(t.url) || 'https://x.com/jwalah_uqu')}" target="_blank" rel="noopener"><svg class="ic" fill="currentColor"><use href="#xl"/></svg>افتح في X</a>
        <span style="font-size:13px;opacity:.75">${fmtDate(t.createdAt)}</span>
        ${can ? `<button class="btn sm del" data-del-tw="${esc(t.id)}">حذف</button>` : ''}
      </div>
    </article>`).join('') : '<p class="empty" style="flex:1">لا توجد تغريدات بعد.</p>';
  $('#twCtl').hidden = list.length < 2;
  $('#twDots').innerHTML = list.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  twIdx = 0; clearInterval(twTimer);
  if (list.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) twTimer = setInterval(() => twGo(twIdx + 1), 6000);
}
function twGo(i) {
  if (!twCount) return; twIdx = (i + twCount) % twCount;
  const el = $('#twTrack').children[twIdx]; if (el) $('#twTrack').scrollTo({ left: el.offsetLeft - $('#twTrack').offsetLeft, behavior: 'smooth' });
  [...$('#twDots').children].forEach((d, k) => d.classList.toggle('on', k === twIdx));
}
function annItem(a, canDel) {
  return `<li><p>${esc(a.text)}</p><div class="meta"><span>${esc(a.authorName)} · ${fmtDate(a.createdAt)}</span>${canDel ? `<button class="btn sm del" data-del-ann="${esc(a.id)}">حذف</button>` : ''}</div></li>`;
}
const canDelAnn = a => isAdmin(me) || (me && a.authorUid === me.uid);
async function renderHomeAnn() {
  const list = await api.announcements('general').catch(() => []);
  $('#annHome').innerHTML = list.length ? list.map(a => annItem(a, canDelAnn(a))).join('') : '<li class="empty">لا توجد إعلانات حاليًا.</li>';
}

// ===================== تبويب الطلاب / الطالبات =====================
const gState = { leaders: null, committees: null, events: null };
function genderTabs(page) {
  const own = me?.approved && !isLead(me) ? (me.gender || 'm') : null;
  if (own) gState[page] = own;
  if (!gState[page]) gState[page] = me?.gender || 'm';
  const g = gState[page];
  return `<div class="tabs gtabs" data-page="${page}" ${own ? 'hidden' : ''} style="max-width:420px;margin:0 auto 22px">
    <button type="button" data-g="m" aria-selected="${g === 'm'}">الطلاب</button><button type="button" data-g="f" aria-selected="${g === 'f'}">الطالبات</button></div>`;
}

// ===================== القادة =====================
function personCard(u) {
  const x = xUrl(u.x), li = liUrl(u.linkedin);
  const pos = u.position || (roleName(u) + (u.committee ? ' — ' + cname(u.committee) : ''));
  return `<div class="card person"><div class="av">${initial(u.name)}</div><h3>${esc(u.name)}</h3><div class="pos">${esc(pos)}</div>
    ${u.college ? `<div class="pos" style="font-size:13px">${esc(u.college)}</div>` : ''}
    ${x || li ? `<div class="socials">${x ? `<a href="${esc(x)}" target="_blank" rel="noopener" aria-label="X"><svg class="ic"><use href="#xl" fill="currentColor"/></svg></a>` : ''}${li ? `<a href="${esc(li)}" target="_blank" rel="noopener" aria-label="LinkedIn"><svg class="ic"><use href="#li" fill="currentColor"/></svg></a>` : ''}</div>` : ''}</div>`;
}
const seat = (n, max) => `<span class="seat">${ar(n)} / ${ar(max)}</span>`;
async function renderLeaders() {
  const box = $('#leadersBox'); box.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  const all = (await api.publicLeaders().catch(() => [])).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const pres = all.filter(u => ADMIN.includes(u.role));
  let html = `<h3 class="group-t">رئاسة النادي <span class="muted" style="font-size:14px;font-weight:500">رئيس و${ar(LIMITS.vp)} نواب</span></h3><div class="people">${pres.map(personCard).join('') || '<p class="empty">لم تُعتمد الرئاسة بعد.</p>'}</div>`;
  html += genderTabs('leaders');
  const g = gState.leaders;
  for (const c of COMMITTEES) {
    const ms = all.filter(u => u.committee === c.id && (u.gender || 'm') === g && ['leader', 'deputy'].includes(u.role));
    html += `<h3 class="group-t">${esc(c.name)} ${seat(ms.length, LIMITS.leader + LIMITS.deputy)}</h3><div class="people">${ms.map(personCard).join('') || `<p class="empty">لم يُعتمد قادة ${GROUPS[g]} بعد.</p>`}</div>`;
  }
  box.innerHTML = html;
}

// ===================== اللجان والنقاط =====================
let openCom = null, comG = 'm';
const memberWord = n => n === 1 ? 'عضو' : n === 2 ? 'عضوان' : n >= 3 && n <= 10 ? 'أعضاء' : 'عضو';
const pointWord = n => Math.abs(n) >= 3 && Math.abs(n) <= 10 ? 'نقاط' : 'نقطة';
async function renderCommittees() {
  const box = $('#comBox');
  box.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  const pts = await api.points().catch(() => []);
  const total = id => pts.filter(p => p.committee === id).reduce((s, p) => s + (+p.amount || 0), 0);
  let members = null;
  if (me?.approved) { try { members = await api.users(); } catch {} }
  const inCom = id => (members || []).filter(u => u.committee === id && u.approved);
  const ranked = COMMITTEES.map(c => ({ ...c, pts: total(c.id), n: members ? inCom(c.id).length : null })).sort((a, b) => b.pts - a.pts);
  const top = ranked[0]?.pts > 0 ? ranked[0].id : null;
  let html = `<div class="ccards">${ranked.map((c, i) => `
    <button type="button" class="card ccard ${c.id === top ? 'top' : ''} ${c.id === openCom ? 'open' : ''}" data-open="${c.id}" aria-expanded="${c.id === openCom}">
      ${c.id === top ? '<span class="first">الأولى</span>' : `<span class="rank">${ar(i + 1)}</span>`}
      <span class="cic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 14.2c2.4-.2 4.3 1.3 5 4.3"/></svg></span>
      <h3>${esc(c.name)}</h3>
      <div class="cnum">${c.n === null ? '' : `<span><b>${ar(c.n)}</b> ${memberWord(c.n)}</span>`}<span class="p"><b>${ar(c.pts)}</b> ${pointWord(c.pts)}</span></div>
    </button>`).join('')}</div>`;

  if (!me) { box.innerHTML = html + '<div class="card pad section" style="text-align:center"><p>تفاصيل اللجان وأعضاؤها وإعلاناتها لأعضاء النادي.</p><a class="btn" href="#join">سجّل دخولك</a></div>'; return; }
  if (!me.approved) { box.innerHTML = html + '<p class="empty section">طلبك بانتظار اعتماد رئيس النادي، وبعدها تقدر تفتح تفاصيل اللجان.</p>'; return; }
  if (!openCom) { box.innerHTML = html + '<p class="empty section">اضغط على أي لجنة عشان تشوف أعضاءها وإعلاناتها.</p>'; return; }

  const c = COMMITTEES.find(x => x.id === openCom);
  const all = inCom(c.id).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const byG = g => all.filter(u => (u.gender || 'm') === g);
  const list = byG(comG);
  const canPost = isAdmin(me) || (isLead(me) && me.committee === c.id);
  const log = pts.filter(p => p.committee === c.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  let anns = [];
  try { anns = await api.announcements(c.id); } catch {}
  html += `<article class="card com section" id="comDetail">
    <div class="com-h"><h3>${esc(c.name)}</h3><span class="count">${ar(total(c.id))} ${pointWord(total(c.id))} · ${ar(all.length)} ${memberWord(all.length)}</span></div>
    <div class="com-b">
      <div>
        <div class="tabs gsw" role="tablist">
          <button type="button" data-cg="m" aria-selected="${comG === 'm'}">الطلاب (${ar(byG('m').length)})</button>
          <button type="button" data-cg="f" aria-selected="${comG === 'f'}">الطالبات (${ar(byG('f').length)})</button>
        </div>
        <ul class="names">${list.map(u => `<li><span>${esc(u.name)}</span><span class="badge ${LEAD.includes(u.role) ? 'lead' : ''}">${esc(roleName(u))}</span></li>`).join('') || `<li class="muted">لا يوجد ${GROUPS[comG]} في هذه اللجنة بعد</li>`}</ul>
        ${log.length ? `<p class="sub-t" style="margin-top:16px">آخر النقاط</p><ul class="names">${log.map(p => `<li><span>${esc(p.reason)}</span><span class="badge ${p.amount < 0 ? 'wait' : 'lead'}">${p.amount > 0 ? '+' : ''}${ar(p.amount)}</span></li>`).join('')}</ul>` : ''}
      </div>
      <div><p class="sub-t">إعلانات اللجنة</p><ul class="ann">${anns.map(a => annItem(a, canDelAnn(a))).join('') || '<li class="empty">لا توجد إعلانات.</li>'}</ul>
      ${canPost ? `<details class="add"><summary>إعلان جديد للجنة</summary><form data-com="${esc(c.id)}"><textarea name="text" required maxlength="600" aria-label="نص الإعلان"></textarea><button class="btn">نشر</button></form></details>` : ''}</div>
    </div></article>`;
  box.innerHTML = html;
}

// ===================== الفعاليات =====================
async function renderEvents() {
  const box = $('#evBox'); box.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  $('#evAdd').hidden = !isLead(me);
  const list = await api.events().catch(() => []);
  const today = new Date().toISOString().slice(0, 10);
  const up = list.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)), past = list.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const card = e => {
    const d = new Date(e.date + 'T00:00'), going = (e.attendees || []).includes(me?.uid), n = (e.attendees || []).length;
    const aud = e.audience === 'm' ? 'للطلاب' : e.audience === 'f' ? 'للطالبات' : 'للجميع';
    const canGo = me?.approved && (e.audience === 'all' || e.audience === (me.gender || 'm')) && e.date >= today;
    return `<article class="card ev"><div class="ev-d"><b>${ar(d.getDate())}</b><span>${d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long' })}</span></div>
      <div class="ev-b"><h3>${esc(e.title)}</h3><div class="ev-m">${e.time ? `<span>🕒 ${esc(e.time)}</span>` : ''}${e.place ? `<span>📍 ${esc(e.place)}</span>` : ''}<span class="badge">${aud}</span>${e.committee ? `<span class="badge">${esc(cname(e.committee))}</span>` : ''}</div>
      ${e.desc ? `<p>${esc(e.desc)}</p>` : ''}
      <div class="ev-a"><span class="muted" style="font-size:14px">${ar(n)} مسجّل</span>
      ${canGo ? `<button class="btn sm ${going ? 'ghost' : 'gold'}" data-go="${esc(e.id)}" data-on="${going ? 0 : 1}">${going ? 'إلغاء التسجيل' : 'سأحضر'}</button>` : ''}
      ${isLead(me) ? `<button class="btn sm del" data-del-ev="${esc(e.id)}">حذف</button>` : ''}</div></div></article>`;
  };
  box.innerHTML = `<h3 class="group-t">القادمة</h3>${up.map(card).join('') || '<p class="empty">لا توجد فعاليات قادمة.</p>'}${past.length ? `<h3 class="group-t">السابقة</h3>${past.map(card).join('')}` : ''}`;
}

// ===================== الحساب =====================
function renderProfile() {
  if (!me) return;
  const f = $('#meForm');
  f.name.value = me.name || ''; f.x.value = me.x || ''; f.linkedin.value = me.linkedin || ''; f.position.value = me.position || '';
  setCollege(f, me.college || '');
  f.position.closest('label').hidden = !LEAD.includes(me.role);
  $('#meLine').innerHTML = `${GENDERS[me.gender || 'm']} · ${esc(ROLES[me.role] || '')}${me.committee ? ' — ' + esc(cname(me.committee)) : ''} &nbsp; ${me.approved ? '<span class="badge lead">معتمد</span>' : '<span class="badge wait">بانتظار الاعتماد</span>'}`;
}

// ===================== الكلية =====================
function getCollege(f) { const v = f.college.value; return v === '__other' ? f.collegeOther.value.trim() : v; }
function setCollege(f, c) {
  const known = !c || COLLEGES.includes(c);
  f.college.value = known ? c : '__other'; f.collegeOther.value = known ? '' : c;
  f.querySelector('.colOther').hidden = known;
}

// ===================== الإدارة =====================
let allCache = [];
// يرجّع رسالة إذا المقاعد ممتلئة
function seatsFull(u, role, committee) {
  if (!LIMITS[role]) return '';
  const g = u.gender || 'm';
  const taken = allCache.filter(x => x.uid !== u.uid && x.approved && x.role === role && (ADMIN.includes(role) || (x.committee === committee && (x.gender || 'm') === g))).length;
  return taken >= LIMITS[role] ? `اكتمل العدد: ${ROLES[role]} ${ADMIN.includes(role) ? '' : 'في ' + cname(committee) + ' (' + GROUPS[g] + ')'} — الحد ${ar(LIMITS[role])}` : '';
}
async function renderAdmin() {
  if (!isAdmin(me)) return;
  try { allCache = await api.users(); } catch (e) { toast(errMsg(e), true); return; }
  const pend = allCache.filter(u => !u.approved);
  $('#pendN').textContent = ar(pend.length);
  $('#pendBox').innerHTML = pend.length ? pend.map(u => `<div class="req"><div><strong>${esc(u.name)}</strong> <span class="badge">${GENDERS[u.gender || 'm']}</span><br><span class="muted" style="font-size:14px">${esc(ROLES[u.role])}${u.committee ? ' — ' + esc(cname(u.committee)) : ''}</span></div>
    <div class="acts"><button class="btn sm" data-approve="${esc(u.uid)}">اعتماد</button><button class="btn sm ghost" data-demote="${esc(u.uid)}">اعتماد كعضو</button><button class="btn sm del" data-reject="${esc(u.uid)}">رفض</button></div></div>`).join('') : '<p class="empty">لا توجد طلبات.</p>';
  paintAll();
  const pts = (await api.points().catch(() => [])).sort((a, b) => b.createdAt - a.createdAt);
  $('#ptLog').innerHTML = pts.map(p => `<li><span>${esc(cname(p.committee))} — ${esc(p.reason)} <small class="muted">(${esc(p.by || '')})</small></span><span style="display:flex;gap:6px;align-items:center"><span class="badge ${p.amount < 0 ? 'wait' : 'lead'}">${p.amount > 0 ? '+' : ''}${ar(p.amount)}</span><button class="btn sm del" data-del-pt="${esc(p.id)}">حذف</button></span></li>`).join('') || '<li class="muted">لا توجد نقاط مسجّلة.</li>';
}
function paintAll() {
  const q = ($('#search').value || '').trim();
  const list = allCache.filter(u => !q || (u.name || '').includes(q)).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.name || '').localeCompare(b.name || '', 'ar'));
  $('#allN').textContent = ar(allCache.length);
  const roleOpts = r => Object.entries(ROLES).filter(([k]) => k !== 'president' || me.role === 'president' || r === 'president').map(([k, v]) => `<option value="${k}" ${k === r ? 'selected' : ''}>${v}</option>`).join('');
  const comOpts = c => `<option value="">—</option>` + COMMITTEES.map(x => `<option value="${x.id}" ${x.id === c ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  $('#allBox').innerHTML = list.map(u => {
    const self = u.uid === me.uid, locked = self || (u.role === 'president' && me.role !== 'president');
    return `<tr data-uid="${esc(u.uid)}"><td><strong>${esc(u.name)}</strong> <span class="badge">${GENDERS[u.gender || 'm']}</span></td>
      <td><select data-f="role" ${locked ? 'disabled' : ''} aria-label="الدور">${roleOpts(u.role)}</select></td>
      <td><select data-f="committee" ${locked ? 'disabled' : ''} aria-label="اللجنة">${comOpts(u.committee)}</select></td>
      <td>${u.approved ? '<span class="badge lead">معتمد</span>' : '<span class="badge wait">معلّق</span>'}</td>
      <td>${locked ? '' : `<button class="btn sm" data-save="${esc(u.uid)}">حفظ</button> <button class="btn sm del" data-reject="${esc(u.uid)}">حذف</button>`}</td></tr>`;
  }).join('');
}

// ===================== من نحن =====================
function renderAboutOnce() {
  const rope = '<svg viewBox="0 0 46 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M2 12h10c4 0 6-8 11-8s7 8 11 8h10M12 12c4 0 6 8 11 8s7-8 11-8"/></svg>';
  document.querySelectorAll('.rp').forEach(r => r.innerHTML = rope);
  const li = (t, i) => `<li><b>${ar(i + 1)}</b><span>${t}</span></li>`;
  $('#fieldsList').innerHTML = ['التربية الدينية', 'التربية الوطنية', 'التربية الكشفية', 'التربية الاجتماعية والبيئية', 'التربية العقلية والأنشطة العلمية', 'التربية الصحية', 'التربية الرياضية'].map(li).join('');
  $('#lawList').innerHTML = ['صادق', 'مخلص', 'نافع', 'صديق للجميع', 'مقتصد', 'مبتسم', 'رفيق بالحيوان ومحافظ على الطبيعة', 'مهذب', 'مطيع', 'نظيف في فكره وقوله وعمله ومظهره'].map(li).join('');
  const logos = [
    { img: 'assets/img/club-logo.jpg', t: 'نادي الجوالة — جامعة أم القرى', en: 'UQU Rover Scouts Club', p: 'نادي طلابي في جامعة أم القرى يجمع الطلاب الجوالة، ينظّم البرامج الكشفية والأنشطة التطوعية، ويشارك في معسكرات الخدمة العامة لخدمة ضيوف الرحمن في الحج.', f: ['جامعة أم القرى', 'مكة المكرمة'] },
    { img: 'assets/logos/sasa.png', t: 'جمعية الكشافة العربية السعودية', en: 'Saudi Arabian Scouts Association', p: 'الجهة الرسمية التي ترسم الخطة العامة للحركة الكشفية في المملكة وتشرف عليها. أُسست بمرسوم ملكي، ومقرها الرياض، ويرأس مجلس إدارتها وزير التعليم. ومن أبرز برامجها معسكرات الخدمة العامة في الحج التي يشارك فيها نادينا.', f: ['تأسست ١٣٨١هـ / ١٩٦١م', 'عضو عالمي منذ ١٩٦٣م'] },
    { img: 'assets/logos/mop.png', bg: 'scout', t: 'رسل السلام', en: 'Messengers of Peace', p: 'مبادرة عالمية ضمن المنظمة الكشفية العالمية، وُلدت فكرتها من الملك عبدالله بن عبدالعزيز رحمه الله وملك السويد كارل السادس عشر غوستاف، وأُطلقت رسميًا في جدة. تشجّع الكشافين على خدمة مجتمعاتهم ونشر ثقافة السلام، وجدّدت المملكة دعمها لها عام ٢٠٢٥م بصندوق قدره ٥٠ مليون دولار للعقد القادم.', f: ['أُطلقت في جدة ٢٠١١م', 'مبادرة سعودية الأصل'] },
    { img: 'assets/logos/wosm.png', bg: 'scout', t: 'سكاوت — المنظمة الكشفية العالمية', en: 'SCOUTS · World Organization of the Scout Movement', p: 'المظلة الدولية للحركة الكشفية التي تجمع الجمعيات الكشفية الوطنية حول العالم، ومنها جمعيتنا السعودية. يرمز شعارها بزهرة الزنبق إلى الإرشاد ووجهة البوصلة، ويحيط بها حبل معقود بعقدة الريف رمزًا لوحدة الكشافين وأخوّتهم، ويظهر بصيغة «<bdi dir="ltr">SCOUTS Saudi Arabia</bdi>» لأن جمعيتنا عضو فيها.', f: ['نحو ١٧٦ جمعية وطنية', 'أكثر من ٥٠ مليون كشاف'] },
    { img: 'assets/img/baden-powell.jpg', photo: true, t: 'مؤسس الحركة: بادن باول', en: 'Lord Robert Baden-Powell', p: 'ضابط بريطاني أسس الحركة الكشفية عام ١٩٠٧م بأول مخيم كشفي في جزيرة براونسي بإنجلترا، ثم ألّف كتاب «الكشافة للفتيان» عام ١٩٠٨م الذي نشر الفكرة في العالم كله.', f: ['١٩٠٧م', 'جزيرة براونسي'] },
  ];
  $('#logoGrid').innerHTML = logos.map(l => `<div class="card lc"><div class="mark ${l.bg || ''}"${l.photo ? ' style="background:#1a2a1d"' : ''}><img src="${l.img}" alt="${l.t}"${l.photo ? ' style="width:120px;height:120px;border-radius:50%;object-fit:cover;max-width:none;border:3px solid #B08B44"' : ''}><div class="ph"></div></div><h3>${l.t}</h3><div class="en">${l.en}</div><p>${l.p}</p><div class="facts">${l.f.map(x => `<span>${x}</span>`).join('')}</div></div>`).join('');
  $('#logoGrid').querySelectorAll('.mark img').forEach(im => { const miss = () => im.parentElement.classList.add('missing'); im.addEventListener('error', miss); if (im.complete && !im.naturalWidth) miss(); });
}

const RENDER = {
  home: () => { renderTweets(); renderHomeAnn(); },
  leaders: renderLeaders, committees: renderCommittees, events: renderEvents, profile: renderProfile, admin: renderAdmin,
};

// ===================== الأحداث =====================
function bind() {
  // التبويبات
  const tab = up => { $('#tabUp').setAttribute('aria-selected', up); $('#tabIn').setAttribute('aria-selected', !up); $('#upForm').hidden = !up; $('#inForm').hidden = up; };
  $('#tabUp').onclick = () => tab(true); $('#tabIn').onclick = () => tab(false);

  // خيارات التسجيل
  $('#upRole').innerHTML = SIGNUP_ROLES.map(r => `<option value="${r}">${ROLES[r]}</option>`).join('');
  $('#upCom').innerHTML = '<option value="">اختر اللجنة</option>' + COMMITTEES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const syncCom = () => { const vp = $('#upRole').value === 'vp'; $('#upComWrap').hidden = vp; $('#upCom').required = !vp; };
  $('#upRole').onchange = syncCom; syncCom();

  $('#upForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, err = $('#upErr'); err.textContent = '';
    const x = xUrl(f.x.value), li = liUrl(f.linkedin.value), role = f.role.value;
    if (x === null) return err.textContent = 'اكتب معرّف X بشكل صحيح، مثل ‎@username';
    if (li === null) return err.textContent = 'رابط LinkedIn غير صحيح.';
    if (!SIGNUP_ROLES.includes(role)) return;
    if (!GENDERS[f.gender.value]) return err.textContent = 'اختر: طالب أو طالبة';
    const college = getCollege(f); if (!college) return err.textContent = 'اختر كليتك أو اكتب اسمها.';
    const profile = { name: f.name.value.trim(), gender: f.gender.value, college, role, committee: role === 'vp' ? '' : f.committee.value, x, linkedin: li, position: '', approved: role === 'member', public: false, createdAt: Date.now() };
    busy(f.querySelector('.btn'), async () => {
      try { await api.signUp({ email: f.email.value.trim(), password: f.password.value, profile }); f.reset(); syncCom(); toast(role === 'member' ? 'أهلًا بك في نادي الجوالة!' : 'تم التسجيل، وطلبك بانتظار اعتماد رئيس النادي.'); location.hash = 'profile'; }
      catch (e2) { err.textContent = errMsg(e2); }
    });
  };
  $('#inForm').onsubmit = e => {
    e.preventDefault(); const f = e.target; $('#inErr').textContent = '';
    busy(f.querySelector('.btn'), async () => {
      try { await api.signIn(f.email.value.trim(), f.password.value); f.reset(); location.hash = 'home'; toast('أهلًا بعودتك'); }
      catch (e2) { $('#inErr').textContent = errMsg(e2); }
    });
  };
  $('#forgot').onclick = async () => {
    const em = $('#inForm').email.value.trim(); if (!em) return $('#inErr').textContent = 'اكتب بريدك أولًا ثم اضغط «نسيت كلمة المرور».';
    try { await api.resetPassword(em); toast('أرسلنا رابط استعادة كلمة المرور إلى بريدك.'); } catch (e2) { $('#inErr').textContent = errMsg(e2); }
  };

  $('#meForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, err = $('#meErr'); err.textContent = '';
    const x = xUrl(f.x.value), li = liUrl(f.linkedin.value);
    if (x === null) return err.textContent = 'اكتب معرّف X بشكل صحيح.'; if (li === null) return err.textContent = 'رابط LinkedIn غير صحيح.';
    const data = { name: f.name.value.trim(), x, linkedin: li, college: getCollege(f) }; if (LEAD.includes(me.role)) data.position = f.position.value.trim();
    busy(f.querySelector('.btn'), async () => { try { await api.updateUser(me.uid, data); toast('تم حفظ بياناتك'); } catch (e2) { err.textContent = errMsg(e2); } });
  };
  $('#outBtn').onclick = async () => { await api.signOut(); location.hash = 'home'; toast('تم تسجيل الخروج'); };

  // التغريدات والإعلانات
  $('#twForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, url = postUrl(f.url.value);
    if (!url) return toast('الرابط لازم يكون من x.com', true);
    busy(f.querySelector('.btn'), async () => { try { await api.addTweet({ url, text: f.text.value.trim(), by: me.uid }); f.reset(); $('#twAdd').open = false; renderTweets(); toast('تمت إضافة التغريدة'); } catch (e2) { toast(errMsg(e2), true); } });
  };
  $('#annForm').onsubmit = e => {
    e.preventDefault(); const f = e.target;
    busy(f.querySelector('.btn'), async () => { try { await api.addAnnouncement({ committee: 'general', text: f.text.value.trim(), authorUid: me.uid, authorName: me.name }); f.reset(); $('#annAdd').open = false; renderHomeAnn(); toast('تم نشر الإعلان'); } catch (e2) { toast(errMsg(e2), true); } });
  };
  $('#comBox').addEventListener('submit', e => {
    const f = e.target; if (!f.dataset.com) return; e.preventDefault();
    busy(f.querySelector('.btn'), async () => { try { await api.addAnnouncement({ committee: f.dataset.com, text: f.text.value.trim(), authorUid: me.uid, authorName: me.name }); toast('تم نشر إعلان اللجنة'); renderCommittees(); } catch (e2) { toast(errMsg(e2), true); } });
  });

  document.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    try {
      if (d.go) { b.disabled = true; await api.attend(d.go, d.on === '1'); renderEvents(); toast(d.on === '1' ? 'تم تسجيل حضورك' : 'تم إلغاء التسجيل'); }
      else if (d.delEv) { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟'; return; } b.disabled = true; await api.deleteEvent(d.delEv); renderEvents(); toast('تم الحذف'); }
      else if (d.delPt) { b.disabled = true; await api.deletePoints(d.delPt); renderAdmin(); toast('تم حذف القيد'); }
      else if (d.delTw) { b.disabled = true; await api.deleteTweet(d.delTw); renderTweets(); toast('تم الحذف'); }
      else if (d.delAnn) { b.disabled = true; await api.deleteAnnouncement(d.delAnn); RENDER[current]?.(); toast('تم الحذف'); }
      else if (d.approve) { const u = allCache.find(x => x.uid === d.approve); const full = seatsFull(u, u.role, u.committee); if (full) return toast(full, true); b.disabled = true; await api.updateUser(d.approve, { approved: true, public: LEAD.includes(u.role) }); toast('تم اعتماد ' + u.name); renderAdmin(); }
      else if (d.demote) { b.disabled = true; await api.updateUser(d.demote, { approved: true, role: 'member', public: false }); toast('تم اعتماده كعضو'); renderAdmin(); }
      else if (d.reject) { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟'; return; } b.disabled = true; await api.deleteUser(d.reject); toast('تم الحذف'); renderAdmin(); }
      else if (d.save) {
        const tr = b.closest('tr'), role = tr.querySelector('[data-f=role]').value, committee = tr.querySelector('[data-f=committee]').value;
        const u = allCache.find(x => x.uid === d.save);
        const full = u.approved && seatsFull(u, role, committee); if (full) return toast(full, true);
        b.disabled = true; await api.updateUser(d.save, { role, committee: ADMIN.includes(role) ? '' : committee, public: !!u.approved && LEAD.includes(role) }); toast('تم الحفظ'); renderAdmin();
      }
    } catch (e2) { b.disabled = false; toast(errMsg(e2), true); }
  });

  $('#search').oninput = paintAll;
  document.addEventListener('click', e => {
    const t = e.target.closest('.gtabs button'); if (t) { const pg = t.closest('.gtabs').dataset.page; gState[pg] = t.dataset.g; RENDER[pg](); return; }
    const o = e.target.closest('[data-open]');
    if (o) { openCom = openCom === o.dataset.open ? null : o.dataset.open; comG = me?.gender || 'm'; renderCommittees().then(() => $('#comDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); return; }
    const cg = e.target.closest('[data-cg]'); if (cg) { comG = cg.dataset.cg; renderCommittees(); }
  });
  document.querySelectorAll('.colSel').forEach(sel => {
    sel.innerHTML = '<option value="">اختر الكلية</option>' + COLLEGES.map(c => `<option>${esc(c)}</option>`).join('') + '<option value="__other">أخرى (اكتب اسمها)</option>';
    sel.onchange = () => { const o = sel.closest('form').querySelector('.colOther'); o.hidden = sel.value !== '__other'; o.querySelector('input').required = sel.value === '__other'; };
  });
  const comOpts = '<option value="">—</option>' + COMMITTEES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#evCom').innerHTML = comOpts; $('#ptCom').innerHTML = COMMITTEES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#evForm').onsubmit = e => {
    e.preventDefault(); const f = e.target;
    const ev = { title: f.title.value.trim(), date: f.date.value, time: f.time.value.trim(), place: f.place.value.trim(), audience: f.audience.value, committee: f.committee.value, desc: f.desc.value.trim(), by: me.uid };
    busy(f.querySelector('.btn'), async () => { try { await api.addEvent(ev); f.reset(); $('#evAdd').open = false; renderEvents(); toast('تمت إضافة الفعالية'); } catch (e2) { toast(errMsg(e2), true); } });
  };
  $('#ptForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, amount = parseInt(f.amount.value, 10);
    if (!amount || Math.abs(amount) > 100) return toast('اكتب عدد نقاط بين ١ و ١٠٠ (أو بالسالب للخصم)', true);
    busy(f.querySelector('.btn'), async () => { try { await api.addPoints({ committee: f.committee.value, amount, reason: f.reason.value.trim(), by: me.name }); f.reason.value = ''; toast('تم تسجيل النقاط'); renderAdmin(); } catch (e2) { toast(errMsg(e2), true); } });
  };
  $('#twNext').onclick = () => { clearInterval(twTimer); twGo(twIdx + 1); };
  $('#twPrev').onclick = () => { clearInterval(twTimer); twGo(twIdx - 1); };
  $('#twTrack').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') twGo(twIdx + 1); if (e.key === 'ArrowRight') twGo(twIdx - 1); });
  $('#twTrack').addEventListener('pointerdown', () => clearInterval(twTimer));
  addEventListener('hashchange', route);
}

// ===================== التشغيل =====================
(async () => {
  renderAboutOnce(); bind();
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey) {
    try { api = await FirebaseBackend(cfg); }
    catch { api = DemoBackend(); toast('تعذّر الاتصال بـ Firebase، المنصة تعمل تجريبيًا', true); }
  } else api = DemoBackend();
  $('#demoBar').hidden = api.mode !== 'demo';
  let first = true;
  api.onAuth(u => { me = u; paintNav(); if (first) { first = false; route(); } else route(); });
})();
}
