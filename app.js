const TEST_SIZE = 40;    // số câu của một đề kiểm tra
const TEST_MIN = 50;     // thời gian làm bài (phút)
const PASS = 5;          // điểm đạt (thang 10)
// Chế độ ôn tập: số câu người học tự chọn khi bấm vào một môn
const REVIEW_SIZES = [[20, 'Ôn nhanh'], [40, 'Vừa phải'], [60, 'Đầy đủ']];
const CONTACT_MAIL = 'tienlap31cm@gmail.com';
const $ = s => document.querySelector(s);

// Nhóm và ký hiệu của từng môn (môn mới thêm vào sẽ rơi vào nhóm "Khác")
const META = {
  'Nhập môn công nghệ thông tin': ['Nền tảng', 'IT'],
  'Kiến trúc máy tính': ['Nền tảng', 'CPU'],
  'Hệ điều hành': ['Nền tảng', 'OS'],
  'Kỹ thuật lập trình': ['Lập trình', 'C'],
  'Cấu trúc dữ liệu và giải thuật': ['Lập trình', 'DSA'],
  'Lập trình hướng đối tượng': ['Lập trình', 'OOP'],
  'Thiết kế Web': ['Lập trình', 'WEB'],
  'Lập trình ứng dụng trên Windows': ['Lập trình', 'WIN'],
  'Mạng máy tính': ['Mạng và hệ thống', 'NET'],
  'Điện toán đám mây': ['Mạng và hệ thống', 'CLD'],
  'Phân tích và thiết kế hệ thống thông tin': ['Mạng và hệ thống', 'UML'],
  'Cơ sở dữ liệu': ['Dữ liệu', 'SQL'],
  'Thống kê và phân tích dữ liệu': ['Dữ liệu', 'STAT']
};
const COLORS = { 'Nền tảng': '#0e7c86', 'Lập trình': '#4b5bd6', 'Mạng và hệ thống': '#c46a0c', 'Dữ liệu': '#b03a6b', 'Khác': '#58697a' };
const SPEC = {
  review: [
    ['Số câu', 'Tự chọn 20, 40 hoặc 60 câu khi bắt đầu'],
    ['Thời gian', 'Không giới hạn'],
    ['Kết quả', 'Hiện đáp án đúng sau mỗi câu, cuối bài giải thích các câu sai']
  ],
  test: [
    ['Số câu', `${TEST_SIZE} câu rút ngẫu nhiên từ ngân hàng`],
    ['Thời gian', `${TEST_MIN} phút`],
    ['Kết quả', 'Điểm thang 10, xem đáp án sau khi nộp bài']
  ]
};

