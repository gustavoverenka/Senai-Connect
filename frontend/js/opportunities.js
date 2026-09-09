if (!getToken()) logout();

let currentUser = null;
let currentFilter = '';

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

function getTypeBadge(type) {
    const map = {
        'estagio': { label: '💼 Estágio', class: 'type-estagio' },
        'emprego': { label: '🚀 Emprego', class: 'type-emprego' },
        'mentoria': { label: '🤝 Mentoria', class: 'type-mentoria' },
        'projeto': { label: '💡 Projeto', class: 'type-projeto' }
    };
    const info = map[type] || { label: type, class: 'type-estagio' };
    return `<span class="opp-badge-type ${info.class}">${info.label}</span>`;
}

async function initCurrentUser() {
    try {
        const data = await apiFetch('/users/me');
        currentUser = data.user;

        // Liberar botão de publicar apenas para Ex-Aluno, Professor ou Admin
        const btnPublish = document.getElementById('btnPublishOpp');
        if (btnPublish && ['ex-aluno', 'professor', 'admin'].includes(currentUser.role)) {
            btnPublish.style.display = 'block';
        }

        // Se for admin, mostrar o link de moderação na navbar
        const adminNav = document.getElementById('adminNav');
        if (adminNav && currentUser.role === 'admin') {
            adminNav.style.display = 'flex';
        }
    } catch (e) {
        console.error("Erro ao obter usuário atual:", e);
    }
}

async function loadOpportunities(type = '') {
    const oppList = document.getElementById('oppList');
    oppList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top: 2rem;">Carregando oportunidades...</p>';

    try {
        const url = type ? `/opportunities?type=${encodeURIComponent(type)}` : '/opportunities';
        const data = await apiFetch(url);

        if (!data.opportunities || data.opportunities.length === 0) {
            oppList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top: 2rem;">Nenhuma oportunidade encontrada nesta categoria.</p>';
            return;
        }

        oppList.innerHTML = '';
        data.opportunities.forEach(opp => {
            const date = new Date(opp.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const canDelete = currentUser && (opp.author_id === currentUser.id || currentUser.role === 'admin');

            const workplaceLabel = opp.workplace_type ? (opp.workplace_type.charAt(0).toUpperCase() + opp.workplace_type.slice(1)) : 'Presencial';
            const locationText = opp.location ? ` • 📍 ${escapeHtml(opp.location)}` : '';
            const companyText = opp.company ? ` • 🏢 ${escapeHtml(opp.company)}` : '';

            oppList.innerHTML += `
                <div class="opp-card" id="opp-${opp.id}">
                    <div class="opp-top">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            ${getTypeBadge(opp.type)}
                            <span style="font-size:0.8rem; color:var(--text-muted);">${workplaceLabel}${companyText}${locationText}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.8rem; color:var(--text-muted);">${date}</span>
                            ${canDelete ? `<button onclick="deleteOpportunity('${opp.id}')" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-size:0.85rem;" title="Excluir Oportunidade">🗑️</button>` : ''}
                        </div>
                    </div>

                    <h3 style="margin: 0.4rem 0 0.6rem 0; font-size:1.15rem; color:var(--text);">${escapeHtml(opp.title)}</h3>
                    <p style="color:var(--text-light); font-size:0.92rem; line-height:1.5; white-space:pre-wrap; margin-bottom: 0.8rem;">${escapeHtml(opp.description)}</p>

                    ${opp.requirements ? `
                        <div style="background:rgba(255,255,255,0.03); border-radius:6px; padding:0.6rem 0.8rem; margin-bottom:0.8rem; border-left:3px solid var(--senai-blue-light);">
                            <strong style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Requisitos:</strong>
                            <div style="font-size:0.88rem; color:var(--text-light); margin-top:2px;">${escapeHtml(opp.requirements)}</div>
                        </div>
                    ` : ''}

                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="window.location.href='user.html?id=${opp.author_id}'">
                            <span style="font-size:0.85rem; color:var(--text-muted);">Publicado por:</span>
                            <strong style="font-size:0.88rem; color:var(--text);">${escapeHtml(opp.author_name || opp.author_username)}</strong>
                            ${getRoleBadge(opp.author_role)}
                        </div>
                        <div>
                            <span style="font-size:0.85rem; font-weight:600; color:var(--senai-blue-light);">Candidatura / Contato: </span>
                            <span style="font-size:0.85rem; color:var(--text);">${escapeHtml(opp.link_or_contact)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Erro ao carregar oportunidades:", e);
    }
}

function filterType(type, btn) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadOpportunities(type);
}

function openModal() {
    const modal = document.getElementById('oppModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('oppModal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('oppForm');
    if (form) form.reset();
}

async function deleteOpportunity(id) {
    if (!confirm('Deseja realmente remover esta oportunidade?')) return;
    try {
        const data = await apiFetch(`/opportunities/${id}`, { method: 'DELETE' });
        showToast(data.message || 'Oportunidade removida.', 'success');
        loadOpportunities(currentFilter);
    } catch (e) {
        // showToast is called by apiFetch
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await initCurrentUser();
    loadOpportunities();

    const oppForm = document.getElementById('oppForm');
    if (oppForm) {
        oppForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('oppTitle').value.trim();
            const type = document.getElementById('oppType').value;
            const company = document.getElementById('oppCompany').value.trim();
            const workplace_type = document.getElementById('oppWorkplace').value;
            const location = document.getElementById('oppLocation').value.trim();
            const description = document.getElementById('oppDescription').value.trim();
            const requirements = document.getElementById('oppRequirements').value.trim();
            const link_or_contact = document.getElementById('oppContact').value.trim();

            try {
                const data = await apiFetch('/opportunities', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        type,
                        company,
                        workplace_type,
                        location,
                        description,
                        requirements,
                        link_or_contact
                    })
                });

                showToast(data.message || 'Oportunidade publicada!', 'success');
                closeModal();
                loadOpportunities(currentFilter);
            } catch (err) {
                // error handled in apiFetch
            }
        });
    }
});
