import { sb, syncToSupabase } from './supabase.js';

function onAuthChange() {
  const loggedIn = NV_AUTH.isLoggedIn;
  const user     = NV_AUTH.user;

  document.querySelectorAll('[data-auth="guest-only"]').forEach(el  => { el.style.display = loggedIn ? 'none' : ''; });
  document.querySelectorAll('[data-auth="member-only"]').forEach(el => { el.style.display = loggedIn ? '' : 'none'; });
  document.querySelectorAll('[data-auth="user-display"]').forEach(el => {
    el.textContent = loggedIn ? (user?.nickname || user?.id || '') : '';
  });

  document.querySelectorAll('[data-guest-guard]').forEach(el => {
    if (loggedIn) {
      el.removeAttribute('disabled');
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.title = '';
    } else {
      el.setAttribute('disabled', 'true');
      el.style.opacity = '0.45';
      el.style.pointerEvents = 'none';
      el.title = '로그인 후 이용할 수 있습니다';
    }
  });

  document.querySelectorAll('[data-guest-guard-wrap]').forEach(wrap => {
    const existing = wrap.querySelector('.nv-guest-banner');
    if (!loggedIn) {
      if (!existing) {
        const banner = document.createElement('div');
        banner.className = 'nv-guest-banner';
        banner.innerHTML = `
          <div class="nv-guest-banner-inner">
            <span class="nv-guest-badge">둘러보기 모드</span>
            <span class="nv-guest-msg">글 작성 · 댓글 · 제보 기능은 로그인 후 이용 가능합니다.</span>
            <button class="nv-guest-login-btn" data-auth-action="open-login">마을 입장하기 →</button>
          </div>`;
        wrap.prepend(banner);
        banner.querySelector('[data-auth-action="open-login"]')
          .addEventListener('click', () => window.openLoginModal?.());
      }
    } else {
      if (existing) existing.remove();
    }
  });
}

export const NV_AUTH = {
  user: null, token: null, isLoggedIn: false,

  login(user, token) {
    this.user = user; this.token = token; this.isLoggedIn = true;
    onAuthChange();
  },

  logout() {
    sb.auth.signOut();
    this.user = null; this.token = null; this.isLoggedIn = false;
    onAuthChange();
  },

  syncFromExisting() {
    const id = localStorage.getItem('nv_user');
    const nick = id ? localStorage.getItem('nv_nick_' + id) || id : null;
    this.user = id ? { id, nickname: nick } : null;
    this.isLoggedIn = !!id;
    this.token = id ? 'nv_local' : null;
    onAuthChange();
  },

  async init() {
    onAuthChange();
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const meta = session.user.user_metadata || {};
      const id   = meta.username || session.user.email?.replace('@nv.local', '') || session.user.id;
      this.user  = { id, nickname: meta.nickname || id };
      this.token = session.access_token;
      this.isLoggedIn = true;
      onAuthChange();
    }

    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const meta     = session.user.user_metadata || {};
        const id       = meta.provider_id ? String(meta.provider_id) : session.user.id;
        const nickname = meta.full_name || meta.name || '카카오유저';

        window.appState.currentUser = id;
        localStorage.setItem('nv_user', id);
        localStorage.setItem('nv_nick_' + id, nickname);
        this.user = { id, nickname };
        this.token = session.access_token;
        this.isLoggedIn = true;
        onAuthChange();
        await syncToSupabase();

        const loginScreen = document.getElementById('screen-login');
        if (loginScreen?.classList.contains('active')) {
          window.switchTo?.('mailbox');
        }
      } else if (!session) {
        this.user = null; this.token = null; this.isLoggedIn = false;
        onAuthChange();
      }
    });
  },
};

export function kakaoLogin() {
  sb.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: location.origin + location.pathname,
      scopes: 'profile_nickname profile_image',
    },
  });
}

window.NV_AUTH   = NV_AUTH;
window.kakaoLogin = kakaoLogin;
