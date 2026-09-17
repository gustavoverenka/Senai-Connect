requireAuth();
renderNavbar('feed');

const listBox = document.getElementById('notif-list');

const typeIcon = { like: '❤️', comment: '💬', follow: '➕' };

function linkForNotification(n) {
  if (n.type === 'follow') return `profile.html?id=${n.actor.id}`;
  return 'feed.html';
}

function renderNotification(n) {
  return `
    <a href="${linkForNotification(n)}" class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <img src="${avatarOrDefault(n.actor?.profile_picture)}" alt="">
      <div style="flex:1;">
        <div class="notif-text">
          <strong>${typeIcon[n.type] || '🔔'} ${escapeHtml(n.actor?.name || 'Alguém')}</strong>
          ${escapeHtml(n.text)}
        </div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
    </a>
  `;
}

async function loadNotifications() {
  try {
    const data = await Api.getNotifications();
    if (!data.notifications || data.notifications.length === 0) {
      listBox.innerHTML = '<p class="empty-state">Você não tem notificações ainda.</p>';
      return;
    }
    listBox.innerHTML = data.notifications.map(renderNotification).join('');

    listBox.querySelectorAll('.notif-item').forEach((el) => {
      el.addEventListener('click', async () => {
        if (el.classList.contains('unread')) {
          try {
            await Api.markNotificationRead(el.dataset.id);
            el.classList.remove('unread');
          } catch (_) {}
        }
      });
    });
  } catch (err) {
    listBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

document.getElementById('mark-all-btn').addEventListener('click', async () => {
  try {
    await Api.markAllNotificationsRead();
    document.querySelectorAll('.notif-item.unread').forEach((el) => el.classList.remove('unread'));
    refreshNotifBadge();
  } catch (err) {
    alert(err.message);
  }
});

loadNotifications();
