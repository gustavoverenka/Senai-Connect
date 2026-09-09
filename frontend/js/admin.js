if (!getToken()) logout();

let currentAdminUser = null;
let allUsersCache = [];

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

function getReasonBadge(reason) {
    const map = {
        'spam': '📢 Spam',
        'ofensivo': '🤬 Ofensivo / Desrespeito',
        'conteudo_improprio': '⚠️ Conteúdo Impróprio',
        'desinformacao': '❌ Desinformação',
        'outro': '❓ Outro'
    };
    return map[reason] || reason;
}

async function verifyAdminAuth() {
    try {
        const data = await apiFetch('/users/me');
        currentAdminUser = data.user;
        if (!currentAdminUser || currentAdminUser.role !== 'admin') {
            alert('Acesso restrito à Coordenação e Administradores.');
            window.location.href = 'feed.html';
            return false;
        }
        return true;
    } catch (e) {
        window.location.href = 'feed.html';
        return false;
    }
}

async function loadDashboardStats() {
    try {
        const data = await apiFetch('/admin/stats');
        const stats = data.stats;

        document.getElementById('statUsers').textContent = stats.totalUsers || 0;
        document.getElementById('statPosts').textContent = stats.totalPosts || 0;
        document.getElementById('statOpps').textContent = stats.totalOpportunities || 0;
        document.getElementById('statReports').textContent = stats.pendingReports || 0;
        document.getElementById('tabReportCount').textContent = stats.pendingReports || 0;

        renderRoleDistribution(stats);
    } catch (e) {
        console.error('Erro ao carregar estatísticas:', e);
    }
}

