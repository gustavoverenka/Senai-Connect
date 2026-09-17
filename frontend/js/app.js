/** Impede acesso a páginas internas sem estar logado. Chame no topo de cada página protegida. */
function requireAuth() {
  if (!Storage.isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/** Redireciona quem já está logado para fora das páginas de autenticação. */
function redirectIfLoggedIn() {
  if (Storage.isLoggedIn()) {
    window.location.href = 'feed.html';
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timeAgo(isoDate) {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `há ${day}d`;
  return new Date(isoDate).toLocaleDateString('pt-BR');
}

function roleLabel(role) {
  const labels = {
    aluno: 'Aluno',
    'ex-aluno': 'Ex-aluno',
    professor: 'Professor',
    admin: 'Admin',
  };
  return labels[role] || role || '';
}

function avatarOrDefault(url) {
  if (url) return url;
  return 'https://api.dicebear.com/7.x/initials/svg?seed=SC&backgroundColor=3b82f6';
}

function showAlert(container, message, type = 'error') {
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function clearAlert(container) {
  if (container) container.innerHTML = '';
}

/** Monta a navbar padrão dentro de #navbar-root, se o elemento existir na página. */
function renderNavbar(activePage) {
  const root = document.getElementById('navbar-root');
  if (!root) return;

  const user = Storage.getUser();
  if (!user) return;

  const isAdmin = user.role === 'admin';

  const links = [
    { href: 'feed.html', label: 'Feed', key: 'feed' },
    { href: 'search.html', label: 'Buscar', key: 'search' },
    { href: 'opportunities.html', label: 'Oportunidades', key: 'opportunities' },
    { href: 'messages.html', label: 'Mensagens', key: 'messages' },
  ];
  if (isAdmin) links.push({ href: 'admin.html', label: 'Admin', key: 'admin' });

  const linksHtml = links
    .map(
      (l) =>
        `<a href="${l.href}" class="${activePage === l.key ? 'active' : ''}">${l.label}</a>`
    )
    .join('');

  root.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="feed.html" class="navbar-brand">SENAI Connect</a>
        <div class="navbar-links">${linksHtml}</div>
        <div class="navbar-actions">
          <button class="notif-bell" id="notif-bell-btn" title="Notificações" aria-label="Notificações">
            Notificações
            <span class="notif-badge hidden" id="notif-badge-count">0</span>
          </button>
          <a href="profile.html" title="Meu perfil">
            <img class="navbar-avatar" src="${avatarOrDefault(user.profile_picture)}" alt="${escapeHtml(user.name)}">
          </a>
          <button class="btn-icon" id="logout-btn" title="Sair">Sair</button>
        </div>
      </div>
    </nav>
  `;

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('notif-bell-btn').addEventListener('click', () => {
    window.location.href = 'notifications.html';
  });

  refreshNotifBadge();
}

async function refreshNotifBadge() {
  const badge = document.getElementById('notif-badge-count');
  if (!badge) return;
  try {
    const data = await Api.getNotifications();
    if (data.unreadCount > 0) {
      badge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (_) {
    
  }
}

function logout() {
  Storage.clearAll();
  window.location.href = 'login.html';
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
