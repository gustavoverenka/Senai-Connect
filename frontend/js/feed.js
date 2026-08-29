// Redireciona usuários não autenticados.
if (!getToken()) logout();

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadFeed() {
    try {
        const data = await apiFetch('/posts');
        const feedList = document.getElementById('feedList');
        feedList.innerHTML = '';

        if (!data.feed || data.feed.length === 0) {
            feedList.innerHTML = '<p style="text-align:center; color: var(--text-light); margin-top: 2rem;">Nenhuma publicação encontrada. Seja o primeiro a postar!</p>';
            return;
        }

        data.feed.forEach(post => {
            const date = new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            // Define avatar de fallback caso inexistente.
            const avatarUrl = post.author.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}&background=0f172a&color=fff`;

            const commentsHtml = (post.comments || []).map(c => `
                <div class="comment-item">
                    <strong>@${escapeHtml(c.user.username)}</strong> <span>${escapeHtml(c.content)}</span>
                </div>`).join('');

            feedList.innerHTML += `
                <div class="post-card" id="post-${post.id}">
                    <div class="post-header">
                        <img src="${avatarUrl}" class="avatar" alt="Avatar de ${escapeHtml(post.author.name)}">
                        <div class="post-meta">
                            <h4>${escapeHtml(post.author.name)} <span style="font-weight:normal; color:var(--text-light);">@${escapeHtml(post.author.username)}</span></h4>
                            <span>${date}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        ${escapeHtml(post.content)}
                        ${post.image ? `<img src="${post.image}" alt="Post image" style="max-width:100%; border-radius:8px; margin-top:10px;">` : ''}
                    </div>
                    <div class="post-actions">
                        <button class="action-btn" onclick="toggleLike(${post.id}, this)">
                            <span class="like-icon">${post.isLikeByMe ? '❤️' : '🤍'}</span> 
                            <span class="like-count">${post.likesCount || 0}</span>
                        </button>
                        <button class="action-btn" onclick="toggleComments(${post.id})">
                            💬 ${post.commentsCount || 0}
                        </button>
                    </div>
                    <div class="comments-box" id="comments-${post.id}" style="display:none;">
                        ${commentsHtml || '<p style="color:var(--text-light);font-size:0.9rem;">Sem comentários ainda.</p>'}
                        <div class="comment-form">
                            <input type="text" id="commentInput-${post.id}" placeholder="Escreva um comentário...">
                            <button class="btn-primary" style="width:auto; padding:0.4rem 1rem;" onclick="addComment(${post.id})">Comentar</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Erro ao carregar feed:", error);
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

    try {
        // Utiliza FormData para suportar upload de arquivos.
        const formData = new FormData();
        formData.append('content', content);
        
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
    
    // Aplica atualização otimista na interface.
    if (isCurrentlyLiked) {
        iconSpan.textContent = '🤍';
        countSpan.textContent = Math.max(0, currentCount - 1);
    } else {
        iconSpan.textContent = '❤️';
        countSpan.textContent = currentCount + 1;
    }

    try {
        await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
        // Ignora recarregamento para manter a resposta instantânea.
    } catch (error) {
        console.error("Erro ao curtir:", error);
        // Reverte a interface em caso de falha.e a interface em caso de falha.
        if (isCurrentlyLiked) {
            iconSpan.textContent = '❤️';
            countSpan.textContent = currentCount;
        } else {
            iconSpan.textContent = '🤍';
            countSpan.textContent = currentCount;
        }
    }
}

// Inicialização
window.addEventListener('DOMContentLoaded', loadFeed);
