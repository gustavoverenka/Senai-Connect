requireAuth();
renderNavbar('search');

const resultsBox = document.getElementById('results');

async function runSearch() {
  const params = {};
  const q = document.getElementById('search-q').value.trim();
  const role = document.getElementById('filter-role').value;
  const mentoring = document.getElementById('filter-mentoring').value;
  const course = document.getElementById('filter-course').value.trim();
  const unit = document.getElementById('filter-unit').value.trim();

  if (q) params.q = q;
  if (role) params.role = role;
  if (mentoring) params.mentoring = mentoring;
  if (course) params.course = course;
  if (unit) params.unit = unit;

  resultsBox.innerHTML = '<div class="spinner"></div>';

  try {
    const data = await Api.searchUsers(params);
    if (!data.users || data.users.length === 0) {
      resultsBox.innerHTML = '<p class="empty-state">Nenhuma pessoa encontrada com esses filtros.</p>';
      return;
    }
    resultsBox.innerHTML = data.users
      .map(
        (u) => `
        <a href="profile.html?id=${u.id}" class="list-item">
          <img src="${avatarOrDefault(u.profile_picture)}" alt="">
          <div class="list-item-body">
            <div class="list-item-title">${escapeHtml(u.name)} <span class="badge">${roleLabel(u.role)}</span>
              ${u.open_for_mentoring ? '<span class="badge badge-green">Mentoria</span>' : ''}
            </div>
            <div class="list-item-sub">
              @${escapeHtml(u.username)}
              ${u.course ? ' · ' + escapeHtml(u.course) : ''}
              ${u.graduated_course ? ' · ' + escapeHtml(u.graduated_course) : ''}
              ${u.unit ? ' · ' + escapeHtml(u.unit) : ''}
            </div>
          </div>
        </a>`
      )
      .join('');
  } catch (err) {
    resultsBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

document.getElementById('search-btn').addEventListener('click', runSearch);
document.getElementById('search-q').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runSearch();
});
