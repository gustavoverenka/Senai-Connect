requireAuth();
renderNavbar('opportunities');

const currentUser = Storage.getUser();
const listBox = document.getElementById('opportunities-list');
const createCard = document.getElementById('create-card');

// Apenas ex-aluno, professor ou admin podem publicar 
const canCreate = ['ex-aluno', 'professor', 'admin'].includes(currentUser.role);
if (!canCreate) createCard.classList.add('hidden');

const typeLabels = { estagio: 'Estágio', emprego: 'Emprego', mentoria: 'Mentoria', projeto: 'Projeto' };
const workplaceLabels = { remoto: 'Remoto', hibrido: 'Híbrido', presencial: 'Presencial' };

function renderOpportunity(opp) {
  const canDelete = opp.author_id === currentUser.id || currentUser.role === 'admin';
  return `
    <div class="card opportunity-card" data-opp-id="${opp.id}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div>
          <h3 class="mt-0 mb-0">${escapeHtml(opp.title)}</h3>
          <div class="opportunity-meta">
            <span class="badge">${typeLabels[opp.type] || opp.type}</span>
            <span class="badge badge-green">${workplaceLabels[opp.workplace_type] || opp.workplace_type}</span>
          </div>
        </div>
        ${canDelete ? '<button class="btn-icon delete-opp-btn" title="Remover"></button>' : ''}
      </div>

      <div class="opportunity-meta">
        ${opp.company ? `<span> ${escapeHtml(opp.company)}</span>` : ''}
        ${opp.location ? `<span> ${escapeHtml(opp.location)}</span>` : ''}
        <span> ${timeAgo(opp.created_at)}</span>
      </div>

      <p>${escapeHtml(opp.description)}</p>
      ${opp.requirements ? `<p><strong>Requisitos:</strong> ${escapeHtml(opp.requirements)}</p>` : ''}

      <p><strong>Candidatura:</strong> ${escapeHtml(opp.link_or_contact)}</p>

      <div class="opportunity-meta">
        Publicado por <a href="profile.html?id=${opp.author_id}">${escapeHtml(opp.author_name)}</a> (${roleLabel(opp.author_role)})
      </div>
    </div>
  `;
}

async function loadOpportunities() {
  listBox.innerHTML = '<div class="spinner"></div>';
  const params = {};
  const type = document.getElementById('filter-type').value;
  const workplace = document.getElementById('filter-workplace').value;
  if (type) params.type = type;
  if (workplace) params.workplace_type = workplace;

  try {
    const data = await Api.getOpportunities(params);
    if (!data.opportunities || data.opportunities.length === 0) {
      listBox.innerHTML = '<div class="card empty-state">Nenhuma oportunidade encontrada.</div>';
      return;
    }
    listBox.innerHTML = data.opportunities.map(renderOpportunity).join('');
    listBox.querySelectorAll('.delete-opp-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-opp-id]');
        if (!confirm('Remover esta oportunidade?')) return;
        try {
          await Api.deleteOpportunity(card.dataset.oppId);
          card.remove();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    listBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

document.getElementById('filter-btn').addEventListener('click', loadOpportunities);

if (canCreate) {
  const form = document.getElementById('create-form');
  const alertBox = document.getElementById('create-alert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertBox);

    const payload = {
      title: document.getElementById('opp-title').value.trim(),
      type: document.getElementById('opp-type').value,
      company: document.getElementById('opp-company').value.trim(),
      workplace_type: document.getElementById('opp-workplace').value,
      location: document.getElementById('opp-location').value.trim(),
      description: document.getElementById('opp-description').value.trim(),
      requirements: document.getElementById('opp-requirements').value.trim(),
      link_or_contact: document.getElementById('opp-contact').value.trim(),
    };

    try {
      const data = await Api.createOpportunity(payload);
      showAlert(alertBox, data.message, 'success');
      form.reset();
      loadOpportunities();
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  });
}

loadOpportunities();
