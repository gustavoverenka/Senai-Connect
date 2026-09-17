/* =========================================================
   SENAI Connect — Lógica da página de Feed
   ========================================================= */

requireAuth();
renderNavbar('feed');

const currentUser = Storage.getUser();
const feedContainer = document.getElementById('feed-container');
const composerForm = document.getElementById('composer-form');
const composerAlert = document.getElementById('composer-alert');
const composerSubmit = document.getElementById('composer-submit');
const imageInput = document.getElementById('post-image');
const previewBox = document.getElementById('composer-preview');
const previewImg = document.getElementById('composer-preview-img');
const announcementRow = document.getElementById('announcement-row');

let selectedImageFile = null;
let reportingPostId = null;

// Apenas professor/admin podem fixar avisos
if (['professor', 'admin'].includes(currentUser.role)) {
  announcementRow.classList.remove('hidden');
}

// Preview de imagem selecionada
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) {
    selectedImageFile = null;
    previewBox.classList.add('hidden');
    return;
  }
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    previewImg.src = ev.target.result;
    previewBox.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

// Envio do formulário de novo post
composerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(composerAlert);

  const content = document.getElementById('post-content').value.trim();
  if (!content) return;

  const formData = new FormData();
  formData.append('content', content);
  const isAnnouncement = document.getElementById('post-announcement').checked;
  formData.append('is_announcement', isAnnouncement);
  if (selectedImageFile) formData.append('image', selectedImageFile);

  composerSubmit.disabled = true;
  composerSubmit.textContent = 'Publicando...';

  try {
    await Api.createPost(formData);
    composerForm.reset();
    previewBox.classList.add('hidden');
    selectedImageFile = null;
    loadFeed();
  } catch (err) {
    showAlert(composerAlert, err.message);
  } finally {
    composerSubmit.disabled = false;
    composerSubmit.textContent = 'Publicar';
  }
});

function renderPost(post) {
  const isOwner = post.author && post.author.id === currentUser.id;
  const canDelete = isOwner || currentUser.role === 'admin';

  const commentsHtml = (post.comments || [])
    .map(
      (c) => `
      <div class="comment">
        <img class="comment-avatar" src="${avatarOrDefault(c.user?.profile_picture)}" alt="">
        <div class="comment-bubble">
          <div class="comment-author">${escapeHtml(c.user?.name || '')}</div>
          <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
      </div>`
    )
    .join('');

  return `
    <article class="post ${post.is_announcement ? 'is-announcement' : ''}" data-post-id="${post.id}">
      <div class="post-header">
        <a href="profile.html?id=${post.author?.id}">
          <img class="post-avatar" src="${avatarOrDefault(post.author?.profile_picture)}" alt="">
        </a>
        <div style="flex:1;">
          <a href="profile.html?id=${post.author?.id}" class="post-author-name">${escapeHtml(post.author?.name || 'Usuário')}</a>
          ${post.is_announcement ? '<span class="badge badge-amber">Aviso</span>' : ''}
          <div class="post-author-meta">@${escapeHtml(post.author?.username || '')} · ${roleLabel(post.author?.role)} · ${timeAgo(post.createdAt)}</div>
        </div>
        <div>
          <button class="btn-icon report-btn" title="Denunciar" aria-label="Denunciar">Denunciar</button>
          ${canDelete ? '<button class="btn-icon delete-btn" title="Excluir" aria-label="Excluir">Excluir</button>' : ''}
        </div>
      </div>

      <div class="post-content">${escapeHtml(post.content)}</div>
      ${post.image ? `<img class="post-image" src="${post.image}" alt="Imagem do post">` : ''}

      <div class="post-actions">
        <button class="post-action-btn like-btn ${post.isLikeByMe ? 'liked' : ''}" aria-label="Curtir publicação">
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>
          <span>Curtir (${post.likesCount || 0})</span>
        </button>
        <button class="post-action-btn toggle-comments-btn" aria-label="Abrir comentários">
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
          <span>Comentários (${post.commentsCount || 0})</span>
        </button>
      </div>

      <div class="comments-box hidden">
        <div class="comments-list">${commentsHtml || '<p class="form-hint">Nenhum comentário ainda.</p>'}</div>
        <form class="comment-form">
          <input type="text" placeholder="Escreva um comentário..." maxlength="500" required>
          <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
        </form>
      </div>
    </article>
  `;
}

