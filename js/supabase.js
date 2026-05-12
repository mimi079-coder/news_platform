import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SB_URL, SB_KEY } from './config.js';

export const sb = createClient(SB_URL, SB_KEY);

export async function syncToSupabase() {
  const user = window.appState?.currentUser;
  if (!user) return;
  try {
    await sb.from('users').upsert({
      kakao_id:   user,
      nickname:   localStorage.getItem('nv_nick_' + user) || user,
      tree_level: parseInt(localStorage.getItem('nv_level_' + user) || '0'),
      given:      JSON.parse(localStorage.getItem('nv_given_' + user) || '{"비료":0,"물":0,"양분":0}'),
      last_check: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'kakao_id' });
  } catch (e) { console.warn('Supabase sync failed:', e); }
}

export function shareMyLink() {
  const user = window.appState?.currentUser;
  if (!user) { alert('로그인 후 공유할 수 있어요!'); return; }
  const url = location.origin + location.pathname + '?view=' + user;
  navigator.clipboard.writeText(url)
    .then(() => alert('링크가 복사됐어요! 친구에게 공유해보세요 🌿'))
    .catch(() => prompt('아래 링크를 복사해서 친구에게 보내세요:', url));
}

export function loadFriendView(kakaoId) {
  document.getElementById('friend-view-title').textContent = '불러오는 중…';
  document.getElementById('friend-view-content').innerHTML = '';
  if (typeof window.switchTo === 'function') window.switchTo('friends');

  sb.from('users').select('nickname, tree_level')
    .eq('kakao_id', kakaoId).single()
    .then(result => {
      if (result.error || !result.data) {
        document.getElementById('friend-view-title').textContent = '친구의 정원';
        document.getElementById('friend-view-content').innerHTML =
          '<div style="color:#fff;font-family:\'Press Start 2P\',monospace;font-size:10px;">존재하지 않는 친구예요.</div>';
        return;
      }
      const d     = result.data;
      const level = d.tree_level || 0;
      const imgs  = ['', 'tree 1.png', 'tree 2.png', 'tree 3.png'];
      const sizes = [0, 200, 320, 420];
      const names = ['묘목', '작은 나무', '중간 나무', '가장 큰 나무'];
      const treeHTML = level === 0
        ? '<div style="color:#aaa;font-size:12px;">아직 씨앗 상태예요 🌱</div>'
        : `<img src="${imgs[level]}" height="${sizes[level]}" alt="나무" style="image-rendering:pixelated;">`;
      document.getElementById('friend-view-title').textContent = (d.nickname || '친구') + '님의 정원';
      document.getElementById('friend-view-content').innerHTML =
        `<div class="mh-tree" style="position:relative;width:280px;height:280px;display:flex;align-items:flex-end;justify-content:center;">${treeHTML}</div>` +
        `<div class="mh-level-badge">${names[level]}</div>` +
        `<div style="color:#aaa;font-family:'Press Start 2P',monospace;font-size:9px;">레벨 ${level} / 3</div>`;
    })
    .catch(() => {
      document.getElementById('friend-view-content').innerHTML =
        '<div style="color:#fff;font-size:11px;">불러오기 실패.</div>';
    });
}

export function checkInviteLink() {
  const params = new URLSearchParams(window.location.search);
  const viewId = params.get('view');
  if (!viewId) return;
  history.replaceState({}, '', window.location.pathname);
  loadFriendView(viewId);
}

window.shareMyLink  = shareMyLink;
window.loadFriendView = loadFriendView;
window.checkInviteLink = checkInviteLink;
