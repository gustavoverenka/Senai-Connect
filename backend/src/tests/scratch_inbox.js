// Redireciona usuários não autenticados
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
let currentType = '';

async function init() {
    try {
        const meData = await apiFetch('/users/me');
        currentUser = meData.user;

        // Se for ex-aluno, professor ou admin, pode publicar oportunidade
        const btnPublish = document.getElementById('btnPublishOpp');
        if (['ex-aluno', 'professor', 'admin'].includes(currentUser.role) && btnPublish) {
            btnPublish.style.display = 'inline-flex';
        }

        loadOpportunities();
    } catch (e) {
        console.error("Erro na inicialização:", e);
    }
}

async function loadOpportunities() {
    const listEl = document.getElementById('oppList');
    listEl.innerHTML = '<p style="text-align:center; color:var(--text-light);">Carregando oportunidades...</p>';

    let endpoint = '/opportunities';
    if (currentType) endpoint += `?type=${encodeURIComponent(currentType)}`;

    try {
        const data = await apiFetch(endpoint);
        const opps = data.opportunities || [];

        if (opps.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center; padding: 3rem 1rem; background: var(--card); border-radius:12px; border: 1px solid var(--border);">
                    <p style="color:var(--text-light); margin-bottom:1rem;">Nenhuma oportunidade encontrada nesta categoria.</p>
                    ${['ex-aluno', 'professor', 'admin'].includes(currentUser?.role) ? '<button class="btn-primary" style="width:auto;" onclick="openModal()">Publicar Primeira Vaga</button>' : ''}
                </div>
            `;
            return;
        }

        listEl.innerHTML = opps.map(opp => {
            const date = new Date(opp.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const typeClass = `type-${opp.type || 'estagio'}`;
            const typeLabel = {
                estagio: '🎓 Estágio',
                emprego: '💼 Emprego',
                mentoria: '🤝 Mentoria',
                projeto: '🚀 Projeto'
            }[opp.type] || opp.type;

            const canDelete = opp.author_id === currentUser?.id || currentUser?.role === 'admin';

            return `
                <div class="opp-card" id="opp-${opp.id}">
                    <div class="opp-top">
                        <div>
                            <span class="opp-badge-type ${typeClass}">${typeLabel}</span>
                            <span style="font-size:0.8rem; color:var(--text-muted); margin-left:8px;">${opp.workplace_type.toUpperCase()} • ${escapeHtml(opp.location || 'Brasil')}</span>
                            <h3 style="margin-top:8px; font-size:1.15rem; color:var(--text);">${escapeHtml(opp.title)}</h3>
                            ${opp.company ? `<div style="color:var(--senai-blue-light); font-size:0.9rem; font-weight:600;">🏢 ${escapeHtml(opp.company)}</div>` : ''}
                        </div>
                        ${canDelete ? `<button onclick="deleteOpp('${opp.id}')" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-size:0.85rem;">Excluir</button>` : ''}
                    </div>

                    <p style="color:var(--text); font-size:0.95rem; margin: 0.75rem 0; line-height:1.6; white-space: pre-wrap;">${escapeHtml(opp.description)}</p>

                    ${opp.requirements ? `
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.75rem; font-size:0.85rem;">
                            <strong style="color:var(--text-light);">Requisitos:</strong> ${escapeHtml(opp.requirements)}
                        </div>
                    ` : ''}

                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="${opp.author_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(opp.author_name)}&background=005aa9&color=fff`}" class="avatar" style="width:32px; height:32px;" alt="Autor">
                            <span style="font-size:0.85rem; color:var(--text-light);">Publicado por <strong>${escapeHtml(opp.author_name)}</strong> ${getRoleBadge(opp.author_role)}</span>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <a href="chat.html?id=${opp.author_id}" class="btn-secondary" style="font-size:0.85rem; padding:0.4rem 0.8rem;">Mandar Mensagem</a>
                            <a href="${opp.link_or_contact.startsWith('http') ? opp.link_or_contact : 'mailto:' + opp.link_or_contact}" target="_blank" class="btn-primary" style="font-size:0.85rem; padding:0.4rem 1rem; width:auto; margin-top:0;">Candidatar-se / Contato</a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Erro ao carregar oportunidades:", e);
    }
}

function filterType(type, btn) {
    currentType = type;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadOpportunities();
}

function openModal() {
    const m = document.getElementById('oppModal');
    if (m) m.style.display = 'flex';
}

function closeModal() {
    const m = document.getElementById('oppModal');
    if (m) m.style.display = 'none';
}

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
            await apiFetch('/opportunities', {
                method: 'POST',
                body: JSON.stringify({
                    title, type, company, workplace_type, location, description, requirements, link_or_contact
                })
            });
            showToast('Oportunidade publicada!', 'success');
            oppForm.reset();
            closeModal();
            loadOpportunities();
        } catch (err) {
            console.error(err);
        }
    });
}

async function deleteOpp(id) {
    if (!confirm('Deseja realmente excluir esta oportunidade?')) return;
    try {
        await apiFetch(`/opportunities/${id}`, { method: 'DELETE' });
        showToast('Oportunidade removida.', 'success');
        loadOpportunities();
    } catch (e) {
        console.error(e);
    }
}

window.addEventListener('DOMContentLoaded', init);

