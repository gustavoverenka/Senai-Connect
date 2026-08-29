// Redireciona usuários não autenticados.
if (!getToken()) logout();

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

if (!userId) {
    showToast("Usuário não especificado.");
    window.location.href = "search.html";
}

let isFollowing = false;

async function loadUserProfile() {
    try {
        const data = await apiFetch(`/users/${userId}`);
        const user = data.user;
        isFollowing = data.isFollowing;

        const nameEl = document.getElementById('userName');
        const usernameEl = document.getElementById('userUsername');
        const bioEl = document.getElementById('userBio');
        const avatarEl = document.getElementById('userAvatar');
        const followBtn = document.getElementById('followBtn');
        const msgBtn = document.getElementById('msgBtn');

        if (nameEl) nameEl.textContent = user.name;
        if (usernameEl) usernameEl.textContent = `@${user.username}`;
        if (bioEl) bioEl.textContent = user.bio || 'Sem bio por enquanto.';
        if (avatarEl) avatarEl.src = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f172a&color=fff`;

        // Oculta controles de interação para o próprio perfil.
        const me = await apiFetch('/users/me');
        if (me.user.id != userId) {
            followBtn.style.display = 'inline-block';
            msgBtn.style.display = 'inline-block';
            updateFollowBtnUI(followBtn);
        }
    } catch (error) {
        console.error("Erro ao carregar perfil do usuário:", error);
        showToast("Erro ao carregar perfil.");
    }
}

function updateFollowBtnUI(btn) {
    if (isFollowing) {
        btn.textContent = 'Deixar de Seguir';
        btn.classList.replace('btn-primary', 'btn-secondary');
    } else {
        btn.textContent = 'Seguir';
        btn.classList.replace('btn-secondary', 'btn-primary');
    }
}

async function toggleFollowUser() {
    const btn = document.getElementById('followBtn');
    isFollowing = !isFollowing; // Atualização otimista.
    updateFollowBtnUI(btn);
    
    try {
        await apiFetch(`/users/${userId}/follow`, { method: 'POST' });
    } catch (error) {
        console.error("Erro ao seguir:", error);
        isFollowing = !isFollowing; // Reversão de estado.
        updateFollowBtnUI(btn);
    }
}

async function loadConnections(type) {
    const endpoint = type === 'followers' ? `/users/${userId}/followers` : `/users/${userId}/following`;
    const key = type === 'followers' ? 'followers' : 'following';
    const listEl = document.getElementById('connectionList');

    try {
        const data = await apiFetch(endpoint);
        const people = data[key] || [];
        listEl.innerHTML = people.map(p => `
            <div class="connection-item" style="cursor:pointer;" onclick="window.location.href='user.html?id=${p.id}'">
                <img src="${p.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0f172a&color=fff`}" class="avatar" alt="${escapeHtml(p.name)}">
                <strong>${escapeHtml(p.name)}</strong> <span>@${escapeHtml(p.username)}</span>
            </div>`).join('') || '<p style="color:var(--text-light);">Nenhum resultado.</p>';
    } catch (error) {
        console.error("Erro ao carregar conexões:", error);
    }
}

window.addEventListener('DOMContentLoaded', loadUserProfile);