const subjects = [...new Set(questionBank.map(q => q.subject))];
const metaOf = s => META[s] || ['Khác', s.slice(0, 3).toUpperCase()];
const cats = ['Tất cả', ...new Set(subjects.map(s => metaOf(s)[0]))];
let mode = 'review', cat = 'Tất cả', st = null, timer = null, tab = 'wrong', user = null;

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua nếu bị chặn */ } }
};
// Lịch sử và điểm cao nhất lưu riêng theo tài khoản đang đăng nhập (khách dùng khóa chung)
const ustore = {
  key: k => (user ? `${k}:${user.email}` : k),
  get(k, d) { return store.get(this.key(k), d); },
  set(k, v) { store.set(this.key(k), v); }
};
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const fmt = n => n.toFixed(1).replace('.', ',');
const mmss = ms => {
  const s = Math.ceil(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
const modeName = m => (m === 'test' ? 'Kiểm tra' : 'Ôn tập');

function setActive(id) {
  document.querySelectorAll('[data-go]').forEach(a => {
    const on = a.dataset.go === id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
}
const show = id => {
  ['home', 'quiz', 'result'].forEach(v => ($('#' + v).hidden = v !== id));
  if (id !== 'home') setActive(null);
  window.scrollTo(0, 0);
};

/* ---------- Trang chủ ---------- */
function renderHome() {
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  const dl = $('#spec');
  dl.innerHTML = '';
  SPEC[mode].forEach(([k, v]) => { const d = el('div'); d.append(el('dt', k), el('dd', v)); dl.append(d); });

  const chips = $('#chips');
  chips.innerHTML = '';
  cats.forEach(c => {
    const b = el('button', c, 'chip');
    b.setAttribute('aria-pressed', c === cat);
    b.onclick = () => { cat = c; renderHome(); };
    chips.append(b);
  });

  const raw = $('#search').value.trim();
  const q = norm(raw);
  const list = subjects.filter(s => (cat === 'Tất cả' || metaOf(s)[0] === cat) && norm(s).includes(q));
  $('#count').textContent = `${list.length}/${subjects.length} môn học`;
  $('#empty').hidden = list.length > 0;
  $('#empty').textContent = `Không tìm thấy môn học nào khớp với "${raw}". Hãy thử từ khóa khác hoặc chọn nhóm "Tất cả".`;

  const best = ustore.get('best', {});
  const grid = $('#grid');
  grid.innerHTML = '';
  list.forEach(s => {
    const [c, ab] = metaOf(s);
    const b = el('button', undefined, 'card');
    b.style.setProperty('--c', COLORS[c]);
    b.append(el('span', ab, 'mono'), el('strong', s));
    // Không hiện quy mô ngân hàng câu hỏi; chế độ ôn tập chỉ cho chọn số câu khi bấm vào môn
    if (mode === 'test') b.append(el('span', `${TEST_SIZE} câu · ${TEST_MIN} phút`, 'meta'));
    if (best[s] !== undefined) b.append(el('span', `Điểm cao nhất ${fmt(best[s])}/10`, 'best'));
    b.append(el('span', mode === 'test' ? 'Vào làm bài' : 'Bắt đầu ôn tập', 'go'));
    b.onclick = () => (mode === 'test' ? start(s, 'test') : pickCount(s));
    grid.append(b);
  });
  renderHistory();
}

function renderHistory() {
  $('#histSub').textContent = user
    ? `Lịch sử của tài khoản ${user.name}, lưu trên trình duyệt này.`
    : 'Đăng nhập để lưu lịch sử riêng theo tài khoản. Khi chưa đăng nhập, lịch sử lưu chung trên trình duyệt này.';
  const hist = ustore.get('history', []);
  const body = $('#histBody');
  body.innerHTML = '';
  hist.slice(0, 8).forEach(h => {
    const tr = el('tr');
    [h.s, modeName(h.m), fmt(h.sc), `${h.r} - ${h.w} - ${h.b}`, mmss(h.t), new Date(h.d).toLocaleDateString('vi-VN')]
      .forEach((v, i) => tr.append(el('td', v, i === 2 ? 'sc' : undefined)));
    body.append(tr);
  });
  $('#histTable').hidden = hist.length === 0;
  $('#histEmpty').hidden = hist.length > 0;
}

/* ---------- Làm bài ---------- */
// Mỗi lần gọi start() đều rút lại câu hỏi và xáo lại đáp án nên đề luôn khác nhau
function start(subject, m, count) {
  const doShuffle = $('#optShuffle').checked;
  const pool = shuffle(questionBank.filter(q => q.subject === subject));
  const n = m === 'test' ? TEST_SIZE : (count || REVIEW_SIZES[0][0]);
  const items = pool.slice(0, n).map(q => {
    const opts = q.options.map((t, i) => ({ t, ok: i === q.answer }));
    return { text: q.question, opts: doShuffle ? shuffle(opts) : opts, explain: q.explain || '', pick: null, flag: false };
  });
  const now = Date.now();
  st = { subject, mode: m, count: n, items, cur: 0, t0: now, end: now + TEST_MIN * 60000 };
  clearInterval(timer);
  $('#qSubject').textContent = subject;
  $('#qMode').textContent = modeName(m) + (m === 'review' ? ` · ${items.length} câu` : '');
  $('#timer').hidden = m !== 'test';
  $('#submit').textContent = m === 'test' ? 'Nộp bài' : 'Kết thúc';
  if (m === 'test') { tick(); timer = setInterval(tick, 500); }
  show('quiz');
  renderQuiz();
}

function tick() {
  const left = Math.max(0, st.end - Date.now());
  const t = $('#timer');
  t.textContent = mmss(left);
  t.classList.toggle('low', left <= 5 * 60000);
  if (left === 0) finish(true);
}

function pick(i) {
  const it = st.items[st.cur];
  if (st.mode === 'review' && it.pick !== null) return;
  it.pick = i;
  renderQuiz();
}

function renderQuiz() {
  const it = st.items[st.cur], total = st.items.length;
  const locked = st.mode === 'review' && it.pick !== null;
  $('#qCount').textContent = `Câu ${st.cur + 1} / ${total}`;
  $('#qText').textContent = it.text;
  $('#flag').textContent = it.flag ? 'Bỏ đánh dấu' : 'Đánh dấu xem lại';
  $('#clear').hidden = st.mode === 'review';
  const box = $('#opts');
  box.innerHTML = '';
  it.opts.forEach((o, i) => {
    const b = el('button', undefined, 'opt');
    b.append(el('span', String.fromCharCode(65 + i), 'key'), el('span', o.t));
    if (it.pick === i) b.classList.add('sel');
    if (locked) {
      b.disabled = true;
      if (o.ok) b.classList.add('ok');
      else if (it.pick === i) b.classList.add('bad');
    }
    b.onclick = () => pick(i);
    box.append(b);
  });
  $('#prev').disabled = st.cur === 0;
  $('#next').disabled = st.cur === total - 1;
  const done = st.items.filter(x => x.pick !== null).length;
  $('#doneText').textContent = `Đã làm ${done}/${total} câu`;
  $('#progBar').style.width = (done / total * 100) + '%';
  const grid = $('#grid2');
  grid.innerHTML = '';
  st.items.forEach((x, i) => {
    const b = el('button', i + 1);
    if (x.pick !== null) b.classList.add('done');
    if (x.flag) b.classList.add('flag');
    if (i === st.cur) b.classList.add('cur');
    b.onclick = () => { st.cur = i; renderQuiz(); };
    grid.append(b);
  });
}

/* ---------- Kết quả ---------- */
function finish(auto) {
  const blank = st.items.filter(x => x.pick === null).length;
  if (!auto && blank && !confirm(`Còn ${blank} câu chưa trả lời. Bạn vẫn muốn nộp bài?`)) return;
  clearInterval(timer);
  const total = st.items.length;
  const right = st.items.filter(x => x.pick !== null && x.opts[x.pick].ok).length;
  const wrong = total - right - blank;
  const score = right / total * 10;
  const used = Math.min(Date.now(), st.end) - st.t0;
  const rounded = Math.round(score * 10) / 10;

  const hist = ustore.get('history', []);
  hist.unshift({ s: st.subject, m: st.mode, sc: rounded, r: right, w: wrong, b: blank, t: used, d: Date.now() });
  ustore.set('history', hist.slice(0, 30));
  if (st.mode === 'test') {
    const best = ustore.get('best', {});
    if (!(best[st.subject] >= rounded)) { best[st.subject] = rounded; ustore.set('best', best); }
  }

  const band = score >= 8 ? 'Giỏi' : score >= 6.5 ? 'Khá' : score >= PASS ? 'Đạt' : 'Chưa đạt';
  $('#rTitle').textContent = st.subject;
  $('#rScore').textContent = fmt(score);
  $('#ring').style.setProperty('--p', score * 10);
  $('#rBand').textContent = `Xếp loại: ${band}. ${modeName(st.mode)}.` + (auto ? ' Hết giờ nên bài được nộp tự động.' : '');
  $('#sRight').textContent = right;
  $('#sWrong').textContent = wrong;
  $('#sBlank').textContent = blank;
  $('#sTime').textContent = mmss(used);
  tab = total - right > 0 ? 'wrong' : 'all';
  renderReview();
  show('result');
}

function renderReview() {
  document.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === tab));
  const ol = $('#review');
  ol.innerHTML = '';
  st.items.forEach((x, i) => {
    const good = x.pick !== null && x.opts[x.pick].ok;
    if (tab === 'wrong' && good) return;
    const li = el('li');
    li.append(el('p', `Câu ${i + 1}`, 'qn'), el('p', x.text, 'wq'));
    x.opts.forEach((o, k) => {
      const r = el('div', String.fromCharCode(65 + k) + '. ' + o.t, 'ro');
      if (o.ok) r.classList.add('ok');
      else if (x.pick === k) r.classList.add('bad');
      li.append(r);
    });
    if (x.pick === null) li.append(el('p', 'Bạn chưa trả lời câu này.', 'blank'));
    // Chế độ ôn tập: giải thích vì sao các câu trả lời sai (hoặc bỏ trống)
    if (st.mode === 'review' && !good) {
      const why = el('div', undefined, 'why');
      const right = x.opts.find(o => o.ok).t;
      why.append(el('p', 'Vì sao chưa đúng', 'whyt'));
      why.append(el('p', x.pick === null
        ? `Đáp án đúng là “${right}”.`
        : `Bạn chọn “${x.opts[x.pick].t}”, trong khi đáp án đúng là “${right}”.`));
      if (x.explain) why.append(el('p', x.explain));
      li.append(why);
    }
    ol.append(li);
  });
  if (!ol.children.length) ol.append(el('li', 'Bạn đã trả lời đúng tất cả các câu.'));
}

/* ---------- Điều hướng ---------- */
function goHome() {
  clearInterval(timer);
  show('home');
  renderHome();
}

function navTo(id) {
  if ($('#home').hidden) {
    if (!$('#quiz').hidden && !confirm('Thoát và bỏ bài làm hiện tại?')) return;
    goHome();
  }
  if (id === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
  else $('#' + id).scrollIntoView({ behavior: 'smooth' });
}

function spy() {
  if ($('#home').hidden) return;
  let cur = 'home';
  ['subjects', 'history', 'guide', 'contact'].forEach(id => { if ($('#' + id).getBoundingClientRect().top <= 120) cur = id; });
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = 'contact';
  setActive(cur);
}

/* ---------- Chọn số câu khi ôn tập ---------- */
function pickCount(subject) {
  $('#pickSubject').textContent = subject;
  const box = $('#picks');
  box.innerHTML = '';
  REVIEW_SIZES.forEach(([n, label]) => {
    const b = el('button', undefined, 'pick');
    b.type = 'button';
    b.append(el('strong', `${n} câu`), el('span', label));
    b.onclick = () => { $('#pickDlg').close(); start(subject, 'review', n); };
    box.append(b);
  });
  $('#pickDlg').showModal();
}

/* ---------- Tài khoản giả lập ----------
   Không có máy chủ: tài khoản chỉ lưu trong localStorage của trình duyệt để minh họa luồng
   đăng ký / đăng nhập. Mật khẩu không lưu dạng chữ thường mà băm SHA-256 kèm muối ngẫu nhiên. */
const randSalt = () => {
  const a = new Uint8Array(8);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); });
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
};
async function hashPw(pw, salt) {
  const data = new TextEncoder().encode(salt + ':' + pw);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;               // dự phòng khi trình duyệt không có SubtleCrypto
  data.forEach(b => { h = ((h * 33) ^ b) >>> 0; });
  return 'x' + h.toString(16);
}
const validEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

