/* =========================================================
   SENAI Connect — Lógica da página de Mensagens
   Suporta abrir direto uma conversa via ?to=<userId>
   ========================================================= */

requireAuth();
renderNavbar('messages');

const myUser = Storage.getUser();
const inboxList = document.getElementById('inbox-list');
const chatPanel = document.getElementById('chat-panel');

let currentContact = null;
let pollTimer = null;

async function loadInbox() {
  try {
    const data = await Api.getInbox();
    renderInbox(data.inbox);

    const startWithId = getQueryParam('to');
    if (startWithId && !currentContact) {
      const existing = data.inbox.find((i) => i.contact.id === startWithId);
      if (existing) {
        openConversation(existing.contact);
      } else {
        // Conversa nova: busca dados básicos do usuário para abrir o chat vazio
        try {
          const profile = await Api.getUserProfile(startWithId);
          openConversation({
            id: profile.user.id,
            name: profile.user.name,
            username: profile.user.username,
            profile_picture: profile.user.profile_picture,
          });
        } catch (_) {}
      }
    }
  } catch (err) {
    inboxList.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function renderInbox(inbox) {
  if (!inbox || inbox.length === 0) {
    inboxList.innerHTML = '<p class="empty-state">Nenhuma conversa ainda. Busque alguém para conversar.</p>';
    return;
  }
  inboxList.innerHTML = inbox
    .map((item) => {
      const unread = !item.isMine && !item.isRead;
      return `
      <div class="inbox-item ${unread ? 'unread' : ''} ${currentContact?.id === item.contact.id ? 'active' : ''}" data-user-id="${item.contact.id}">
        <img src="${avatarOrDefault(item.contact.profile_picture)}" alt="">
        <div class="list-item-body">
          <div class="list-item-title">${escapeHtml(item.contact.name)}</div>
          <div class="list-item-sub">${item.isMine ? 'Você: ' : ''}${escapeHtml(item.lastMessage)}</div>
        </div>
      </div>`;
    })
    .join('');

  inboxList.querySelectorAll('.inbox-item').forEach((el) => {
    el.addEventListener('click', () => {
      const userId = el.dataset.userId;
      const item = inbox.find((i) => i.contact.id === userId);
      if (item) openConversation(item.contact);
    });
  });
}

function openConversation(contact) {
  currentContact = contact;

  document.querySelectorAll('.inbox-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.userId === contact.id);
  });

  chatPanel.innerHTML = `
    <div class="chat-header">
      <img class="navbar-avatar" src="${avatarOrDefault(contact.profile_picture)}" alt="">
      <div>
        <div class="list-item-title">${escapeHtml(contact.name)}</div>
        <div class="list-item-sub">@${escapeHtml(contact.username || '')}</div>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages"><div class="spinner"></div></div>
    <form class="chat-input-row" id="chat-form">
      <input type="text" id="chat-input" placeholder="Escreva uma mensagem..." maxlength="2000" required autocomplete="off">
      <button type="submit" class="btn btn-primary">Enviar</button>
    </form>
  `;

  document.getElementById('chat-form').addEventListener('submit', sendMessageHandler);

  loadConversation();

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(loadConversation, 8000);
}

async function loadConversation() {
  if (!currentContact) return;
  try {
    const data = await Api.getConversation(currentContact.id);
    renderMessages(data.conversation);
  } catch (err) {
    const box = document.getElementById('chat-messages');
    if (box) box.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function renderMessages(messages) {
  const box = document.getElementById('chat-messages');
  if (!box) return;
  const wasNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;

  if (!messages || messages.length === 0) {
    box.innerHTML = '<p class="empty-state">Diga oi! 👋 Envie a primeira mensagem.</p>';
    return;
  }

  box.innerHTML = messages
    .map((m) => {
      const mine = m.sender_id === myUser.id;
      return `
      <div class="chat-bubble ${mine ? 'mine' : 'theirs'}">
        ${escapeHtml(m.content)}
        <span class="chat-time">${timeAgo(m.created_at)}</span>
      </div>`;
    })
    .join('');

  if (wasNearBottom) box.scrollTop = box.scrollHeight;
}

async function sendMessageHandler(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content || !currentContact) return;

  input.disabled = true;
  try {
    await Api.sendMessage(currentContact.id, content);
    input.value = '';
    await loadConversation();
    loadInbox();
  } catch (err) {
    alert(err.message);
  } finally {
    input.disabled = false;
    input.focus();
  }
}

loadInbox();
