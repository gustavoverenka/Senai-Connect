requireAuth();
renderNavbar('feed');

const myUser = Storage.getUser();
const targetId = getQueryParam('id');
const isOwnProfile = !targetId || targetId === myUser.id;

const headerBox = document.getElementById('profile-header');
const editBioCard = document.getElementById('edit-bio-card');
const avatarCard = document.getElementById('avatar-card');

function renderHeader(user, isFollowing) {
  const stats = `
    <div class="profile-stats">
      <div><strong id="followers-count">—</strong><span>Seguidores</span></div>
      <div><strong id="following-count">—</strong><span>Seguindo</span></div>
    </div>
  `;

  let roleDetails = '';
  if (user.role === 'aluno' && user.course) {
    roleDetails = `<p class="form-hint"> ${escapeHtml(user.course)} ${user.class_period ? '· ' + escapeHtml(user.class_period) : ''}</p>`;
  } else if (user.role === 'ex-aluno') {
    const parts = [];
    if (user.graduated_course) parts.push(escapeHtml(user.graduated_course));
    if (user.graduation_year) parts.push(user.graduation_year);
    if (user.current_position && user.current_company) {
      parts.push(`${escapeHtml(user.current_position)} @ ${escapeHtml(user.current_company)}`);
    }
    roleDetails = `<p class="form-hint">🎓 ${parts.join(' · ')}</p>`;
    if (user.open_for_mentoring) {
      roleDetails += '<span class="badge badge-green">Disponível para mentoria</span>';
    }
    if (user.linkedin_url) {
      roleDetails += `<p><a href="${escapeHtml(user.linkedin_url)}" target="_blank" rel="noopener">Ver LinkedIn ↗</a></p>`;
    }
  } else if (user.role === 'professor' && user.teaching_areas?.length) {
    roleDetails = `<p class="form-hint"> ${user.teaching_areas.map(escapeHtml).join(', ')}</p>`;
  }

  headerBox.innerHTML = `
    <div class="profile-card">
      <img class="profile-avatar-lg" src="${avatarOrDefault(user.profile_picture)}" alt="Avatar">
      <p class="profile-name">${escapeHtml(user.name)} <span class="badge">${roleLabel(user.role)}</span></p>
      <p class="profile-username">@${escapeHtml(user.username)} ${user.unit ? '· ' + escapeHtml(user.unit) : ''}</p>
      ${roleDetails}
      ${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : '<p class="profile-bio form-hint">Sem bio ainda.</p>'}
      ${stats}
      <div id="profile-actions"></div>
    </div>
  `;

  const actions = document.getElementById('profile-actions');
  if (isOwnProfile) {
    actions.innerHTML = `<button class="btn btn-outline btn-sm" id="toggle-edit-btn"> Editar perfil</button>`;
    document.getElementById('toggle-edit-btn').addEventListener('click', () => {
      editBioCard.classList.toggle('hidden');
      avatarCard.classList.toggle('hidden');
    });
    document.getElementById('bio-input').value = user.bio || '';
  } else {
    actions.innerHTML = `
      <button class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn-sm" id="follow-btn">
        ${isFollowing ? 'Deixar de seguir' : 'Seguir'}
      </button>
      <a class="btn btn-outline btn-sm" href="messages.html?to=${user.id}">Enviar mensagem</a>
    `;
    document.getElementById('follow-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const res = await Api.toggleFollow(user.id);
        btn.textContent = res.following ? 'Deixar de seguir' : 'Seguir';
        btn.classList.toggle('btn-primary', !res.following);
        btn.classList.toggle('btn-secondary', res.following);
        loadFollowCounts(user.id);
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }
}

async function loadFollowCounts(id) {
  try {
    const [followersData, followingData] = await Promise.all([Api.getFollowers(id), Api.getFollowing(id)]);
    document.getElementById('followers-count').textContent = followersData.followers.length;
    document.getElementById('following-count').textContent = followingData.following.length;
    renderPeopleList('followers-list', followersData.followers);
    renderPeopleList('following-list', followingData.following);
  } catch (_) {
    // silencioso
  }
}

function renderPeopleList(containerId, users) {
  const box = document.getElementById(containerId);
  if (!users || users.length === 0) {
    box.innerHTML = '<p class="empty-state">Ninguém por aqui ainda.</p>';
    return;
  }
  box.innerHTML = users
    .map(
      (u) => `
      <a href="profile.html?id=${u.id}" class="list-item">
        <img src="${avatarOrDefault(u.profile_picture)}" alt="">
        <div class="list-item-body">
          <div class="list-item-title">${escapeHtml(u.name)}</div>
          <div class="list-item-sub">@${escapeHtml(u.username)} · ${roleLabel(u.role)}</div>
        </div>
      </a>`
    )
    .join('');
}

// Tabs seguidores/seguindo
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('followers-list').classList.toggle('hidden', btn.dataset.tab !== 'followers');
    document.getElementById('following-list').classList.toggle('hidden', btn.dataset.tab !== 'following');
  });
});

// Edição de bio
document.getElementById('bio-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById('bio-alert');
  clearAlert(alertBox);
  const bio = document.getElementById('bio-input').value;
  try {
    const data = await Api.updateBio(bio);
    Storage.setUser(data.user);
    showAlert(alertBox, data.message, 'success');
    renderHeader(data.user, false);
  } catch (err) {
    showAlert(alertBox, err.message);
  }
});

// Upload de avatar
document.getElementById('avatar-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const alertBox = document.getElementById('avatar-alert');
  clearAlert(alertBox);

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const data = await Api.uploadAvatar(formData);
    Storage.setUser(data.user);
    showAlert(alertBox, data.message, 'success');
    renderHeader(data.user, false);
    renderNavbar('feed');
  } catch (err) {
    showAlert(alertBox, err.message);
  }
});

async function init() {
  try {
    let user, isFollowing = false;
    if (isOwnProfile) {
      const data = await Api.getMyProfile();
      user = data.user;
    } else {
      const data = await Api.getUserProfile(targetId);
      user = data.user;
      isFollowing = data.isFollowing;
    }
    renderHeader(user, isFollowing);
    loadFollowCounts(user.id);
  } catch (err) {
    headerBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

init();
