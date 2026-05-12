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
  switchTo('login');
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

/* ── Map hotspot editor ── */
let editMode = false;
let editTarget = null;

const hotspotMap = {
  village: ['hs-garden','hs-house','hs-library','hs-villhall','hs-monument','hs-postbox','nav-to-city'],
  city:    ['hs-council','hs-detective','hs-haunted','hs-airport',
            'hs-culture','hs-lp','hs-cinema','hs-guest','hs-botanical','nav-to-village'],
};
const NAV_IDS = ['nav-to-city', 'nav-to-village'];

function toggleEditMode(screen) {
  const wasOn = editMode && editTarget === screen;
  if (editMode) {
    hotspotMap[editTarget].forEach(id => disableDragResize(document.getElementById(id)));
    document.getElementById('edit-toggle-' + editTarget).textContent = '✏️ 편집 모드';
    document.getElementById('edit-toggle-' + editTarget).style.background = 'rgba(30,30,80,0.85)';
    editMode = false; editTarget = null;
    document.getElementById('edit-panel').style.display = 'none';
  }
  if (wasOn) return;
  editMode = true; editTarget = screen;
  const btn = document.getElementById('edit-toggle-' + screen);
  btn.textContent = '✏️ 편집 중…';
  btn.style.background = 'rgba(80,30,30,0.9)';
  document.getElementById('edit-panel').style.display = 'block';
  hotspotMap[screen].forEach(id => { try { enableDragResize(document.getElementById(id), screen); } catch(e) {} });
  updateOutput(screen);
}

function updateOutput(screen) {
  const wrap = document.querySelector('#screen-' + screen + ' .map-wrap');
  const W = wrap.offsetWidth, H = wrap.offsetHeight;
  let lines = '';
  hotspotMap[screen].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (NAV_IDS.includes(id)) {
      lines += `/* ${id} */  left:${el.offsetLeft}px; top:${el.offsetTop}px; height:${el.offsetHeight}px;\n`;
    } else {
      const l = (el.offsetLeft / W * 100).toFixed(1);
      const t = (el.offsetTop  / H * 100).toFixed(1);
      const w = (el.offsetWidth  / W * 100).toFixed(1);
      const h = (el.offsetHeight / H * 100).toFixed(1);
      lines += `#${id.padEnd(12)} { left:${l.padStart(5)}%; top:${t.padStart(5)}%; width:${w.padStart(5)}%; height:${h.padStart(5)}%; }\n`;
    }
  });
  document.getElementById('edit-output').textContent = lines;
}

function saveNavPos(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const pos = { left: el.offsetLeft + 'px', top: el.offsetTop + 'px', height: el.offsetHeight + 'px' };
  localStorage.setItem('navpos-' + id, JSON.stringify(pos));
  el.style.left = pos.left; el.style.top = pos.top; el.style.height = pos.height;
  el.style.width = 'auto'; el.style.right = 'auto'; el.style.bottom = 'auto';
}

export function loadNavPositions() {
  NAV_IDS.forEach(id => {
    const raw = localStorage.getItem('navpos-' + id);
    if (!raw) return;
    try {
      const pos = JSON.parse(raw);
      const el  = document.getElementById(id);
      if (!el) return;
      el.style.left = pos.left; el.style.top = pos.top; el.style.height = pos.height;
      el.style.width = 'auto'; el.style.right = 'auto'; el.style.bottom = 'auto';
    } catch(e) {}
  });
}

function copyEditValues() {
  navigator.clipboard.writeText(document.getElementById('edit-output').textContent)
    .then(() => alert('복사됐어요! 클로드에게 붙여넣기 해주세요.'));
}

function enableDragResize(el, screen) {
  el.style.cursor = 'move'; el.style.userSelect = 'none';
  if (NAV_IDS.includes(el.id)) {
    el.style.animation = 'none';
    const wrap     = document.querySelector('#screen-' + screen + ' .map-wrap');
    const rect     = el.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    el.style.right = 'auto'; el.style.bottom = 'auto';
    el.style.left  = (rect.left - wrapRect.left) + 'px';
    el.style.top   = (rect.top  - wrapRect.top)  + 'px';
    el.style.width = 'auto';
  }
  function blockClick(e) { e.stopImmediatePropagation(); e.preventDefault(); }
  el._blockClick = blockClick;
  el.addEventListener('click', blockClick, true);
  el._cleanup = addDragResize(el, screen);
}

