  'use strict';

  const SAMPLE = [];

  let posts = JSON.parse(JSON.stringify(SAMPLE));
  let myPosts = [], myComments = [], currentCat = 'all', currentId = null, likesUsed = {};

  function today() {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }
  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function toast(msg) {
    const t = document.getElementById('gj-toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }
  function $(id) { return document.getElementById(id); }

  $('gj-today-date').textContent = today();

  document.querySelectorAll('.gj-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gj-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.gj-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`gj-panel-${tab.dataset.tab}`).classList.add('active');
      if (tab.dataset.tab === 'my') renderMyActivity();
    });
  });

  function switchGjTab(name) {
    document.querySelectorAll('.gj-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.gj-panel').forEach(p => p.classList.remove('active'));
    $(`gj-panel-${name}`).classList.add('active');
  }

  function renderPosts() {
    const filtered = currentCat === 'all' ? posts : posts.filter(p => p.cat === currentCat);
    $('gj-post-list').innerHTML = filtered.map(p => `
      <div class="gj-post-item" data-id="${p.id}">
        <span class="gj-post-badge ${p.bc}">${p.badge}</span>
        <div>
          <div class="gj-post-title">${p.title}${p.comments.length ? `<span class="gj-cmts">[${p.comments.length}]</span>` : ''}</div>
          <div class="gj-post-meta">${p.author} · ${p.date}</div>
        </div>
        <div class="gj-post-right">조회 ${p.views}<br>♡ ${p.likes}</div>
      </div>
    `).join('') || '<div style="padding:20px 4px;font-size:13px;color:var(--gj-ink-light)">게시글이 없습니다.</div>';
    $('gj-post-list').querySelectorAll('.gj-post-item').forEach(el => {
      el.addEventListener('click', () => openPost(parseInt(el.dataset.id)));
    });
  }

  function openPost(id) {
    const p = posts.find(x => x.id === id);
    if (!p) return;
    currentId = id; p.views++;
    $('gj-view-badge').textContent = p.badge;
    $('gj-view-badge').className = `gj-post-badge ${p.bc}`;
    $('gj-view-title').textContent = p.title;
    $('gj-view-author').textContent = p.author;
    $('gj-view-date').textContent = p.date;
    $('gj-view-views').textContent = `조회 ${p.views}`;
    $('gj-view-body').textContent = p.body;
    $('gj-like-count').textContent = `${p.likes}명이 공감`;
    renderComments(p);
    $('gj-board-list-wrap').classList.add('hidden');
    $('gj-post-view').classList.add('active');
  }

  $('gj-back-btn').addEventListener('click', () => {
    $('gj-board-list-wrap').classList.remove('hidden');
    $('gj-post-view').classList.remove('active');
    renderPosts();
  });

  function renderComments(p) {
    $('gj-comment-count').textContent = `댓글 ${p.comments.length}`;
    $('gj-comment-list').innerHTML = p.comments.map(c => `
      <div class="gj-comment-item">
        <span class="gj-comment-author">${c.author}</span>
        <span class="gj-comment-time">${c.time}</span>
        <div class="gj-comment-text">${c.text}</div>
      </div>`).join('');
  }

  $('gj-comment-submit').addEventListener('click', () => {
    const input = $('gj-comment-input');
    const text = input.value.trim();
    if (!text) return;
    const p = posts.find(x => x.id === currentId);
    const c = { author: '나', time: nowTime(), text };
    p.comments.push(c); myComments.push({ postTitle: p.title, ...c });
    input.value = '';
    renderComments(p);
    $('gj-comment-count').textContent = `댓글 ${p.comments.length}`;
    toast('댓글이 등록되었습니다');
  });

  $('gj-like-btn').addEventListener('click', () => {
    if (!currentId || likesUsed[currentId]) { toast('이미 공감한 글입니다'); return; }
    const p = posts.find(x => x.id === currentId);
    p.likes++; likesUsed[currentId] = true;
    $('gj-like-count').textContent = `${p.likes}명이 공감`;
    toast('공감했습니다 ♡');
  });

  document.querySelectorAll('.gj-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gj-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); currentCat = btn.dataset.cat; renderPosts();
    });
  });

  $('gj-goto-write-btn').addEventListener('click', () => switchGjTab('write'));

  $('gj-write-title').addEventListener('input', function () {
    $('gj-title-count').textContent = `${this.value.length} / 60`;
  });
  $('gj-write-body').addEventListener('input', function () {
    $('gj-body-count').textContent = `${Math.min(this.value.length, 2000)} / 2000`;
  });

  $('gj-write-submit').addEventListener('click', () => {
    const title = $('gj-write-title').value.trim();
    const body  = $('gj-write-body').value.trim();
    const nick  = $('gj-write-nick').value.trim() || '마을 주민';
    const cat   = $('gj-write-cat').value;
    if (!title || !body) { toast('제목과 내용을 모두 입력해 주세요'); return; }
    const catMap   = { '자유':'free', '토론':'discuss', '질문':'question', '제보':'tip' };
    const badgeMap = { '자유':'gj-badge-free', '토론':'gj-badge-free', '질문':'gj-badge-free', '제보':'gj-badge-tip' };
    const post = { id: Date.now(), cat: catMap[cat]||'free', badge: cat, bc: badgeMap[cat]||'gj-badge-free',
                   title, author: nick, date: today(), views: 0, likes: 0, body, comments: [] };
    posts.unshift(post); myPosts.unshift(post);
    $('gj-write-title').value = ''; $('gj-write-body').value = '';
    $('gj-title-count').textContent = '0 / 60'; $('gj-body-count').textContent = '0 / 2000';
    toast('글이 광장에 게시되었습니다!');
    switchGjTab('board'); renderPosts();
  });

  $('gj-anon-check').addEventListener('change', function () {
    const n = $('gj-tip-name');
    n.disabled = this.checked;
    n.placeholder = this.checked ? '익명' : '이름을 입력해 주세요';
    n.value = '';
  });

  $('gj-tip-submit').addEventListener('click', () => {
    if (!$('gj-tip-title').value.trim() || !$('gj-tip-body').value.trim()) {
      toast('제목과 내용을 입력해 주세요'); return;
    }
    $('gj-tip-title').value = ''; $('gj-tip-body').value = ''; $('gj-tip-contact').value = '';
    toast('제보가 편집부로 전달되었습니다. 감사합니다!');
  });

  $('gj-contrib-body').addEventListener('input', function () {
    $('gj-contrib-count').textContent = `${Math.min(this.value.length, 2000)} / 2000`;
  });

  $('gj-contrib-submit').addEventListener('click', () => {
    if (!$('gj-contrib-title').value.trim() || !$('gj-contrib-body').value.trim() || !$('gj-contrib-contact').value.trim()) {
      toast('제목, 내용, 연락처를 모두 입력해 주세요'); return;
    }
    $('gj-contrib-title').value = ''; $('gj-contrib-body').value = ''; $('gj-contrib-contact').value = '';
    $('gj-contrib-count').textContent = '0 / 2000';
    toast('투고가 접수되었습니다. 편집부가 검토 후 연락드립니다.');
  });

  function renderMyActivity() {
    $('gj-my-post-count').textContent = myPosts.length;
    $('gj-my-comment-count').textContent = myComments.length;
    $('gj-my-posts-list').innerHTML = myPosts.length
      ? myPosts.map(p => `<div class="gj-post-item" style="cursor:default"><span class="gj-post-badge ${p.bc}">${p.badge}</span><div><div class="gj-post-title">${p.title}</div><div class="gj-post-meta">${p.date}</div></div><div class="gj-post-right">조회 ${p.views}</div></div>`).join('')
      : '<div style="padding:14px 4px;font-size:13px;color:var(--gj-ink-light)">아직 작성한 글이 없습니다.</div>';
    $('gj-my-comments-list').innerHTML = myComments.length
      ? myComments.map(c => `<div class="gj-comment-item"><span style="font-size:11px;color:var(--gj-ink-light)">${c.postTitle}</span><div class="gj-comment-text" style="margin-top:4px">${c.text}</div><div style="font-size:11px;color:var(--gj-ink-light);margin-top:3px">${c.time}</div></div>`).join('')
      : '<div style="padding:14px 4px;font-size:13px;color:var(--gj-ink-light)">아직 작성한 댓글이 없습니다.</div>';
  }

  renderPosts();
  renderMyActivity();