function renderUser() {
  $('#guestBox').hidden = !!user;
  $('#userBox').hidden = !user;
  if (user) {
    $('#userName').textContent = user.name;
    $('#avatar').textContent = user.name.trim().charAt(0).toUpperCase();
  }
  renderHome();
}

function showErr(form, msg) {
  const p = form.querySelector('.err');
  p.textContent = msg;
  p.hidden = !msg;
}

function openAuth(which) {
  const login = which === 'login';
  $('#formLogin').hidden = !login;
  $('#formRegister').hidden = login;
  $('#authTitle').textContent = login ? 'Đăng nhập' : 'Tạo tài khoản';
  $('#authSub').textContent = login
    ? 'Đăng nhập để lưu lịch sử và điểm cao nhất riêng cho bạn.'
    : 'Tài khoản chỉ lưu trên trình duyệt này (giả lập, không có máy chủ).';
  [$('#formLogin'), $('#formRegister')].forEach(f => { f.reset(); showErr(f, ''); });
  if (!$('#authDlg').open) $('#authDlg').showModal();
  (login ? $('#formLogin') : $('#formRegister')).querySelector('input').focus();
}

async function doRegister(e) {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f));
  const name = v.name.trim().replace(/\s+/g, ' '), email = v.email.trim().toLowerCase();
  if (name.length < 2) return showErr(f, 'Vui lòng nhập họ và tên.');
  if (!validEmail(email)) return showErr(f, 'Email chưa đúng định dạng, ví dụ: ten@example.com.');
  if (v.password.length < 6) return showErr(f, 'Mật khẩu cần có ít nhất 6 ký tự.');
  if (v.password !== v.confirm) return showErr(f, 'Hai lần nhập mật khẩu chưa khớp.');
  const users = store.get('users', []);
  if (users.some(u => u.email === email)) return showErr(f, 'Email này đã được đăng ký. Hãy đăng nhập.');
  const salt = randSalt();
  users.push({ name, email, salt, hash: await hashPw(v.password, salt), created: Date.now() });
  store.set('users', users);
  store.set('session', email);
  user = { name, email };
  $('#authDlg').close();
  renderUser();
  toast(`Đăng ký thành công. Xin chào ${name}!`);
}

