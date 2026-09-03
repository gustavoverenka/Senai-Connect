if (!getToken()) logout();

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadInbox() {
    try {
        const data = await apiFetch('/messages/inbox');
        const inboxList = document.getElementById('inboxList');
        
        if (!data.inbox || data.inbox.length === 0) {
            inboxList.innerHTML = '<p style="text-align:center; color:var(--text-light);">Você ainda não tem conversas. Busque alguém e mande um oi!</p>';
            return;
        }

        inboxList.innerHTML = data.inbox.map(item => {
            const contact = item.contact;
            const avatarUrl = contact.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=0f172a&color=fff`;
            const unread = (!item.isMine && !item.isRead) ? '<span class="unread-dot"></span>' : '';
            
            return `
                <a href="chat.html?id=${contact.id}" class="inbox-item">
                    <img src="${avatarUrl}" class="avatar" alt="Avatar">
                    <div class="inbox-info">
                        <h4>${escapeHtml(contact.name)} ${unread}</h4>
                        <p>${item.isMine ? 'Você: ' : ''}${escapeHtml(item.lastMessage)}</p>
                    </div>
                </a>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar inbox:", error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadInbox();
    // Atualiza a lista de conversas a cada 5 segundos
    setInterval(loadInbox, 5000);
});
