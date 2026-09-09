if (!getToken()) logout();

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function getRoleBadge(role) {
    const r = (role || 'aluno').toLowerCase();
    const map = {
        'aluno': { label: '🎓 Aluno', class: 'aluno' },
        'ex-aluno': { label: '💼 Ex-Aluno', class: 'ex-aluno' },
        'professor': { label: '👨‍🏫 Professor', class: 'professor' },
        'admin': { label: '🛡️ Coordenação', class: 'admin' }
    };
    const info = map[r] || map['aluno'];
    return `<span class="badge-role ${info.class}">${info.label}</span>`;
}

let currentUser = null;

async function initCurrentUser() {
    try {
        const data = await apiFetch('/users/me');
        currentUser = data.user;
        
        const avatarEl = document.getElementById('myAvatar');
        const nameEl = document.getElementById('myName');
        const badgeEl = document.getElementById('myBadge');
        const announcementOption = document.getElementById('announcementOption');

        if (avatarEl) avatarEl.src = currentUser.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=005aa9&color=fff`;
        if (nameEl) nameEl.textContent = currentUser.name;
        if (badgeEl) badgeEl.innerHTML = getRoleBadge(currentUser.role);

        // Se for professor ou admin, libera a opção de fixar anúncio
        if (['professor', 'admin'].includes(currentUser.role) && announcementOption) {
            announcementOption.style.display = 'flex';
        }

        // Se for admin, exibe a aba de moderação na navbar
        if (currentUser.role === 'admin') {
            const adminNav = document.getElementById('adminNav');
            if (adminNav) adminNav.style.display = 'flex';
        }
    } catch (e) {
        console.error("Erro ao carregar usuário:", e);
    }
}

function updateImageLabel(input) {
    const nameSpan = document.getElementById('imageFileName');
    if (input.files && input.files[0]) {
        nameSpan.textContent = `(${input.files[0].name})`;
    } else {
        nameSpan.textContent = '';
    }
}

async function loadFeed() {
    try {
        const data = await apiFetch('/posts');
        const feedList = document.getElementById('feedList');
        feedList.innerHTML = '';

        if (!data.feed || data.feed.length === 0) {
            feedList.innerHTML = '<p style="text-align:center; color: var(--text-light); margin-top: 2rem;">Nenhuma publicação encontrada. Seja o primeiro a compartilhar!</p>';
            return;
        }

        data.feed.forEach(post => {
            const date = new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const author = post.author || {};
            const avatarUrl = author.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}&background=1c2541&color=fff`;
            const roleBadge = getRoleBadge(author.role);

            const isPinned = Boolean(post.is_announcement);

            const commentsHtml = (post.comments || []).map(c => `
                <div class="comment-item" style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                    <strong style="color:var(--text); cursor:pointer;" onclick="window.location.href='user.html?id=${c.user.id}'">@${escapeHtml(c.user.username)}</strong>
                    <span style="color:var(--text-light); margin-left: 6px;">${escapeHtml(c.content)}</span>
                </div>`).join('');

            const isMyPost = currentUser && author.id === currentUser.id;
            const canReport = !isMyPost;

            feedList.innerHTML += `
                <div class="post-card ${isPinned ? 'pinned-post' : ''}" id="post-${post.id}" style="${isPinned ? 'border: 1px solid #f59e0b; background: rgba(245, 158, 11, 0.03);' : ''}">
                    ${isPinned ? `
                        <div style="margin-bottom:0.75rem;">
                            <span class="badge-announcement">📌 COMUNICADO OFICIAL DO SENAI</span>
                        </div>
                    ` : ''}

                    <div class="post-header">
                        <img src="${avatarUrl}" class="avatar" style="cursor:pointer;" onclick="window.location.href='user.html?id=${author.id}'" alt="Avatar">
                        <div class="post-meta" style="flex:1;">
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <h4 style="cursor:pointer; margin:0;" onclick="window.location.href='user.html?id=${author.id}'">${escapeHtml(author.name)}</h4>
                                ${roleBadge}
                            </div>
                            <span style="font-size:0.8rem; color:var(--text-muted);">@${escapeHtml(author.username)} • ${date}</span>
                        </div>
                    </div>

                    <div class="post-content" style="font-size: 0.95rem; margin: 0.8rem 0; white-space: pre-wrap;">
                        ${escapeHtml(post.content)}
                        ${post.image ? `<img src="${post.image}" alt="Imagem do post" style="max-width:100%; border-radius:8px; margin-top:10px; display:block; border: 1px solid var(--border);">` : ''}
                    </div>

                    <div class="post-actions" style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; gap:10px;">
                            <button class="action-btn" onclick="toggleLike('${post.id}', this)">
                                <span class="like-icon">${post.isLikeByMe ? '❤️' : '🤍'}</span> 
                                <span class="like-count">${post.likesCount || 0}</span>
                            </button>
                            <button class="action-btn" onclick="toggleComments('${post.id}')">
                                💬 Comentários (${post.commentsCount || 0})
                            </button>
                        </div>
                        ${canReport ? `
                            <button class="action-btn" style="color:var(--text-muted); font-size:0.8rem;" onclick="openReportModal('${post.id}')" title="Denunciar publicação à coordenação">
                                🚩 Denunciar
                            </button>
                        ` : ''}
                    </div>

                    <div class="comments-box" id="comments-${post.id}" style="display:none; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border);">
                        <div style="max-height: 200px; overflow-y: auto; margin-bottom: 10px;">
                            ${commentsHtml || '<p style="color:var(--text-muted); font-size:0.85rem;">Nenhum comentário ainda. Seja o primeiro a comentar!</p>'}
                        </div>
                        <div class="comment-form">
                            <input type="text" id="commentInput-${post.id}" placeholder="Escreva uma resposta...">
                            <button class="btn-primary" style="width:auto; padding:0.4rem 1rem;" onclick="addComment('${post.id}')">Enviar</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Erro ao carregar feed:", error);
    }
}

function openReportModal(postId) {
    document.getElementById('reportPostId').value = postId;
    document.getElementById('reportReason').value = 'spam';
    document.getElementById('reportDetails').value = '';
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'flex';
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'none';
}

async function submitReport(event) {
    if (event) event.preventDefault();
    const postId = document.getElementById('reportPostId').value;
    const reason = document.getElementById('reportReason').value;
    const details = document.getElementById('reportDetails').value.trim();

    try {
        const data = await apiFetch(`/posts/${postId}/report`, {
            method: 'POST',
            body: JSON.stringify({ reason, details })
        });
        showToast(data.message || 'Denúncia enviada!', 'success');
        closeReportModal();
    } catch (e) {
        // toast already handled in apiFetch
    }
}

function toggleComments(postId) {
    const box = document.getElementById(`comments-${postId}`);
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
        await apiFetch(`/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        input.value = '';
        loadFeed();
    } catch (error) {
        console.error("Erro ao comentar:", error);
    }
}

