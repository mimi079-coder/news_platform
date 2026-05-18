import { NV_AUTH, kakaoLogin } from './auth.js';
import { syncToSupabase, checkInviteLink } from './supabase.js';
import { updateTree, updateBagUI, openBoutiqueModal, canCollect, collectNutrient, feedSet, feedOneNutrient } from './tree.js';

/* ── Shared state ── */
window.appState = {
  currentUser: localStorage.getItem('nv_user') || null,
};

/* ── Screens ── */
const screens = {
  login:     document.getElementById('screen-login'),
  mailbox:   document.getElementById('screen-mailbox'),
  mbook:     document.getElementById('screen-mbook'),
  village:   document.getElementById('screen-village'),
  city:      document.getElementById('screen-city'),
  myhouse:   document.getElementById('screen-myhouse'),
  house:     document.getElementById('screen-house'),
  friends:   document.getElementById('screen-friends'),
  gwangjang: document.getElementById('screen-gwangjang'),
  library:   document.getElementById('screen-library'),
};
const overlay = document.getElementById('transition');

export function switchTo(name) {
  overlay.classList.add('fade');
  setTimeout(() => {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    overlay.classList.remove('fade');
    if (name === 'mbook') initReadTracking();
    if (name === 'myhouse') updateTree();
  }, 350);
}
window.switchTo = switchTo;

/* ── Bypass helper for back-navigation from friends screen ── */
function friendsGoBack() {
  overlay.classList.remove('fade'); // reset stuck transition if any
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens.village.classList.add('active');
}
window.friendsGoBack = friendsGoBack;

/* ── Skip login if already logged in ── */
if (window.appState.currentUser) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens.mailbox.classList.add('active');
}

/* ── Navigation shortcuts ── */
function showMbook()   { switchTo('mbook'); }
function goToVillage() { switchTo('village'); }
function goToCity()    { switchTo('city'); }
function lpBrowse()    { switchTo('village'); }
window.showMbook   = showMbook;
window.goToVillage = goToVillage;
window.goToCity    = goToCity;
window.lpBrowse    = lpBrowse;

/* ── Sign popup ── */
function openSignPopup()  { document.getElementById('sign-popup-overlay').classList.add('open'); }
function closeSignPopup() { document.getElementById('sign-popup-overlay').classList.remove('open'); }
window.openSignPopup  = openSignPopup;
window.closeSignPopup = closeSignPopup;

/* ── Airport ── */
function showWaterToast(msg, color) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:${color};color:#fff;padding:12px 28px;
    font-family:'Press Start 2P',monospace;font-size:9px;letter-spacing:1px;
    border-radius:3px;z-index:9999;white-space:nowrap;
    box-shadow:0 4px 16px rgba(0,0,0,0.4);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function openAirport() {
  const user = window.appState.currentUser;
  if (!user) {
    window.open('https://mimi079-coder.github.io/global/', '_blank');
    return;
  }
  if (!canCollect('hs-airport')) {
    showWaterToast('💧 오늘 이미 물을 받았어요!', '#888');
  } else {
    collectNutrient('hs-airport');
    showWaterToast('💧 물을 받았어요! 가방에 담겼습니다.', '#3a7abf');
  }
  window.open('https://mimi079-coder.github.io/global/', '_blank');
}
window.openAirport = openAirport;

/* ── General modal ── */
function openModal(title, body) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body.replace(/\n/g, '<br>');
  document.getElementById('modal-nutrient').style.display = 'none';
  document.getElementById('modal-bg').classList.add('open');
}
function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
}
document.getElementById('modal-bg').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-bg')) closeModal();
});
window.openModal  = openModal;
window.closeModal = closeModal;

/* ── Help modal ── */
function openHelp()  { document.getElementById('help-bg').classList.add('open'); }
function closeHelp() { document.getElementById('help-bg').classList.remove('open'); }
document.getElementById('help-bg').addEventListener('click', e => {
  if (e.target === document.getElementById('help-bg')) closeHelp();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeAuth(); closeHelp(); }
});
window.openHelp  = openHelp;
window.closeHelp = closeHelp;

/* ── Read tracking (M북) ── */
function todayKey(user) {
  return `nv_reads_${user}_${new Date().toISOString().split('T')[0]}`;
}
function getReadIndices() {
  const user = window.appState.currentUser;
  if (!user) return [];
  return JSON.parse(localStorage.getItem(todayKey(user)) || '[]');
}
function markRead(idx) {
  const user = window.appState.currentUser;
  if (!user) return;
  const reads = getReadIndices();
  if (reads.includes(idx)) return;
  reads.push(idx);
  localStorage.setItem(todayKey(user), JSON.stringify(reads));
  updateReadUI();
}
function updateReadUI() {
  const reads = getReadIndices();
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById('ri-' + i);
    if (el) el.textContent = reads.includes(i) ? '✓ 읽음' : '';
  }
}

let readObserver = null;
const readTimers = {};