async function doLogin(e) {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f));
  const email = v.email.trim().toLowerCase();
  if (!validEmail(email) || !v.password) return showErr(f, 'Vui lòng nhập email và mật khẩu.');
  const u = store.get('users', []).find(x => x.email === email);
  if (!u || u.hash !== await hashPw(v.password, u.salt)) return showErr(f, 'Email hoặc mật khẩu không đúng.');
  store.set('session', email);
  user = { name: u.name, email: u.email };
  $('#authDlg').close();
  renderUser();
  toast(`Đăng nhập thành công. Xin chào ${u.name}!`);
}

function restoreSession() {
  const email = store.get('session', null);
  const u = email && store.get('users', []).find(x => x.email === email);
  user = u ? { name: u.name, email: u.email } : null;
}

/* ---------- Liên hệ ---------- */
// Không có máy chủ nên biểu mẫu mở ứng dụng email của người dùng với nội dung điền sẵn
$('#contactForm').onsubmit = e => {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f));
  const name = v.name.trim(), email = v.email.trim(), msg = v.msg.trim();
  if (!name || !validEmail(email) || !msg) return showErr(f, 'Vui lòng nhập đủ họ tên, email hợp lệ và nội dung góp ý.');
  showErr(f, '');
  const subject = `[Trắc nghiệm CNTT] Góp ý từ ${name}`;
  const body = `${msg}\n\n— ${name} (${email})`;
  location.href = `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  toast('Đang mở ứng dụng email của bạn…');
};

/* ---------- Sự kiện ---------- */
document.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { mode = b.dataset.mode; renderHome(); }; });
document.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { tab = b.dataset.f; renderReview(); }; });
document.querySelectorAll('[data-go]').forEach(a => { a.onclick = e => { e.preventDefault(); navTo(a.dataset.go); }; });
$('#search').oninput = renderHome;
$('#prev').onclick = () => { st.cur--; renderQuiz(); };
$('#next').onclick = () => { st.cur++; renderQuiz(); };
$('#clear').onclick = () => { st.items[st.cur].pick = null; renderQuiz(); };
$('#flag').onclick = () => { st.items[st.cur].flag = !st.items[st.cur].flag; renderQuiz(); };
$('#submit').onclick = () => finish(false);
$('#quit').onclick = () => { if (confirm('Thoát và bỏ bài làm hiện tại?')) goHome(); };
$('#again').onclick = () => start(st.subject, st.mode, st.count);
$('#home2').onclick = goHome;
$('#clearHist').onclick = () => {
  if (!ustore.get('history', []).length) return;
  if (confirm('Xóa toàn bộ lịch sử làm bài của bạn trên trình duyệt này?')) { ustore.set('history', []); ustore.set('best', {}); renderHome(); }
};
$('#btnLogin').onclick = () => openAuth('login');
$('#btnRegister').onclick = () => openAuth('register');
$('#btnLogout').onclick = () => { store.set('session', null); user = null; renderUser(); toast('Đã đăng xuất.'); };
document.querySelectorAll('[data-auth]').forEach(b => { b.onclick = () => openAuth(b.dataset.auth); });
$('#formLogin').onsubmit = doLogin;
$('#formRegister').onsubmit = doRegister;
// Đóng hộp thoại bằng nút ×, hoặc bấm ra vùng tối bên ngoài
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
});
$('#brand').onclick = e => {
  e.preventDefault();
  if ($('#quiz').hidden) goHome(); else $('#quit').click();
};
document.addEventListener('keydown', e => {
  if ($('#quiz').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  // Đang gõ vào ô nhập hoặc có hộp thoại mở thì không coi là phím tắt làm bài
  if (e.target.closest('input, textarea, select') || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase(), i = 'abcd'.indexOf(k);
  if (i >= 0 && i < st.items[st.cur].opts.length) pick(i);
  else if (k === 'arrowright' && st.cur < st.items.length - 1) { st.cur++; renderQuiz(); }
  else if (k === 'arrowleft' && st.cur > 0) { st.cur--; renderQuiz(); }
});
window.addEventListener('scroll', spy, { passive: true });
window.addEventListener('beforeunload', e => {
  if (st && !$('#quiz').hidden) { e.preventDefault(); e.returnValue = ''; }
});

restoreSession();
renderUser();
spy();