function disableDragResize(el) {
  el.style.cursor = ''; el.style.userSelect = '';
  if (NAV_IDS.includes(el.id)) el.style.animation = '';
  if (el._blockClick) { el.removeEventListener('click', el._blockClick, true); el._blockClick = null; }
  if (el._cleanup) el._cleanup();
}

function addDragResize(el, screen) {
  const wrap   = document.querySelector('#screen-' + screen + ' .map-wrap');
  const isNav  = NAV_IDS.includes(el.id);
  const handleParent = isNav ? wrap : el;
  let handle = isNav
    ? wrap.querySelector(`.resize-handle[data-nav="${el.id}"]`)
    : el.querySelector('.resize-handle');
  if (!handle) {
    handle = document.createElement('div');
    handle.className = 'resize-handle';
    if (isNav) handle.dataset.nav = el.id;
    handle.style.cssText = `position:absolute;width:18px;height:18px;background:#aaf;cursor:se-resize;z-index:200;border-top:2px solid #558;border-left:2px solid #558;`;
    handleParent.appendChild(handle);
  }
  handle.style.display = 'block';

  function syncHandle() {
    if (!isNav) return;
    handle.style.left = (el.offsetLeft + el.offsetWidth  - 9) + 'px';
    handle.style.top  = (el.offsetTop  + el.offsetHeight - 9) + 'px';
  }
  syncHandle();

  function onDragStart(e) {
    if (e.target === handle) return;
    e.preventDefault();
    const startX = e.clientX - el.offsetLeft, startY = e.clientY - el.offsetTop;
    function onMove(e) { el.style.left = Math.max(0, e.clientX - startX) + 'px'; el.style.top = Math.max(0, e.clientY - startY) + 'px'; syncHandle(); updateOutput(editTarget); }
    function onUp()   { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (isNav) saveNavPos(el.id); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function onResizeStart(e) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, startH = el.offsetHeight;
    function onMove(e) { el.style.height = Math.max(20, startH + e.clientY - startY) + 'px'; el.style.width = isNav ? 'auto' : Math.max(20, el.offsetWidth + e.clientX - startX) + 'px'; syncHandle(); updateOutput(editTarget); }
    function onUp()   { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (isNav) saveNavPos(el.id); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  if (!isNav) {
    el.style.left = el.offsetLeft + 'px'; el.style.top = el.offsetTop + 'px';
    el.style.width = el.offsetWidth + 'px'; el.style.height = el.offsetHeight + 'px';
  }
  el.addEventListener('mousedown', onDragStart);
  handle.addEventListener('mousedown', onResizeStart);
  return () => {
    el.removeEventListener('mousedown', onDragStart);
    handle.removeEventListener('mousedown', onResizeStart);
    if (isNav) { handle.remove(); } else {
      handle.style.display = 'none';
      const W = wrap.offsetWidth, H = wrap.offsetHeight;
      el.style.left = (el.offsetLeft / W * 100) + '%'; el.style.top = (el.offsetTop / H * 100) + '%';
      el.style.width = (el.offsetWidth / W * 100) + '%'; el.style.height = (el.offsetHeight / H * 100) + '%';
    }
  };
}

window.toggleEditMode  = toggleEditMode;
window.copyEditValues  = copyEditValues;

/* ── Building image editor ── */
const BUILDING_CONFIG = {
  'hs-detective': { w: 88,  h: 88,  x:  4,  bottom:  5 },
  'hs-guest':     { w: 88,  h: 88,  x: -5,  bottom:  9 },
  'hs-cinema':    { w: 88,  h: 100, x: -10, bottom:  7 },
  'hs-lp':        { w: 79,  h: 77,  x:  4,  bottom: 14 },
  'hs-council':   { w: 119, h: 118, x: -5,  bottom: -10 },
  'hs-culture':   { w: 74,  h: 98,  x: -12, bottom: 12 },
  'hs-botanical': { w: 107, h: 98,  x:  5,  bottom:  7 },
  'hs-haunted':   { w: 101, h: 101, x: -5,  bottom:  5 },
  'hs-airport':   { w: 98,  h: 124, x: -8,  bottom:  2 },
};

function applyBuildingConfig(id) {
  const cfg = BUILDING_CONFIG[id];
  const img = document.querySelector('#' + id + ' .hs-building');
  if (!img || !cfg) return;
  const leftPct = (100 - cfg.w) / 2 + cfg.x;
  img.style.width  = cfg.w + '%';
  img.style.height = cfg.h + '%';
  img.style.left   = leftPct + '%';
  img.style.bottom = cfg.bottom + '%';
}
Object.keys(BUILDING_CONFIG).forEach(applyBuildingConfig);

let selectedBuilding = null;
let buildingEditActive = false;

function toggleBuildingEditMode() {
  buildingEditActive = !buildingEditActive;
  const panel = document.getElementById('bld-panel');
  const btn   = document.getElementById('bld-edit-btn');
  if (buildingEditActive) {
    panel.style.display = 'flex'; btn.textContent = '🏠 편집 중…'; btn.style.background = 'rgba(80,30,30,0.9)';
    Object.keys(BUILDING_CONFIG).forEach(id => {
      const img = document.querySelector('#' + id + ' .hs-building');
      if (!img) return;
      img.style.pointerEvents = 'all'; img.style.cursor = 'pointer';
      img._bldClick = (e) => { e.stopPropagation(); e.preventDefault(); selectBuilding(id); };
      img.addEventListener('click', img._bldClick);
    });
    updateBuildingCSS();
  } else {
    panel.style.display = 'none'; btn.textContent = '🏠 건물 편집'; btn.style.background = 'rgba(30,30,80,0.85)';
    if (selectedBuilding) { const prev = document.querySelector('#' + selectedBuilding + ' .hs-building'); if (prev) prev.style.outline = ''; }
    selectedBuilding = null;
    document.getElementById('bld-title').textContent = '—';
    Object.keys(BUILDING_CONFIG).forEach(id => {
      const img = document.querySelector('#' + id + ' .hs-building');
      if (!img) return;
      img.style.pointerEvents = ''; img.style.cursor = ''; img.style.outline = '';
      if (img._bldClick) { img.removeEventListener('click', img._bldClick); img._bldClick = null; }
    });
  }
}

function selectBuilding(id) {
  if (selectedBuilding) { const prev = document.querySelector('#' + selectedBuilding + ' .hs-building'); if (prev) prev.style.outline = ''; }
  selectedBuilding = id;
  const img = document.querySelector('#' + id + ' .hs-building');
  if (img) img.style.outline = '3px solid #fa8';
  const cfg = BUILDING_CONFIG[id];
  document.getElementById('bld-title').textContent = id.replace('hs-', '');
  document.getElementById('bld-w').value      = cfg.w;
  document.getElementById('bld-h').value      = cfg.h;
  document.getElementById('bld-x').value      = cfg.x;
  document.getElementById('bld-bottom').value = cfg.bottom;
  document.getElementById('bld-w-val').textContent      = cfg.w;
  document.getElementById('bld-h-val').textContent      = cfg.h;
  document.getElementById('bld-x-val').textContent      = cfg.x;
  document.getElementById('bld-bottom-val').textContent = cfg.bottom;
}

function onBldSlider(prop, val) {
  if (!selectedBuilding) return;
  BUILDING_CONFIG[selectedBuilding][prop] = parseFloat(val);
  applyBuildingConfig(selectedBuilding);
  document.getElementById('bld-' + prop + '-val').textContent = val;
  updateBuildingCSS();
}

function updateBuildingCSS() {
  let css = '/* 아래 CSS를 <style> 안에 추가하세요 */\n';
  Object.entries(BUILDING_CONFIG).forEach(([id, cfg]) => {
    const leftPct = ((100 - cfg.w) / 2 + cfg.x).toFixed(1);
    css += `#${id} .hs-building { width:${cfg.w}%; height:${cfg.h}%; left:${leftPct}%; bottom:${cfg.bottom}%; }\n`;
  });
  document.getElementById('bld-css').textContent = css;
}

function copyBuildingCSS() {
  navigator.clipboard.writeText(document.getElementById('bld-css').textContent)
    .then(() => alert('복사됐어요! <style> 안에 붙여넣기 하세요.'));
}

window.toggleBuildingEditMode = toggleBuildingEditMode;
window.onBldSlider             = onBldSlider;
window.copyBuildingCSS         = copyBuildingCSS;

/* ── Init ── */
loadNavPositions();
checkInviteLink();
NV_AUTH.init();
