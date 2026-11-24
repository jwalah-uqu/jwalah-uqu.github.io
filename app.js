/* منصة نادي الجوالة — جامعة أم القرى
   تعمل بوضعين:
   - مباشر: إذا كان firebase-config.js فيه apiKey ← Firebase Auth + Firestore (والحماية في firestore.rules)
   - تجريبي: بدون إعدادات ← البيانات في متصفح الزائر فقط (للمعاينة) */
{
// ===================== الإعدادات =====================
// اللجان حسب هيكلة النادي 1448هـ
const COMMITTEES = [
  { id: 'pr',      name: 'لجنة العلاقات العامة' },
  { id: 'quality', name: 'لجنة جودة الحياة والتطوير' },
  { id: 'comp',    name: 'لجنة المسابقات والأنشطة الرياضية' },
  { id: 'hr',      name: 'لجنة التقنية والموارد البشرية' },
  { id: 'media',   name: 'قسم الإعلام والتصميم' },
];
// الهيكل: رئيس النادي + 3 نواب، ولكل لجنة رئيسان ونائبان (طلاب وطالبات معًا)
const LIMITS = { president: 1, vp: 3, leader: 2, deputy: 2, patrol_leader: 1 };
// الأرهط: فرق جانبية بجانب اللجان، لكل رهط قائد
const PATROLS = [
  { id: 'makkah', name: 'رهط مكة', g: 'm' }, { id: 'qimma', name: 'رهط القمة', g: 'm' }, { id: 'jood', name: 'رهط الجود', g: 'm' },
  { id: 'himma', name: 'رهط همة', g: 'f' }, { id: 'nukhba', name: 'رهط النخبة', g: 'f' }, { id: 'aoun', name: 'رهط عون', g: 'f' },
];
const pname = id => PATROLS.find(p => p.id === id)?.name || '';
const COLLEGES = ['كلية الحاسبات', 'كلية الهندسة والعمارة الإسلامية', 'كلية العلوم التطبيقية', 'كلية الطب', 'كلية طب الأسنان', 'كلية الصيدلة', 'كلية العلوم الطبية التطبيقية', 'كلية التمريض', 'كلية الصحة العامة والمعلوماتية الصحية', 'كلية إدارة الأعمال', 'كلية الشريعة والدراسات الإسلامية', 'كلية الدعوة وأصول الدين', 'كلية اللغة العربية وآدابها', 'كلية التربية', 'كلية العلوم الاجتماعية'];
const ROLES = { president: 'رئيس النادي', vp: 'نائب الرئيس', leader: 'رئيس لجنة', deputy: 'نائب رئيس لجنة', patrol_leader: 'قائد رهط', member: 'عضو', beneficiary: 'مستفيد' };
const SIGNUP_ROLES = ['member', 'beneficiary', 'patrol_leader', 'deputy', 'leader', 'vp'];
const NO_COMMITTEE = ['president', 'vp', 'beneficiary', 'patrol_leader'];
const AUTO_APPROVED = ['member', 'beneficiary'];
const LEAD = ['president', 'vp', 'leader', 'deputy', 'patrol_leader'];
const ADMIN = ['president', 'vp'];
const GENDERS = { m: 'طالب', f: 'طالبة' };
const ROLES_F = { president: 'رئيسة النادي', vp: 'نائبة الرئيس', leader: 'رئيسة لجنة', deputy: 'نائبة رئيس لجنة', patrol_leader: 'قائدة رهط', member: 'عضوة', beneficiary: 'مستفيدة' };
const roleName = u => (u.gender === 'f' ? ROLES_F : ROLES)[u.role] || '';
const GROUPS = { m: 'الطلاب', f: 'الطالبات' };
const ROLE_ORDER = { president: 0, vp: 1, leader: 2, deputy: 3, patrol_leader: 4, member: 5, beneficiary: 6 };

// ===================== أدوات =====================
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ar = n => String(n);
const cname = id => COMMITTEES.find(c => c.id === id)?.name || '';
const initial = n => esc((n || '؟').trim().charAt(0));
const fmtTime = t => { try { const d = new Date(t); return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const fmtDate = t => { try { return new Date(t).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' }); } catch { return ''; } };
const isLead = u => !!u && u.approved && LEAD.includes(u.role);
const isAdmin = u => !!u && u.approved && ADMIN.includes(u.role);
// فريق تسجيل النقاط: الرئيس ونوابه + رئيس لجنة التقنية والموارد البشرية ونائبه
const isPointsTeam = u => isAdmin(u) || (!!u && u.approved && u.committee === 'hr' && ['leader', 'deputy'].includes(u.role));
// مستشار النادي ومشرفوه
const STAFF = [
  { name: 'أ. أحمد حبيب الله', title: 'مشرف النادي' },
  { name: 'د. عبدالرحمن مدخلي', title: 'مستشار النادي' },
  { name: 'أ. هنيدة الهاشمي', title: 'مشرفة النادي' },
];
const memberPoints = (pts, uid) => pts.filter(p => p.uid === uid).reduce((s, p) => s + (+p.amount || 0), 0);

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
    'auth/weak-password': 'كلمة المرور ضعيفة، استخدم 6 أحرف على الأقل.', 'auth/invalid-email': 'صيغة البريد غير صحيحة.',
    'auth/too-many-requests': 'محاولات كثيرة، انتظر قليلًا ثم حاول.', 'permission-denied': 'ما عندك صلاحية لهذا الإجراء.',
  };
  return map[c] || (typeof e === 'string' ? e : 'صار خطأ، حاول مرة ثانية.');
}
async function busy(btn, fn) { btn.disabled = true; try { return await fn(); } finally { btn.disabled = false; } }

// ===================== طبقة البيانات: تجريبي =====================
function DemoBackend() {
  const KEY = 'jwalah-demo-v8', SKEY = 'jwalah-demo-session';
  const H123 = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
  const now = Date.now(), day = 864e5;
  const P = (uid, name, role, committee, extra = {}) => ({ uid, name, role, committee, email: uid + '@demo.sa', pw: H123, approved: true, public: role !== 'member', gender: 'm', x: '', linkedin: '', major: '', createdAt: now, ...extra });
  const seed = () => ({
    users: [
      P('president', 'المثنى وترة', 'president', ''),
      P('vp1', 'أصيل بادحدح', 'vp', '', { x: 'https://x.com/aseell8s' }), P('vp2', 'دينا عزالدين', 'vp', '', { gender: 'f' }),
      P('pr1', 'هديل الدليوي', 'leader', 'pr', { gender: 'f' }), P('pr2', 'حسن مختار', 'deputy', 'pr'),
      P('q1', 'نواف الزهراني', 'leader', 'quality'), P('q2', 'شهد النفيعي', 'deputy', 'quality', { gender: 'f' }),
      P('c1', 'حسان زوقر', 'leader', 'comp'), P('c2', 'ريتال الحربي', 'deputy', 'comp', { gender: 'f' }),
      P('hr1', 'رهام فلاته', 'leader', 'hr', { gender: 'f' }), P('hr2', 'حمزة مثنى', 'deputy', 'hr'),
      P('pt1', 'سلمان العصيمي', 'patrol_leader', '', { patrol: 'makkah' }), P('pt2', 'نواف الشمراني', 'patrol_leader', '', { patrol: 'qimma' }), P('pt3', 'عوض شراب', 'patrol_leader', '', { patrol: 'jood' }),
      P('pt4', 'جنى عابد', 'patrol_leader', '', { patrol: 'himma', gender: 'f' }), P('pt5', 'ريتاج شعيري', 'patrol_leader', '', { patrol: 'nukhba', gender: 'f' }), P('pt6', 'سديم الثبيتي', 'patrol_leader', '', { patrol: 'aoun', gender: 'f' }),
    ],
    ann: [
      { id: 'a1', committee: 'general', text: 'حياكم الله في منصة نادي الجوالة، سجّلوا حساباتكم واختاروا لجانكم.', authorUid: 'president', authorName: 'المثنى وترة', createdAt: now - day },
      { id: 'a2', committee: 'quality', text: 'اجتماع اللجنة يوم الأحد بعد العصر في مقر النادي.', authorUid: 'q1', authorName: 'نواف الزهراني', createdAt: now - 2 * day },
    ],
    points: [
      { id: 'p1', kind: 'member', uid: 'q2', name: 'شهد النفيعي', committee: 'quality', amount: 3, reason: 'تنظيم فعالية', by: 'رهام فلاته', createdAt: now - day },
      { id: 'p2', kind: 'member', uid: 'pr1', name: 'هديل الدليوي', committee: 'pr', amount: 2, reason: 'تنسيق شراكة', by: 'رهام فلاته', createdAt: now },
      { id: 'p3', kind: 'committee', committee: 'comp', amount: 2, reason: 'تنظيم مسابقة', by: 'المثنى وترة', createdAt: now },
    ],
    events: [
      { id: 'e1', title: 'لقاء تعريفي بنادي الجوالة', date: new Date(now + 3 * day).toISOString().slice(0, 10), time: '7 مساءً', place: 'مقر النادي', audience: 'm', committee: '', desc: 'تعرّف على النادي ولجانه وبرنامج الفصل.', attendees: [], createdAt: now },
      { id: 'e2', title: 'ورشة الإسعافات الأولية', date: new Date(now + 6 * day).toISOString().slice(0, 10), time: '10 صباحًا', place: 'قاعة الأنشطة', audience: 'f', committee: 'quality', desc: '', attendees: [], createdAt: now },
    ],
    chat: [
      { id: 'c1', uid: 'president', name: 'المثنى وترة', role: 'president', gender: 'm', text: 'حياكم الله في الشات العام لنادي الجوالة 🌿', createdAt: now - 3600e3 },
    ],
    tweets: [
      { id: 't1', url: 'https://x.com/jwalah_uqu', text: 'الجوالة.. شرف الخدمة وروح العطاء 🤍\n#الكشفية_درب_تعلم_لاينتهي', createdAt: now - day },
      { id: 't2', url: 'https://x.com/jwalah_uqu', text: 'شكرًا لجوالة جامعة أم القرى على مشاركتهم في معسكرات الخدمة العامة حج 1447هـ.', createdAt: now - 4 * day },
    ],
  });
  let mem; try { mem = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!mem || !mem.users) mem = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {} };
  let sess = null; try { sess = sessionStorage.getItem(SKEY); } catch {}
  let cb = () => {}, chatCb = null;
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
      need(u && (isAdmin(m) || (m.uid === uid && Object.keys(data).every(k => ['name', 'x', 'linkedin', 'major', 'college'].includes(k)))));
      Object.assign(u, data); save(); if (uid === sess) emit();
    },
    async deleteUser(uid) { need(isAdmin(me())); mem.users = mem.users.filter(u => u.uid !== uid); save(); },
    async announcements(committee) { return mem.ann.filter(a => a.committee === committee).sort((a, b) => b.createdAt - a.createdAt); },
    async addAnnouncement(a) { need(isLead(me())); mem.ann.push({ id: 'a' + Date.now(), createdAt: Date.now(), ...a }); save(); },
    async deleteAnnouncement(id) { need(isLead(me())); mem.ann = mem.ann.filter(a => a.id !== id); save(); },
    async points() { return mem.points || []; },
    async addPoints(p) { need(isPointsTeam(me())); (mem.points ||= []).push({ id: 'p' + Date.now(), createdAt: Date.now(), ...p }); save(); },
    async deletePoints(id) { need(isPointsTeam(me())); mem.points = (mem.points || []).filter(p => p.id !== id); save(); },
    async stats() { return calcStats(mem.users); },
    async saveStats() {},
    watchChat(cb) { const f = () => cb([...(mem.chat || [])].sort((a, b) => a.createdAt - b.createdAt).slice(-100)); chatCb = f; f(); return () => { chatCb = null; }; },
    async sendChat(m) { const u = me(); need(u && u.approved); (mem.chat ||= []).push({ id: 'c' + Date.now(), createdAt: Date.now(), ...m }); save(); chatCb?.(); },
    async deleteChat(id) { mem.chat = (mem.chat || []).filter(c => c.id !== id); save(); chatCb?.(); },
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
      await users.doc(c.user.uid).set(d.profile);
      // العضو والمستفيد يُحسبون فورًا في الأعداد
      if (d.profile.approved) {
        const inc = firebase.firestore.FieldValue.increment(1), up = { updatedAt: Date.now() };
        if (d.profile.role === 'beneficiary') up.beneficiaries = inc; else { up.members = inc; if (d.profile.committee) up['c_' + d.profile.committee] = inc; }
        try { await fs.collection('stats').doc('club').set(up, { merge: true }); } catch (e) { console.warn('[jwalah] stats', e); }
      }
      await emit();
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
    async stats() { const d = await fs.collection('stats').doc('club').get(); return d.exists ? d.data() : null; },
    async saveStats(st) { await fs.collection('stats').doc('club').set({ ...st, updatedAt: Date.now() }); },
    watchChat(cb) { return fs.collection('chat').orderBy('createdAt', 'desc').limit(100).onSnapshot(q => cb(docs(q).reverse()), () => cb(null)); },
    async sendChat(m) { await fs.collection('chat').add({ ...m, createdAt: Date.now() }); },
    async deleteChat(id) { await fs.collection('chat').doc(id).delete(); },
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
const PAGES = ['home', 'about', 'leaders', 'committees', 'events', 'chat', 'points', 'join', 'profile', 'admin'];
let chatUnsub = null;
let current = 'home';

function route() {
  if (!api) return;
  let p = location.hash.slice(1) || 'home';
  if (!PAGES.includes(p)) p = 'home';
  if (p === 'join' && me) p = 'profile';
  if (p === 'profile' && !me) p = 'join';
  if (p === 'admin' && !isAdmin(me)) p = me ? 'home' : 'join';
  if (p === 'points' && !isPointsTeam(me)) p = me ? 'home' : 'join';
  if (p === 'chat' && !me?.approved) p = me ? 'home' : 'join';
  if (p !== 'chat' && chatUnsub) { chatUnsub(); chatUnsub = null; }
  const changed = p !== current; current = p;
  document.querySelectorAll('.page').forEach(s => s.hidden = s.dataset.page !== p);
  document.querySelectorAll('#links a').forEach(a => a.classList.toggle('on', a.dataset.p === p));
  if (changed) window.scrollTo(0, 0);
  (RENDER[p] || (() => {}))();
}

function paintNav() {
  $('#navJoin').hidden = !!me; $('#navMe').hidden = !me; $('#navAdmin').hidden = !isAdmin(me);
  $('#navPoints').hidden = !isPointsTeam(me); $('#navChat').hidden = !me?.approved;
  if (me) $('#navName').textContent = (me.name || 'حسابي').split(' ')[0];
  $('#heroCta').hidden = !!me;
  $('#welcome').textContent = me ? `أهلًا وسهلًا ${(me.name || '').split(' ')[0]} 👋` : 'أهلًا وسهلًا بكم في منصة نادي الجوالة';
  $('#twAdd').hidden = !isLead(me); $('#annAdd').hidden = !isLead(me);
}

// ===================== الإحصائيات =====================
// القادة يحسبون الأعداد من قائمة الأعضاء ويحفظونها، والزوار يقرؤونها
// الأعداد محفوظة في stats/club: تزيد مباشرة مع كل تسجيل، والإدارة تعيد حسابها كاملة عند الاعتماد أو الحذف
function calcStats(users) {
  const a = users.filter(u => u.approved), st = { members: a.filter(u => u.role !== 'beneficiary').length, beneficiaries: a.filter(u => u.role === 'beneficiary').length };
  COMMITTEES.forEach(c => st['c_' + c.id] = a.filter(u => u.committee === c.id && u.role !== 'beneficiary').length);
  return st;
}
const comCount = (st, id) => st ? (st['c_' + id] ?? 0) : null;
async function syncStats(users) {
  if (!isLead(me)) return;
  try { const st = calcStats(users), old = await api.stats() || {}; if (Object.keys(st).some(k => old[k] !== st[k])) await api.saveStats(st); } catch {}
}
async function renderStats() {
  let st = null;
  if (isLead(me)) { try { const us = await api.users(); st = calcStats(us); syncStats(us); } catch {} }
  if (!st) st = await api.stats().catch(() => null);
  const pts = await api.points().catch(() => []);
  const evs = await api.events().catch(() => []);
  const today = new Date().toISOString().slice(0, 10);
  const items = [
    ['أعضاء النادي', st ? st.members : '—'],
    ['المستفيدون', st ? st.beneficiaries : '—'],
    ['اللجان', COMMITTEES.length],
    ['الفعاليات القادمة', evs.filter(e => e.date >= today).length],
  ];
  $('#statsRow').innerHTML = items.map(([l, v]) => `<div class="stat"><b>${typeof v === 'number' ? ar(v) : v}</b><span>${l}</span></div>`).join('');
  const total = id => pts.filter(p => p.committee === id).reduce((s, p) => s + (+p.amount || 0), 0);
  const ranked = COMMITTEES.map(c => ({ ...c, n: comCount(st, c.id), pts: total(c.id) })).sort((a, b) => b.pts - a.pts);
  const top = ranked[0]?.pts > 0 ? ranked[0].id : null;
  $('#comStats').innerHTML = ranked.map((c, i) => comCard(c, i, top, 'a')).join('');
}

// ===================== الرئيسية =====================
let twTimer, twIdx = 0, twCount = 0;
// تضمين التغريدة الرسمي من X (يعرض الصورة والنص والتفاعل)، ولو ما اشتغل يظهر النص الاحتياطي
const statusId = u => (String(u || '').match(/\/status\/(\d+)/) || [])[1] || '';
let twWidgetP;
function loadTwWidgets() {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);
  return twWidgetP ||= new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://platform.twitter.com/widgets.js'; s.async = true; s.charset = 'utf-8'; s.onload = () => ok(window.twttr); s.onerror = no; document.head.append(s); });
}
async function renderTweets() {
  const list = await api.tweets().catch(() => []);
  twCount = list.length;
  const can = isLead(me);
  const dark = false;
  $('#twTrack').innerHTML = list.length ? list.map(t => {
    const id = statusId(t.url), url = postUrl(t.url) || 'https://x.com/jwalah_uqu';
    const fallback = `<div class="who"><img src="assets/img/club-logo.jpg" alt=""><div>نادي الجوالة <span>@jwalah_uqu</span></div></div>
        ${t.text ? `<p>${esc(t.text)}</p>` : '<p>اضغط لعرض التغريدة في X</p>'}`;
    return `<article class="tw ${id ? 'embed' : ''}">
      ${id ? `<blockquote class="twitter-tweet" data-lang="ar" data-dnt="true" data-conversation="none" ${dark ? 'data-theme="dark"' : ''}>${fallback}<a href="https://twitter.com/jwalah_uqu/status/${id}"></a></blockquote>` : fallback}
      <div class="act">
        <a class="open" href="${esc(url)}" target="_blank" rel="noopener"><svg class="ic" fill="currentColor"><use href="#xl"/></svg>افتح في X</a>
        <span style="font-size:13px;opacity:.75">${fmtDate(t.createdAt)}</span>
        ${can ? `<button class="btn sm del" data-del-tw="${esc(t.id)}">حذف</button>` : ''}
      </div>
    </article>`;
  }).join('') : '<p class="empty" style="flex:1">لا توجد تغريدات بعد.</p>';
  $('#twCtl').hidden = list.length < 2;
  $('#twDots').innerHTML = list.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  twIdx = 0; clearInterval(twTimer);
  if (list.some(t => statusId(t.url))) loadTwWidgets().then(tw => tw.widgets.load($('#twTrack'))).catch(() => {});
  if (list.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) twTimer = setInterval(() => twGo(twIdx + 1), 8000);
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
  const pos = roleName(u) + (u.committee ? ' — ' + cname(u.committee) : u.patrol && u.role === 'patrol_leader' ? ' — ' + pname(u.patrol) : '');
  return `<div class="card person"><div class="av">${initial(u.name)}</div><h3>${esc(u.name)}</h3><div class="pos">${esc(pos)}</div>
    ${u.major || u.college ? `<div class="pos" style="font-size:13px">${esc([u.major, u.college].filter(Boolean).join(' · '))}</div>` : ''}
    ${x || li ? `<div class="socials">${x ? `<a href="${esc(x)}" target="_blank" rel="noopener" aria-label="X"><svg class="ic"><use href="#xl" fill="currentColor"/></svg></a>` : ''}${li ? `<a href="${esc(li)}" target="_blank" rel="noopener" aria-label="LinkedIn"><svg class="ic"><use href="#li" fill="currentColor"/></svg></a>` : ''}</div>` : ''}</div>`;
}
const seat = (n, max) => `<span class="seat">${ar(n)} / ${ar(max)}</span>`;
function staffCard(p) {
  return `<div class="card person staff"><div class="av fl" aria-hidden="true">⚜</div><div class="pos" style="color:var(--gold);font-weight:700">${esc(p.title)}</div><h3>${esc(p.name)}</h3></div>`;
}
// الأرهط: قائد كل رهط (بعد اعتماده) وعدد أعضائه إذا كانت القائمة متاحة
function patrolsHtml(users, members) {
  const grp = (g, t) => `<div class="pgroup"><h4>${t}</h4><div class="plist">${PATROLS.filter(p => p.g === g).map(p => {
    const ld = users.find(u => u.role === 'patrol_leader' && u.patrol === p.id && u.approved);
    const n = members ? members.filter(u => u.patrol === p.id && u.approved).length : null;
    return `<div class="patrol"><b>${esc(p.name)}</b><span>${ld ? esc(ld.name) : '<i class="muted">لم يُعتمد القائد بعد</i>'}</span>${n === null ? '' : `<small class="muted">${n} ${memberWord(n)}</small>`}</div>`;
  }).join('')}</div></div>`;
  return `<div class="patrols">${grp('m', 'أرهط الطلاب')}${grp('f', 'أرهط الطالبات')}</div>`;
}
async function renderLeaders() {
  const box = $('#leadersBox'); box.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  const all = (await api.publicLeaders().catch(() => [])).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const pres = all.filter(u => ADMIN.includes(u.role));
  let html = `<h3 class="group-t">المستشارون</h3><div class="people p3">${STAFF.map(staffCard).join('')}</div>`;
  html += `<h3 class="group-t">رئاسة النادي <span class="muted" style="font-size:14px;font-weight:500">رئيس و${LIMITS.vp} نواب</span></h3><div class="people">${pres.map(personCard).join('') || '<p class="empty">لم تُعتمد الرئاسة بعد.</p>'}</div>`;
  for (const c of COMMITTEES) {
    const ms = all.filter(u => u.committee === c.id && ['leader', 'deputy'].includes(u.role));
    html += `<h3 class="group-t">${esc(c.name)}</h3><div class="people">${ms.map(personCard).join('') || '<p class="empty">لم يُعتمد رئيس اللجنة ونائبه بعد.</p>'}</div>`;
  }
  html += `<h3 class="group-t">الأرهط <span class="muted" style="font-size:14px;font-weight:500">فرق جانبية بجانب اللجان، لكل رهط قائد</span></h3>${patrolsHtml(all, null)}`;
  box.innerHTML = html;
}

// ===================== اللجان والنقاط =====================
let openCom = null, comG = 'm';
const memberWord = n => n === 1 ? 'عضو' : n === 2 ? 'عضوان' : n >= 3 && n <= 10 ? 'أعضاء' : 'عضو';
const pointWord = n => Math.abs(n) >= 3 && Math.abs(n) <= 10 ? 'نقاط' : 'نقطة';
function comCard(c, i, top, tag) {
  const attrs = tag === 'a' ? `href="#committees"` : `type="button" data-open="${c.id}" aria-expanded="${c.id === openCom}"`;
  return `<${tag} class="card ccard ${c.id === top ? 'top' : ''} ${tag === 'button' && c.id === openCom ? 'open' : ''}" ${attrs}>
      ${c.id === top ? '<span class="first">الأولى</span>' : ''}
      <span class="cic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 14.2c2.4-.2 4.3 1.3 5 4.3"/></svg></span>
      <h3>${esc(c.name)}</h3>
      <div class="cnum">${c.n === null ? '' : `<span><b>${ar(c.n)}</b> ${memberWord(c.n)}</span>`}<span class="p"><b>${ar(c.pts)}</b> ${pointWord(c.pts)}</span></div>
    </${tag}>`;
}
async function renderCommittees() {
  const box = $('#comBox');
  box.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  const pts = await api.points().catch(() => []);
  const total = id => pts.filter(p => p.committee === id).reduce((s, p) => s + (+p.amount || 0), 0);
  let members = null;
  if (me?.approved) { try { members = await api.users(); syncStats(members); } catch {} }
  const st = members ? null : await api.stats().catch(() => null);
  const pubLeaders = members ? [] : await api.publicLeaders().catch(() => []);
  const inCom = id => (members || []).filter(u => u.committee === id && u.approved && u.role !== 'beneficiary');
  const ranked = COMMITTEES.map(c => ({ ...c, pts: total(c.id), n: members ? inCom(c.id).length : comCount(st, c.id) })).sort((a, b) => b.pts - a.pts);
  const top = ranked[0]?.pts > 0 ? ranked[0].id : null;
  let html = `<div class="ccards">${ranked.map((c, i) => comCard(c, i, top, 'button')).join('')}</div><h3 class="group-t">الأرهط <span class="muted" style="font-size:14px;font-weight:500">فرق جانبية بجانب اللجان</span></h3>${patrolsHtml(members || pubLeaders, members)}`;

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
        <ul class="names">${list.map(u => { const mp = memberPoints(pts, u.uid); return `<li><span>${esc(u.name)} <span class="badge ${LEAD.includes(u.role) ? 'lead' : ''}">${esc(roleName(u))}</span></span><span class="mpts" title="نقاط العضو"><b>${ar(mp)}</b> ${pointWord(mp)}</span></li>`; }).join('') || `<li class="muted">لا يوجد ${GROUPS[comG]} في هذه اللجنة بعد</li>`}</ul>
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
    return `<article class="card ev"><div class="ev-d"><b>${ar(d.getDate())}</b><span>${d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'long' })}</span></div>
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
  f.name.value = me.name || ''; f.x.value = me.x || ''; f.linkedin.value = me.linkedin || ''; f.major.value = me.major || '';
  setCollege(f, me.college || '');
  if (me.approved && me.role !== 'beneficiary') api.points().then(p => { const n = memberPoints(p, me.uid); $('#myPts').innerHTML = `نقاطي: <b>${ar(n)}</b> ${pointWord(n)}`; $('#myPts').hidden = false; }).catch(() => {}); else $('#myPts').hidden = true;
  $('#meLine').innerHTML = `${GENDERS[me.gender || 'm']} · ${esc(roleName(me))}${me.committee ? ' — ' + esc(cname(me.committee)) : ''}${me.patrol ? ' · ' + esc(pname(me.patrol)) : ''} &nbsp; ${me.approved ? '<span class="badge lead">معتمد</span>' : '<span class="badge wait">بانتظار الاعتماد</span>'}`;
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
  const taken = allCache.filter(x => x.uid !== u.uid && x.approved && x.role === role && (ADMIN.includes(role) || (role === 'patrol_leader' ? x.patrol === u.patrol : x.committee === committee))).length;
  return taken >= LIMITS[role] ? `اكتمل العدد: ${ROLES[role]} ${ADMIN.includes(role) ? '' : 'في ' + (role === 'patrol_leader' ? pname(u.patrol) : cname(committee))} — الحد ${ar(LIMITS[role])}` : '';
}
async function renderAdmin() {
  if (!isAdmin(me)) return;
  try { allCache = await api.users(); } catch (e) { toast(errMsg(e), true); return; }
  const pend = allCache.filter(u => !u.approved);
  $('#pendN').textContent = ar(pend.length);
  $('#pendBox').innerHTML = pend.length ? pend.map(u => `<div class="req"><div><strong>${esc(u.name)}</strong> <span class="badge">${GENDERS[u.gender || 'm']}</span><br><span class="muted" style="font-size:14px">${esc(ROLES[u.role])}${u.committee ? ' — ' + esc(cname(u.committee)) : ''}${u.patrol ? ' — ' + esc(pname(u.patrol)) : ''}</span></div>
    <div class="acts"><button class="btn sm" data-approve="${esc(u.uid)}">اعتماد</button><button class="btn sm ghost" data-demote="${esc(u.uid)}">اعتماد كعضو</button><button class="btn sm del" data-reject="${esc(u.uid)}">رفض</button></div></div>`).join('') : '<p class="empty">لا توجد طلبات.</p>';
  paintAll(); syncStats(allCache);
}

// ===================== تسجيل النقاط =====================
let ptUsers = [];
async function renderPoints() {
  if (!isPointsTeam(me)) return;
  try { ptUsers = (await api.users()).filter(u => u.approved && u.committee && u.role !== 'beneficiary'); } catch (e) { toast(errMsg(e), true); return; }
  const pts = await api.points().catch(() => []);
  $('#ptMember').innerHTML = '<option value="">اختر العضو</option>' + COMMITTEES.map(c => {
    const ms = ptUsers.filter(u => u.committee === c.id).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    return ms.length ? `<optgroup label="${esc(c.name)}">${ms.map(u => `<option value="${esc(u.uid)}">${esc(u.name)} (${GENDERS[u.gender || 'm']})</option>`).join('')}</optgroup>` : '';
  }).join('');
  const board = ptUsers.map(u => ({ u, p: memberPoints(pts, u.uid) })).sort((a, b) => b.p - a.p).slice(0, 10);
  $('#ptBoard').innerHTML = board.map(({ u, p }, i) => `<li><span><b class="rk">${ar(i + 1)}</b> ${esc(u.name)} <small class="muted">${esc(cname(u.committee))}</small></span><span class="mpts"><b>${ar(p)}</b> ${pointWord(p)}</span></li>`).join('') || '<li class="muted">لا يوجد أعضاء بعد.</li>';
  $('#ptLog').innerHTML = [...pts].sort((a, b) => b.createdAt - a.createdAt).map(p => `<li><span>${p.kind === 'member' ? `${esc(p.name)} <small class="muted">${esc(cname(p.committee))}</small>` : `<strong>${esc(cname(p.committee))}</strong>`} — ${esc(p.reason)} <small class="muted">(${esc(p.by || '')})</small></span><span style="display:flex;gap:6px;align-items:center"><span class="badge ${p.amount < 0 ? 'wait' : 'lead'}">${p.amount > 0 ? '+' : ''}${ar(p.amount)}</span><button class="btn sm del" data-del-pt="${esc(p.id)}">حذف</button></span></li>`).join('') || '<li class="muted">لا توجد نقاط مسجّلة.</li>';
}

// ===================== الشات العام =====================
let chatList = [];
function paintChat() {
  const box = $('#chatBox'), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.innerHTML = chatList.length ? chatList.map(m => {
    const mine = m.uid === me?.uid, canDel = mine || isAdmin(me);
    return `<div class="msg ${mine ? 'mine' : ''}"><div class="mh"><strong>${esc(m.name)}</strong>${LEAD.includes(m.role) ? `<span class="badge lead">${esc((m.gender === 'f' ? ROLES_F : ROLES)[m.role] || '')}</span>` : ''}<span class="t">${fmtTime(m.createdAt)}</span>${canDel ? `<button class="x" data-del-chat="${esc(m.id)}" aria-label="حذف الرسالة">×</button>` : ''}</div><p>${esc(m.text)}</p></div>`;
  }).join('') : '<p class="empty">ما فيه رسائل للحين. ابدأ السالفة 👋</p>';
  if (atBottom || !box.dataset.ready) { box.scrollTop = box.scrollHeight; box.dataset.ready = '1'; }
}
function renderChat() {
  if (!me?.approved) return;
  if (chatUnsub) return paintChat();
  $('#chatBox').innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  chatUnsub = api.watchChat(list => { if (list === null) { $('#chatBox').innerHTML = '<p class="empty">تعذّر تحميل الشات.</p>'; return; } chatList = list; paintChat(); });
}
function paintAll() {
  const q = ($('#search').value || '').trim();
  const list = allCache.filter(u => !q || (u.name || '').includes(q)).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.name || '').localeCompare(b.name || '', 'ar'));
  $('#allN').textContent = ar(allCache.length);
  const roleOpts = r => Object.entries(ROLES).filter(([k]) => k !== 'president' || me.role === 'president' || r === 'president').map(([k, v]) => `<option value="${k}" ${k === r ? 'selected' : ''}>${v}</option>`).join('');
  const comOpts = c => `<option value="">—</option>` + COMMITTEES.map(x => `<option value="${x.id}" ${x.id === c ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  $('#allBox').innerHTML = list.map(u => {
    const self = u.uid === me.uid, locked = self || (u.role === 'president' && me.role !== 'president');
    return `<tr data-uid="${esc(u.uid)}"><td><strong>${esc(u.name)}</strong> <span class="badge">${GENDERS[u.gender || 'm']}</span>${u.patrol ? ` <span class="badge">${esc(pname(u.patrol))}</span>` : ''}</td>
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
    { img: 'assets/img/club-logo.jpg', t: 'نادي الجوالة — جامعة أم القرى', en: 'UQU Rover Scouts Club', p: 'نادي طلابي في جامعة أم القرى يجمع الطلاب الجوالة، ينظّم البرامج الكشفية والأنشطة التطوعية، ويشارك في المعسكرات الكشفية، وينظّم فعاليات داخل الجامعة وخارجها.', f: ['جامعة أم القرى', 'فعاليات داخل الجامعة وخارجها'] },
    { img: 'assets/logos/sasa.png', t: 'جمعية الكشافة العربية السعودية', en: 'Saudi Arabian Scouts Association', p: 'الجهة الرسمية التي ترسم الخطة العامة للحركة الكشفية في المملكة وتشرف عليها. أُسست بمرسوم ملكي، ومقرها الرياض، ويرأس مجلس إدارتها وزير التعليم. ومن برامجها المعسكرات الكشفية التي يشارك فيها نادينا.', f: ['تأسست 1381هـ / 1961م', 'عضو عالمي منذ 1963م'] },
    { img: 'assets/logos/mop.png', bg: 'scout', t: 'رسل السلام', en: 'Messengers of Peace', p: 'مبادرة عالمية ضمن المنظمة الكشفية العالمية، وُلدت فكرتها من الملك عبدالله بن عبدالعزيز رحمه الله وملك السويد كارل السادس عشر غوستاف، وأُطلقت رسميًا في جدة. تشجّع الكشافين على خدمة مجتمعاتهم ونشر ثقافة السلام، وجدّدت المملكة دعمها لها عام 2025م بصندوق قدره 50 مليون دولار للعقد القادم.', f: ['أُطلقت في جدة 2011م', 'مبادرة سعودية الأصل'] },
    { img: 'assets/logos/wosm.png', bg: 'scout', t: 'سكاوت — المنظمة الكشفية العالمية', en: 'SCOUTS · World Organization of the Scout Movement', p: 'المظلة الدولية للحركة الكشفية التي تجمع الجمعيات الكشفية الوطنية حول العالم، ومنها جمعيتنا السعودية. يرمز شعارها بزهرة الزنبق إلى الإرشاد ووجهة البوصلة، ويحيط بها حبل معقود بعقدة الريف رمزًا لوحدة الكشافين وأخوّتهم، ويظهر بصيغة «<bdi dir="ltr">SCOUTS Saudi Arabia</bdi>» لأن جمعيتنا عضو فيها.', f: ['نحو 176 جمعية وطنية', 'أكثر من 50 مليون كشاف'] },
    { img: 'assets/img/baden-powell.jpg', photo: true, t: 'مؤسس الحركة: بادن باول', en: 'Lord Robert Baden-Powell', p: 'ضابط بريطاني أسس الحركة الكشفية عام 1907م بأول مخيم كشفي في جزيرة براونسي بإنجلترا، ثم ألّف كتاب «الكشافة للفتيان» عام 1908م الذي نشر الفكرة في العالم كله.', f: ['1907م', 'جزيرة براونسي'] },
  ];
  $('#logoGrid').innerHTML = logos.map(l => `<div class="card lc"><div class="mark ${l.bg || ''}"${l.photo ? ' style="background:#1a2a1d"' : ''}><img src="${l.img}" alt="${l.t}"${l.photo ? ' style="width:120px;height:120px;border-radius:50%;object-fit:cover;max-width:none;border:3px solid #B08B44"' : ''}><div class="ph"></div></div><h3>${l.t}</h3><div class="en">${l.en}</div><p>${l.p}</p><div class="facts">${l.f.map(x => `<span>${x}</span>`).join('')}</div></div>`).join('');
  $('#logoGrid').querySelectorAll('.mark img').forEach(im => { const miss = () => im.parentElement.classList.add('missing'); im.addEventListener('error', miss); if (im.complete && !im.naturalWidth) miss(); });
}

const RENDER = {
  home: () => { renderStats(); renderTweets(); renderHomeAnn(); },
  leaders: renderLeaders, committees: renderCommittees, events: renderEvents, profile: renderProfile, admin: renderAdmin,
  points: renderPoints, chat: renderChat,
};

// ===================== الأحداث =====================
function bind() {
  // التبويبات
  const tab = up => { $('#tabUp').setAttribute('aria-selected', up); $('#tabIn').setAttribute('aria-selected', !up); $('#upForm').hidden = !up; $('#inForm').hidden = up; };
  $('#tabUp').onclick = () => tab(true); $('#tabIn').onclick = () => tab(false);

  // خيارات التسجيل
  $('#upRole').innerHTML = SIGNUP_ROLES.map(r => `<option value="${r}">${r === 'beneficiary' ? 'مستفيد من النادي (بدون لجنة)' : ROLES[r]}</option>`).join('');
  $('#upCom').innerHTML = '<option value="">اختر اللجنة</option>' + COMMITTEES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const syncCom = () => {
    const r = $('#upRole').value, no = NO_COMMITTEE.includes(r), g = $('#upForm').gender.value || 'm';
    $('#upComWrap').hidden = no; $('#upCom').required = !no;
    const showP = r === 'member' || r === 'patrol_leader', keep = $('#upPatrol').value;
    $('#upPatrolWrap').hidden = !showP; $('#upPatrol').required = r === 'patrol_leader';
    $('#upPatrolLbl').textContent = r === 'patrol_leader' ? 'الرهط' : 'الرهط (اختياري)';
    $('#upPatrol').innerHTML = '<option value="">' + (r === 'patrol_leader' ? 'اختر الرهط' : 'بدون رهط') + '</option>' + PATROLS.filter(p => p.g === g).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    if (PATROLS.some(p => p.id === keep && p.g === g)) $('#upPatrol').value = keep;
  };
  $('#upForm').addEventListener('change', e => { if (e.target.name === 'gender') syncCom(); });
  $('#upRole').onchange = syncCom; syncCom();

  $('#upForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, err = $('#upErr'); err.textContent = '';
    const x = xUrl(f.x.value), li = liUrl(f.linkedin.value), role = f.role.value;
    if (x === null) return err.textContent = 'اكتب معرّف X بشكل صحيح، مثل ‎@username';
    if (li === null) return err.textContent = 'رابط LinkedIn غير صحيح.';
    if (!SIGNUP_ROLES.includes(role)) return;
    if (!GENDERS[f.gender.value]) return err.textContent = 'اختر: طالب أو طالبة';
    const college = getCollege(f); if (!college) return err.textContent = 'اختر كليتك أو اكتب اسمها.';
    if (role === 'patrol_leader' && !f.patrol.value) return err.textContent = 'اختر الرهط.';
    const profile = { name: f.name.value.trim(), gender: f.gender.value, college, role, committee: NO_COMMITTEE.includes(role) ? '' : f.committee.value, patrol: (role === 'member' || role === 'patrol_leader') ? f.patrol.value : '', x, linkedin: li, major: f.major.value.trim(), approved: AUTO_APPROVED.includes(role), public: false, createdAt: Date.now() };
    busy(f.querySelector('.btn'), async () => {
      try { await api.signUp({ email: f.email.value.trim(), password: f.password.value, profile }); f.reset(); syncCom(); toast(AUTO_APPROVED.includes(role) ? 'أهلًا بك في نادي الجوالة!' : 'تم التسجيل، وطلبك بانتظار اعتماد رئيس النادي.'); location.hash = 'profile'; }
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
    const data = { name: f.name.value.trim(), x, linkedin: li, college: getCollege(f), major: f.major.value.trim() };
    busy(f.querySelector('.btn'), async () => { try { await api.updateUser(me.uid, data); toast('تم حفظ بياناتك'); } catch (e2) { err.textContent = errMsg(e2); } });
  };
  $('#outBtn').onclick = async () => { await api.signOut(); location.hash = 'home'; toast('تم تسجيل الخروج'); };

  // التغريدات والإعلانات
  $('#twForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, url = postUrl(f.url.value);
    if (!url || !statusId(url)) return toast('الصق رابط التغريدة نفسها، مثل https://x.com/jwalah_uqu/status/123…', true);
    busy(f.querySelector('.btn'), async () => { try { await api.addTweet({ url, text: f.text.value.trim().slice(0, 280), by: me.uid }); f.reset(); $('#twAdd').open = false; renderTweets(); toast('تمت إضافة التغريدة'); } catch (e2) { toast(errMsg(e2), true); } });
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
      else if (d.delPt) { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟'; return; } b.disabled = true; await api.deletePoints(d.delPt); renderPoints(); toast('تم حذف القيد'); }
      else if (d.delChat) { b.disabled = true; await api.deleteChat(d.delChat); }
      else if (d.delTw) { b.disabled = true; await api.deleteTweet(d.delTw); renderTweets(); toast('تم الحذف'); }
      else if (d.delAnn) { b.disabled = true; await api.deleteAnnouncement(d.delAnn); RENDER[current]?.(); toast('تم الحذف'); }
      else if (d.approve) { const u = allCache.find(x => x.uid === d.approve); const full = seatsFull(u, u.role, u.committee); if (full) return toast(full, true); b.disabled = true; await api.updateUser(d.approve, { approved: true, public: LEAD.includes(u.role) }); toast('تم اعتماد ' + u.name); renderAdmin(); }
      else if (d.demote) { b.disabled = true; await api.updateUser(d.demote, { approved: true, role: 'member', public: false }); toast('تم اعتماده كعضو'); renderAdmin(); }
      else if (d.reject) { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟'; return; } b.disabled = true; await api.deleteUser(d.reject); toast('تم الحذف'); renderAdmin(); }
      else if (d.save) {
        const tr = b.closest('tr'), role = tr.querySelector('[data-f=role]').value, committee = tr.querySelector('[data-f=committee]').value;
        const u = allCache.find(x => x.uid === d.save);
        const full = u.approved && seatsFull(u, role, committee); if (full) return toast(full, true);
        b.disabled = true; await api.updateUser(d.save, { role, committee: NO_COMMITTEE.includes(role) ? '' : committee, public: !!u.approved && LEAD.includes(role) }); toast('تم الحفظ'); renderAdmin();
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
  const syncKind = () => { const m = $('#ptForm').kind.value === 'member'; $('#ptMemberWrap').hidden = !m; $('#ptComWrap').hidden = m; $('#ptMember').required = m; };
  $('#ptForm').addEventListener('change', e => { if (e.target.name === 'kind') syncKind(); }); syncKind();
  $('#ptForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, amount = parseInt(f.amount.value, 10);
    if (!amount || Math.abs(amount) > 100) return toast('اكتب عدد نقاط بين 1 و 100 (أو بالسالب للخصم)', true);
    let entry;
    if (f.kind.value === 'member') {
      const u = ptUsers.find(x => x.uid === f.member.value); if (!u) return toast('اختر العضو', true);
      entry = { kind: 'member', uid: u.uid, name: u.name, committee: u.committee };
    } else entry = { kind: 'committee', committee: f.committee.value };
    busy(f.querySelector('.btn'), async () => { try { await api.addPoints({ ...entry, amount, reason: f.reason.value.trim(), by: me.name }); f.reason.value = ''; toast('تم تسجيل النقاط'); renderPoints(); } catch (e2) { toast(errMsg(e2), true); } });
  };
  $('#chatForm').onsubmit = e => {
    e.preventDefault(); const f = e.target, text = f.text.value.trim(); if (!text) return;
    busy(f.querySelector('.btn'), async () => { try { await api.sendChat({ uid: me.uid, name: me.name, role: me.role, gender: me.gender || 'm', text: text.slice(0, 500) }); f.reset(); $('#chatBox').scrollTop = $('#chatBox').scrollHeight; } catch (e2) { toast(errMsg(e2), true); } });
  };
  $('#chatForm').text.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatForm').requestSubmit(); } });
  $('#twNext').onclick = () => { clearInterval(twTimer); twGo(twIdx + 1); };
  $('#twPrev').onclick = () => { clearInterval(twTimer); twGo(twIdx - 1); };
  $('#twTrack').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') twGo(twIdx + 1); if (e.key === 'ArrowRight') twGo(twIdx - 1); });
  $('#twTrack').addEventListener('pointerdown', () => clearInterval(twTimer));
  $('#twTrack').addEventListener('mouseenter', () => clearInterval(twTimer));
  addEventListener('hashchange', route);
}

// ===================== التشغيل =====================
(async () => {
  renderAboutOnce(); bind();
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey) {
    try { api = await FirebaseBackend(cfg); console.info('[jwalah] متصل بـ Firebase:', cfg.projectId); }
    catch (e) { console.error('[jwalah] فشل تحميل Firebase', e); toast('تعذّر الاتصال بالخادم، تأكد من الإنترنت وحدّث الصفحة', true); return; }
  } else { api = DemoBackend(); console.warn('[jwalah] وضع تجريبي: firebase-config.js فاضي أو غير موجود'); }
  let first = true;
  api.onAuth(u => { me = u; paintNav(); if (first) { first = false; route(); } else route(); });
})();
}