function renderRoleDistribution(stats) {
    const distContainer = document.getElementById('roleDistributionList');
    if (!distContainer) return;

    const total = stats.totalUsers || 1;
    const roles = [
        { key: 'aluno', label: 'Alunos', count: stats.roles?.aluno || 0, color: '#3b82f6' },
        { key: 'ex-aluno', label: 'Ex-Alunos', count: stats.roles?.['ex-aluno'] || 0, color: '#10b981' },
        { key: 'professor', label: 'Professores', count: stats.roles?.professor || 0, color: '#f59e0b' },
        { key: 'admin', label: 'Coordenação / Admin', count: stats.roles?.admin || 0, color: '#8b5cf6' }
    ];

    distContainer.innerHTML = roles.map(r => {
        const pct = Math.round((r.count / total) * 100);
        return `
            <div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; font-size:0.9rem;">
                    <strong>${r.label}</strong>
                    <span style="color:var(--text-light);">${r.count} (${pct}%)</span>
                </div>
                <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:${r.color}; border-radius:4px;"></div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadReports() {
    const reportsList = document.getElementById('reportsList');
    reportsList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top:2rem;">Carregando denúncias...</p>';

    try {
        const data = await apiFetch('/admin/reports?status=pending');
        const reports = data.reports || [];

        document.getElementById('tabReportCount').textContent = reports.length;
        document.getElementById('statReports').textContent = reports.length;

        if (reports.length === 0) {
            reportsList.innerHTML = `
                <div style="text-align:center; padding:3rem 1rem; color:var(--text-light);">
                    <div style="font-size:2.5rem; margin-bottom:0.5rem;">🎉</div>
                    <p style="font-size:1.1rem; font-weight:600; color:var(--text);">Nenhuma denúncia pendente!</p>
                    <p style="font-size:0.88rem; color:var(--text-muted); margin-top:4px;">Todas as publicações reportadas foram moderadas.</p>
                </div>
            `;
            return;
        }

        reportsList.innerHTML = '';
        reports.forEach(r => {
            const date = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            
            reportsList.innerHTML += `
                <div class="report-card" id="report-${r.id}">
                    <div class="report-header">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="report-reason-badge">${getReasonBadge(r.reason)}</span>
                            <span style="font-size:0.8rem; color:var(--text-muted);">${date}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button class="btn-primary" style="background:var(--danger); border-color:var(--danger); width:auto; padding:0.4rem 0.9rem; font-size:0.82rem; margin-top:0;" onclick="handleReport('${r.id}', 'delete_post')">🗑️ Excluir Post & Resolver</button>
                            <button class="btn-secondary" style="width:auto; padding:0.4rem 0.9rem; font-size:0.82rem;" onclick="handleReport('${r.id}', 'dismiss')">Descartar</button>
                        </div>
                    </div>

                    <div style="font-size:0.88rem; margin-bottom:0.4rem;">
                        <span style="color:var(--text-muted);">Autor da publicação: </span>
                        <strong style="color:var(--text); cursor:pointer;" onclick="window.location.href='user.html?id=${r.post_author_id}'">${escapeHtml(r.post_author_name || 'Usuário')}</strong>
                    </div>

                    <div class="reported-post-box">
                        <strong style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px;">Conteúdo da Publicação:</strong>
                        "${escapeHtml(r.post_content || '[Sem conteúdo de texto ou já removido]')}"
                    </div>

                    ${r.details ? `
                        <div style="font-size:0.85rem; color:var(--text-light); margin-top:0.5rem; background:rgba(255,255,255,0.02); padding:0.5rem 0.75rem; border-radius:6px;">
                            <strong style="color:var(--text-muted);">Detalhes do denunciante:</strong> ${escapeHtml(r.details)}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    } catch (e) {
        console.error('Erro ao carregar denúncias:', e);
    }
}

async function handleReport(reportId, action) {
    const isDelete = action === 'delete_post';
    const confirmMsg = isDelete 
        ? 'Deseja realmente apagar a publicação denunciada e resolver esta denúncia?' 
        : 'Deseja descartar esta denúncia sem apagar a publicação?';

    if (!confirm(confirmMsg)) return;

    try {
        const data = await apiFetch(`/admin/reports/${reportId}/resolve`, {
            method: 'PATCH',
            body: JSON.stringify({ action })
        });

        showToast(data.message || 'Denúncia processada!', 'success');
        loadReports();
        loadDashboardStats();
    } catch (e) {
        // error toast already handled in apiFetch
    }
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light);">Carregando usuários...</td></tr>';

    try {
        const data = await apiFetch('/admin/users');
        allUsersCache = data.users || [];
        renderUsersTable(allUsersCache);
    } catch (e) {
        console.error('Erro ao carregar usuários:', e);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light);">Nenhum usuário encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => {
        const avatar = u.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=005aa9&color=fff`;
        const course = u.course || 'Não informado';

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="window.location.href='user.html?id=${u.id}'">
                        <img src="${avatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" alt="Avatar">
                        <div>
                            <strong style="display:block; color:var(--text);">${escapeHtml(u.name)}</strong>
                            <span style="font-size:0.8rem; color:var(--text-muted);">@${escapeHtml(u.username)}</span>
                        </div>
                    </div>
                </td>
                <td style="color:var(--text-light);">${escapeHtml(u.email)}</td>
                <td style="color:var(--text-light);">${escapeHtml(course)}</td>
                <td>
                    <select id="role-select-${u.id}" class="select-role">
                        <option value="aluno" ${u.role === 'aluno' ? 'selected' : ''}>Aluno</option>
                        <option value="ex-aluno" ${u.role === 'ex-aluno' ? 'selected' : ''}>Ex-Aluno</option>
                        <option value="professor" ${u.role === 'professor' ? 'selected' : ''}>Professor</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Coordenação (Admin)</option>
                    </select>
                </td>
                <td>
                    <button class="btn-primary" style="width:auto; padding:0.35rem 0.75rem; font-size:0.8rem; margin-top:0;" onclick="updateUserRole('${u.id}')">Salvar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterUsersList() {
    const search = (document.getElementById('filterUserSearch')?.value || '').toLowerCase().trim();
    const role = document.getElementById('filterRoleSelect')?.value || '';

    const filtered = allUsersCache.filter(u => {
        const matchesSearch = !search || 
            (u.name && u.name.toLowerCase().includes(search)) || 
            (u.email && u.email.toLowerCase().includes(search)) || 
            (u.username && u.username.toLowerCase().includes(search));

        const matchesRole = !role || (u.role && u.role.toLowerCase() === role.toLowerCase());

        return matchesSearch && matchesRole;
    });

    renderUsersTable(filtered);
}

async function updateUserRole(userId) {
    const select = document.getElementById(`role-select-${userId}`);
    if (!select) return;
    const newRole = select.value;

    try {
        const data = await apiFetch(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole })
        });

        showToast(data.message || 'Papel atualizado!', 'success');
        
        // Atualiza cache local
        const target = allUsersCache.find(u => u.id === userId);
        if (target) target.role = newRole;

        loadDashboardStats();
    } catch (e) {
        // error toast handled in apiFetch
    }
}

function switchAdminTab(tab, btn) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (btn) btn.classList.add('active');
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.add('active');

    if (tab === 'users' && allUsersCache.length === 0) {
        loadUsers();
    }
}

async function loadAllAdminData() {
    await loadDashboardStats();
    await loadReports();
    await loadUsers();
}

window.addEventListener('DOMContentLoaded', async () => {
    const isAuthed = await verifyAdminAuth();
    if (isAuthed) {
        loadAllAdminData();
    }
});