function initReadTracking() {
  const user = window.appState.currentUser;
  if (!user) return;
  updateReadUI();
  if (readObserver) readObserver.disconnect();
  readObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const idx = parseInt(entry.target.dataset.idx);
      if (entry.isIntersecting) {
        if (readTimers[idx] === undefined) {
          readTimers[idx] = setTimeout(() => { markRead(idx); delete readTimers[idx]; }, 10000);
        }
      } else {
        if (readTimers[idx] !== undefined) { clearTimeout(readTimers[idx]); delete readTimers[idx]; }
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.news-item[data-idx]').forEach(el => readObserver.observe(el));
}

/* ── Nickname ── */
function getNickname(user) {
  return localStorage.getItem('nv_nick_' + user) || user;
}

/* ── My house / garden ── */
function goToMyHouse() {
  const user = window.appState.currentUser;
  document.getElementById('mh-username').textContent = getNickname(user) + '님의 나무';
  updateTree();
  updateBagUI();
  switchTo('myhouse');
}
function goAfterMbook() { switchTo('village'); }

function openGarden() {
  if (window.appState.currentUser) goToMyHouse();
  else openAuth();
}
function openHouseArea() {
  const user = window.appState.currentUser;
  if (user) {
    document.getElementById('house-nickname').textContent = getNickname(user);
    document.getElementById('house-account').textContent = user;
    cancelNickEdit();
    switchTo('house');
  } else {
    openAuth();
  }
}
window.goToMyHouse   = goToMyHouse;
window.goAfterMbook  = goAfterMbook;
window.openGarden    = openGarden;
window.openHouseArea = openHouseArea;

/* ── Nick edit ── */
function startNickEdit() {
  document.getElementById('house-nick-view').style.display = 'none';
  const form = document.getElementById('house-nick-form');
  form.style.display = 'flex';
  document.getElementById('house-nick-input').value = getNickname(window.appState.currentUser);
  document.getElementById('house-nick-error').textContent = '';
  document.getElementById('house-nick-input').focus();
}
function cancelNickEdit() {
  document.getElementById('house-nick-form').style.display = 'none';
  document.getElementById('house-nick-view').style.display = 'flex';
}
function saveNick() {
  const input = document.getElementById('house-nick-input').value.trim();
  const errEl = document.getElementById('house-nick-error');
  if (!input) { errEl.textContent = '닉네임을 입력해 주세요.'; return; }
  if (input.length < 2) { errEl.textContent = '닉네임은 2자 이상이어야 합니다.'; return; }
  const user = window.appState.currentUser;
  localStorage.setItem('nv_nick_' + user, input);
  document.getElementById('house-nickname').textContent = input;
  document.getElementById('mh-username').textContent = input + '님의 나무';
  cancelNickEdit();
}
window.startNickEdit  = startNickEdit;
window.cancelNickEdit = cancelNickEdit;
window.saveNick       = saveNick;

/* ── Logout ── */
function logout() {
  NV_AUTH.logout();
  window.appState.currentUser = null;
  localStorage.removeItem('nv_user');
  if (readObserver) { readObserver.disconnect(); readObserver = null; }
  location.reload();
}
window.logout = logout;

/* ── Auth forms ── */
function openAuth()  { switchTo('login'); }
function closeAuth() { document.getElementById('auth-bg').classList.remove('open'); }
window.openLoginModal = openAuth;
window.openAuth  = openAuth;
window.closeAuth = closeAuth;

document.getElementById('auth-bg').addEventListener('click', e => {
  if (e.target === document.getElementById('auth-bg')) closeAuth();
});

function switchTab(tab) {
  document.getElementById('form-login').style.display  = tab === 'login'  ? 'flex' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'flex' : 'none';
  document.getElementById('tab-login').classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}
function toggleConsentDetail() {
  const el  = document.getElementById('consent-detail');
  const btn = document.querySelector('.consent-detail-btn');
  const open = el.style.display === 'block';
  el.style.display = open ? 'none' : 'block';
  btn.textContent  = open ? '자세히 보기 ▾' : '접기 ▴';
}
window.switchTab           = switchTab;
window.toggleConsentDetail = toggleConsentDetail;

function doLogin(e) {
  e.preventDefault();
  const id     = document.getElementById('login-id').value.trim();
  const pw     = document.getElementById('login-pw').value;
  const stored = localStorage.getItem('nv_pw_' + id);
  if (!stored) { document.getElementById('login-error').textContent = '존재하지 않는 아이디입니다.'; return; }
  if (stored !== pw) { document.getElementById('login-error').textContent = '비밀번호가 올바르지 않습니다.'; return; }
  window.appState.currentUser = id;
  localStorage.setItem('nv_user', id);
  NV_AUTH.syncFromExisting();
  closeAuth();
  goToMyHouse();
}
function doSignup(e) {
  e.preventDefault();
  const id  = document.getElementById('signup-id').value.trim();
  const pw  = document.getElementById('signup-pw').value;
  const pw2 = document.getElementById('signup-pw2').value;
  const err = document.getElementById('signup-error');
  if (id.length < 2)  { err.textContent = '아이디는 2자 이상이어야 합니다.'; return; }
  if (pw.length < 4)  { err.textContent = '비밀번호는 4자 이상이어야 합니다.'; return; }
  if (pw !== pw2)     { err.textContent = '비밀번호가 일치하지 않습니다.'; return; }
  if (localStorage.getItem('nv_pw_' + id)) { err.textContent = '이미 사용 중인 아이디입니다.'; return; }
  localStorage.setItem('nv_pw_' + id, pw);
  window.appState.currentUser = id;
  localStorage.setItem('nv_user', id);
  NV_AUTH.syncFromExisting();
  closeAuth();
  goToMyHouse();
}
window.doLogin  = doLogin;
window.doSignup = doSignup;

/* ── Init ── */
checkInviteLink();
NV_AUTH.init();