function attachPostHandlers(postEl, post) {
  const likeBtn = postEl.querySelector('.like-btn');
  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true;
    try {
      const res = await Api.toggleLike(post.id);
      const currentlyLiked = likeBtn.classList.contains('liked');
      const newCount = (post.likesCount || 0) + (res.liked ? 1 : -1);
      post.likesCount = newCount;
      post.isLikeByMe = res.liked;
      likeBtn.classList.toggle('liked', res.liked);
      likeBtn.innerHTML = `<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg><span>Curtir (${newCount})</span>`;
    } catch (err) {
      alert(err.message);
    } finally {
      likeBtn.disabled = false;
    }
  });

  const toggleCommentsBtn = postEl.querySelector('.toggle-comments-btn');
  const commentsBox = postEl.querySelector('.comments-box');
  toggleCommentsBtn.addEventListener('click', () => {
    commentsBox.classList.toggle('hidden');
  });

  const commentForm = postEl.querySelector('.comment-form');
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = commentForm.querySelector('input');
    const content = input.value.trim();
    if (!content) return;

    const btn = commentForm.querySelector('button');
    btn.disabled = true;
    try {
      const res = await Api.addComment(post.id, content);
      const list = postEl.querySelector('.comments-list');
      const emptyHint = list.querySelector('.form-hint');
      if (emptyHint) emptyHint.remove();
      const c = res.comment;
      list.insertAdjacentHTML(
        'beforeend',
        `<div class="comment">
          <img class="comment-avatar" src="${avatarOrDefault(c.user?.profile_picture)}" alt="">
          <div class="comment-bubble">
            <div class="comment-author">${escapeHtml(c.user?.name || '')}</div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
          </div>
        </div>`
      );
      input.value = '';
      const countBtn = postEl.querySelector('.toggle-comments-btn');
      post.commentsCount = (post.commentsCount || 0) + 1;
      countBtn.innerHTML = `<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg><span>Comentários (${post.commentsCount})</span>`;
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  const deleteBtn = postEl.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;
      try {
        await Api.deletePost(post.id);
        postEl.remove();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const reportBtn = postEl.querySelector('.report-btn');
  reportBtn.addEventListener('click', () => {
    reportingPostId = post.id;
    document.getElementById('report-modal').classList.remove('hidden');
  });
}

async function loadFeed() {
  feedContainer.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await Api.getFeed();
    if (!data.feed || data.feed.length === 0) {
      feedContainer.innerHTML = '<div class="card empty-state">Nenhuma publicação ainda. Seja o primeiro a compartilhar algo!</div>';
      return;
    }
    feedContainer.innerHTML = data.feed.map(renderPost).join('');
    data.feed.forEach((post) => {
      const postEl = feedContainer.querySelector(`[data-post-id="${post.id}"]`);
      attachPostHandlers(postEl, post);
    });
  } catch (err) {
    feedContainer.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

// ---- Modal de denúncia ----
const reportModal = document.getElementById('report-modal');
const reportForm = document.getElementById('report-form');
const reportAlert = document.getElementById('report-alert');

document.getElementById('report-cancel').addEventListener('click', () => {
  reportModal.classList.add('hidden');
  reportForm.reset();
  clearAlert(reportAlert);
});

reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(reportAlert);

  const reason = document.getElementById('report-reason').value;
  const details = document.getElementById('report-details').value.trim();

  try {
    const data = await Api.reportPost(reportingPostId, { reason, details });
    showAlert(reportAlert, data.message, 'success');
    setTimeout(() => {
      reportModal.classList.add('hidden');
      reportForm.reset();
      clearAlert(reportAlert);
    }, 1200);
  } catch (err) {
    showAlert(reportAlert, err.message);
  }
});

loadFeed();
