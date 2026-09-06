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
        const badgeEl = document.getElementById('userBadge');
        const extraEl = document.getElementById('userExtraInfo');
        const followBtn = document.getElementById('followBtn');
        const msgBtn = document.getElementById('msgBtn');

        if (nameEl) nameEl.textContent = user.name;
        if (usernameEl) usernameEl.textContent = `@${user.username}`;
        if (bioEl) bioEl.textContent = user.bio ? `"${user.bio}"` : 'Sem bio por enquanto.';
        if (avatarEl) avatarEl.src = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=005aa9&color=fff`;
        if (badgeEl) badgeEl.innerHTML = getRoleBadge(user.role);

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
                if (user.linkedin_url) details.push(`🔗 <a href="${escapeHtml(user.linkedin_url)}" target="_blank">Ver LinkedIn / Portfólio</a>`);
            } else if (user.role === 'professor') {
                if (user.teaching_areas && user.teaching_areas.length > 0) {
                    details.push(`📖 Leciona: ${escapeHtml(user.teaching_areas.join(', '))}`);
                }
            }
            extraEl.innerHTML = details.map(d => `<div style="margin-bottom:4px;">${d}</div>`).join('');
        }

        const me = await apiFetch('/users/me');
        if (me.user.id !== userId) {
            followBtn.style.display = 'inline-block';
            msgBtn.style.display = 'inline-block';
            updateFollowBtnUI(followBtn);
        }
    } catch (error) {
        console.error("Erro ao carregar perfil do usuário:", error);
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
    isFollowing = !isFollowing;
    updateFollowBtnUI(btn);
    
    try {
        await apiFetch(`/users/${userId}/follow`, { method: 'POST' });
    } catch (error) {
        console.error("Erro ao seguir:", error);
        isFollowing = !isFollowing;
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

window.addEventListener('DOMContentLoaded', loadUserProfile);

