/* =========================================================
   SENAI Connect — Lógica do painel administrativo
   Acesso restrito à role 'admin' (o backend também valida).
   ========================================================= */

requireAuth();
renderNavbar('admin');

const currentUser = Storage.getUser();
if (currentUser.role !== 'admin') {
  document.querySelector('main').innerHTML =
    '<div class="card alert alert-error">Acesso restrito à administração.</div>';
  throw new Error('Acesso negado');
}

// ---------- Estatísticas ----------
async function loadStats() {
  const box = document.getElementById('stats-grid');
  try {
    const { stats } = await Api.getAdminStats();
    box.innerHTML = `
      <div class="stat-box"><strong>${stats.totalUsers}</strong><span>Usuários</span></div>
      <div class="stat-box"><strong>${stats.totalPosts}</strong><span>Publicações</span></div>
      <div class="stat-box"><strong>${stats.totalOpportunities}</strong><span>Oportunidades</span></div>
      <div class="stat-box"><strong>${stats.pendingReports}</strong><span>Denúncias pendentes</span></div>
      <div class="stat-box"><strong>${stats.roles.aluno}</strong><span>Alunos</span></div>
      <div class="stat-box"><strong>${stats.roles['ex-aluno']}</strong><span>Ex-alunos</span></div>
      <div class="stat-box"><strong>${stats.roles.professor}</strong><span>Professores</span></div>
    `;
  } catch (err) {
    box.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

// ---------- Usuários ----------
const roleOptions = ['aluno', 'ex-aluno', 'professor', 'admin'];

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="5"><div class="spinner"></div></td></tr>';

  const role = document.getElementById('admin-role-filter').value;
  const params = role ? { role } : {};

  try {
    const { users } = await Api.getAdminUsers(params);
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum usuário encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = users
      .map(
        (u) => `
        <tr data-user-id="${u.id}">
          <td>${escapeHtml(u.name)}</td>
          <td>@${escapeHtml(u.username)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>
            <select class="role-select">
              ${roleOptions.map((r) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${roleLabel(r)}</option>`).join('')}
            </select>
          </td>
          <td><button class="btn btn-sm btn-secondary save-role-btn">Salvar</button></td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('.save-role-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const userId = row.dataset.userId;
        const newRole = row.querySelector('.role-select').value;
        btn.disabled = true;
        btn.textContent = 'Salvando...';
        try {
          await Api.updateUserRole(userId, newRole);
          btn.textContent = 'Salvo ✓';
          setTimeout(() => (btn.textContent = 'Salvar'), 1500);
        } catch (err) {
          alert(err.message);
          btn.textContent = 'Salvar';
        } finally {
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(err.message)}</td></tr>`;
  }
}

document.getElementById('admin-filter-btn').addEventListener('click', loadUsers);

// ---------- Denúncias ----------
const reasonLabels = {
  spam: 'Spam',
  ofensivo: 'Conteúdo ofensivo',
  conteudo_improprio: 'Conteúdo impróprio',
  desinformacao: 'Desinformação',
  outro: 'Outro',
};

async function loadReports() {
  const box = document.getElementById('reports-list');
  box.innerHTML = '<div class="spinner"></div>';

  try {
    const { reports } = await Api.getReports({ status: 'pending' });
    if (!reports.length) {
      box.innerHTML = '<p class="empty-state">Nenhuma denúncia pendente. 🎉</p>';
      return;
    }
    box.innerHTML = reports
      .map(
        (r) => `
        <div class="card" data-report-id="${r.id}">
          <div class="opportunity-meta">
            <span class="badge badge-red">${reasonLabels[r.reason] || r.reason}</span>
            <span>🕒 ${timeAgo(r.created_at)}</span>
          </div>
          <p><strong>Autor do post:</strong> ${escapeHtml(r.post_author_name || '—')}</p>
          <p><strong>Conteúdo denunciado:</strong> "${escapeHtml(r.post_content || '')}"</p>
          ${r.details ? `<p><strong>Detalhes da denúncia:</strong> ${escapeHtml(r.details)}</p>` : ''}
          <div style="display:flex; gap:8px;">
            <button class="btn btn-danger btn-sm delete-post-action">Excluir publicação</button>
            <button class="btn btn-secondary btn-sm dismiss-action">Descartar denúncia</button>
          </div>
        </div>`
      )
      .join('');

    box.querySelectorAll('.delete-post-action').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-report-id]');
        if (!confirm('Excluir a publicação denunciada?')) return;
        try {
          await Api.resolveReport(card.dataset.reportId, 'delete_post');
          card.remove();
          loadStats();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    box.querySelectorAll('.dismiss-action').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-report-id]');
        try {
          await Api.resolveReport(card.dataset.reportId, 'dismiss');
          card.remove();
          loadStats();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    box.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-users').classList.toggle('hidden', btn.dataset.tab !== 'users');
    document.getElementById('tab-reports').classList.toggle('hidden', btn.dataset.tab !== 'reports');
    if (btn.dataset.tab === 'reports') loadReports();
  });
});

loadStats();
loadUsers();
