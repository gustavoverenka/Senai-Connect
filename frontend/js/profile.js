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

async function loadProfile() {
    try {
        const data = await apiFetch('/users/me');
        const user = data.user;

        const nameEl = document.getElementById('profileName');
        const usernameEl = document.getElementById('profileUsername');
        const bioEl = document.getElementById('profileBio');
        const avatarEl = document.getElementById('profileAvatar');
        const badgeEl = document.getElementById('profileBadge');
        const extraEl = document.getElementById('profileExtraInfo');

        if (nameEl) nameEl.textContent = user.name;
        if (usernameEl) usernameEl.textContent = `@${user.username}`;
        if (bioEl) bioEl.textContent = user.bio ? `"${user.bio}"` : 'Sem bio por enquanto.';
        if (avatarEl) avatarEl.src = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=005aa9&color=fff`;
        if (badgeEl) badgeEl.innerHTML = getRoleBadge(user.role);

        // Informações adicionais
        if (extraEl) {
            let details = [];
            if (user.unit) details.push(`📍 Unidade: ${escapeHtml(user.unit)}`);
            if (user.role === 'aluno') {
                if (user.course) details.push(`📚 Curso: ${escapeHtml(user.course)}`);
                if (user.class_period) details.push(`⏰ Período: ${escapeHtml(user.class_period)}`);
            } else if (user.role === 'ex-aluno') {
                if (user.graduated_course) details.push(`🎓 Formado em: ${escapeHtml(user.graduated_course)}`);
                if (user.current_company) details.push(`💼 Atuação: ${escapeHtml(user.current_company)}`);
                if (user.open_for_mentoring) details.push(`🤝 Disponível para mentorias`);
            } else if (user.role === 'professor') {
                if (user.teaching_areas && user.teaching_areas.length > 0) {
                    details.push(`📖 Leciona: ${escapeHtml(user.teaching_areas.join(', '))}`);
                }
            }
            extraEl.innerHTML = details.map(d => `<div style="margin-bottom:4px;">${d}</div>`).join('');
        }

        document.getElementById('bioInput').value = user.bio || '';
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
    }
}

async function updateBio() {
    const bio = document.getElementById('bioInput').value.trim();
    try {
        await apiFetch('/users/bio', {
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
            <div class="connection-item" style="cursor:pointer; display:flex; align-items:center; gap:10px; margin-bottom:10px;" onclick="window.location.href='user.html?id=${p.id}'">
                <img src="${p.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=005aa9&color=fff`}" class="avatar" alt="${escapeHtml(p.name)}">
                <div>
                    <strong>${escapeHtml(p.name)}</strong> <span style="color:var(--text-light);">@${escapeHtml(p.username)}</span>
                    <div>${getRoleBadge(p.role)}</div>
                </div>
            </div>`).join('') || '<p style="color:var(--text-light);">Nenhuma conexão encontrada.</p>';
    } catch (error) {
        console.error("Erro ao carregar conexões:", error);
    }
}

window.addEventListener('DOMContentLoaded', loadProfile);