async function createPost() {
    const contentInput = document.getElementById('postContent');
    const content = contentInput.value.trim();
    if (!content) return;

    const isAnnouncementEl = document.getElementById('isAnnouncement');
    const isAnnouncement = isAnnouncementEl && isAnnouncementEl.checked;

    try {
        const formData = new FormData();
        formData.append('content', content);
        if (isAnnouncement) {
            formData.append('is_announcement', 'true');
        }
        
        const imageInput = document.getElementById('postImage');
        if (imageInput && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        const token = getToken();
        const res = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if(!res.ok) throw new Error(data.error);

        contentInput.value = '';
        if (imageInput) imageInput.value = '';
        const nameSpan = document.getElementById('imageFileName');
        if (nameSpan) nameSpan.textContent = '';
        if (isAnnouncementEl) isAnnouncementEl.checked = false;

        showToast(data.message || 'Publicado!', 'success');
        loadFeed();
    } catch (error) {
        showToast(error.message);
    }
}

async function toggleLike(postId, btn) {
    if (!btn) return;
    
    const iconSpan = btn.querySelector('.like-icon');
    const countSpan = btn.querySelector('.like-count');
    
    if (!iconSpan || !countSpan) return;

    const isCurrentlyLiked = iconSpan.textContent.includes('❤️');
    let currentCount = parseInt(countSpan.textContent) || 0;
    
    if (isCurrentlyLiked) {
        iconSpan.textContent = '🤍';
        countSpan.textContent = Math.max(0, currentCount - 1);
    } else {
        iconSpan.textContent = '❤️';
        countSpan.textContent = currentCount + 1;
    }

    try {
        await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
    } catch (error) {
        console.error("Erro ao curtir:", error);
        if (isCurrentlyLiked) {
            iconSpan.textContent = '❤️';
            countSpan.textContent = currentCount;
        } else {
            iconSpan.textContent = '🤍';
            countSpan.textContent = currentCount;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initCurrentUser();
    loadFeed();
});
