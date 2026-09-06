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

let currentRoleFilter = '';
let isMentoringOnly = false;

function applyRoleFilter(role, btn) {
    currentRoleFilter = role;
    isMentoringOnly = false;
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    searchUsers();
}

function applyMentoringFilter(btn) {
    isMentoringOnly = !isMentoringOnly;
    currentRoleFilter = isMentoringOnly ? 'ex-aluno' : '';
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    if (isMentoringOnly && btn) btn.classList.add('active');
    searchUsers();
}

async function searchUsers() {
    const query = document.getElementById('searchInput').value.trim();
    const listEl = document.getElementById('userResults');

    let endpoint = `/users/search?q=${encodeURIComponent(query)}`;
    if (currentRoleFilter) endpoint += `&role=${encodeURIComponent(currentRoleFilter)}`;
    if (isMentoringOnly) endpoint += `&mentoring=true`;

    try {
        const data = await apiFetch(endpoint);
        const users = data.users || [];

        if (users.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-light); text-align:center; margin-top:2rem;">Nenhum usuário encontrado com esses critérios.</p>';
            return;
        }

        listEl.innerHTML = users.map(u => {
            const avatarUrl = u.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=005aa9&color=fff`;
            const badge = getRoleBadge(u.role);

            // Informações contextuais de acordo com o cargo
            let extraInfo = '';
            if (u.role === 'aluno' && u.course) {
                extraInfo = `<div style="font-size:0.8rem; color:var(--text-light); margin-top:2px;">📚 ${escapeHtml(u.course)}</div>`;
            } else if (u.role === 'ex-aluno') {
                if (u.current_company) {
                    extraInfo = `<div style="font-size:0.8rem; color:#34d399; margin-top:2px;">💼 ${escapeHtml(u.current_company)}</div>`;
                }
                if (u.open_for_mentoring) {
                    extraInfo += `<div style="font-size:0.75rem; color:#fbbf24; margin-top:2px;">🤝 Disponível para mentoria</div>`;
                }
            } else if (u.role === 'professor' && u.teaching_areas && u.teaching_areas.length > 0) {
                extraInfo = `<div style="font-size:0.8rem; color:#fbbf24; margin-top:2px;">📖 ${escapeHtml(u.teaching_areas.join(', '))}</div>`;
            }

            return `
                <div class="user-result">
                    <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="window.location.href='user.html?id=${u.id}'">
                        <img src="${avatarUrl}" class="avatar" alt="Avatar">
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <strong style="font-size:0.95rem;">${escapeHtml(u.name)}</strong>
                                ${badge}
                            </div>
                            <span style="color:var(--text-muted); font-size:0.85rem;">@${escapeHtml(u.username)}</span>
                            ${extraInfo}
                        </div>
                    </div>
                    <button class="btn-primary" style="padding:6px 14px; font-size:0.85rem; width:auto;" onclick="event.stopPropagation(); window.location.href='user.html?id=${u.id}'">Ver Perfil</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro na busca:", error);
    }
}

document.getElementById('searchBtn').addEventListener('click', searchUsers);
document.getElementById('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchUsers(); });

window.addEventListener('DOMContentLoaded', searchUsers);

