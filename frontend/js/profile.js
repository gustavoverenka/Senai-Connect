// Redireciona usuários não autenticados.
if (!getToken()) logout();

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadProfile() {
    try {
        const data = await apiFetch('/users/me');
        const user = data.user;

        const nameEl = document.getElementById('profileName');
        const usernameEl = document.getElementById('profileUsername');
        const bioEl = document.getElementById('profileBio');
        const avatarEl = document.getElementById('profileAvatar');

        if (nameEl) nameEl.textContent = user.name;
        if (usernameEl) usernameEl.textContent = `@${user.username}`;
        if (bioEl) bioEl.textContent = user.bio || 'Sem bio por enquanto.';
        if (avatarEl) avatarEl.src = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f172a&color=fff`;

        document.getElementById('bioInput').value = user.bio || '';
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
    }
}

async function updateBio() {
    const bio = document.getElementById('bioInput').value.trim();
    try {
        const data = await apiFetch('/users/bio', {
            method: 'PUT',
            body: JSON.stringify({ bio })
        });
        showToast('Bio atualizada!', 'success');
        loadProfile();
    } catch (error) {
        console.error("Erro ao atualizar bio:", error);
    }
}

async function uploadAvatar() {
    const fileInput = document.getElementById('avatarInput');
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Selecione uma imagem.');
        return;
    }

    const formData = new FormData();
    formData.append('avatar', fileInput.files[0]);

    try {
        const res = await fetch(`${API_BASE}/users/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Foto atualizada!', 'success');
        loadProfile();
    } catch (error) {
        showToast(error.message);
    }
}

async function loadConnections(type) {
    const me = await apiFetch('/users/me').catch(() => null);
    if (!me) return;
    const userId = me.user.id;

    const endpoint = type === 'followers' ? `/users/${userId}/followers` : `/users/${userId}/following`;
    const key = type === 'followers' ? 'followers' : 'following';
    const listEl = document.getElementById('connectionList');

    try {
        const data = await apiFetch(endpoint);
        const people = data[key] || [];
        listEl.innerHTML = people.map(p => `
            <div class="connection-item">
                <img src="${p.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0f172a&color=fff`}" class="avatar" alt="${escapeHtml(p.name)}">
                <strong>${escapeHtml(p.name)}</strong> <span>@${escapeHtml(p.username)}</span>
            </div>`).join('') || '<p style="color:var(--text-light);">Nenhum resultado.</p>';
    } catch (error) {
        console.error("Erro ao carregar conexões:", error);
    }
}

window.addEventListener('DOMContentLoaded', loadProfile);
