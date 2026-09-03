if (!getToken()) logout();

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const urlParams = new URLSearchParams(window.location.search);
const otherUserId = urlParams.get('id');

if (!otherUserId) {
    showToast("Usuário não especificado.");
    window.location.href = "search.html";
}

let myId = null;
let pollInterval = null;
let isFirstLoad = true;
let isSending = false;

async function loadChat() {
    try {
        const me = await apiFetch('/users/me');
        myId = me.user.id;

        const otherUser = await apiFetch(`/users/${otherUserId}`);
        const user = otherUser.user;
        document.getElementById('chatName').textContent = user.name;
        document.getElementById('chatAvatar').src = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f172a&color=fff`;

        await fetchMessages();

        if (!pollInterval) {
            pollInterval = setInterval(fetchMessages, 2500);
        }
    } catch (error) {
        console.error("Erro ao carregar chat:", error);
    }
}

async function fetchMessages() {
    if (isSending) return;

    try {
        const data = await apiFetch(`/messages/${otherUserId}`);
        const messages = data.conversation || [];
        const chatBox = document.getElementById('chatMessages');

        if (messages.length === 0) {
            chatBox.innerHTML = '<p style="text-align:center; color:var(--text-light); margin:auto;">Sem mensagens. Diga oi!</p>';
            return;
        }

        const isNearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 120;

        const newHtml = messages.map(msg => {
            const isMine = msg.sender_id === myId;
            return `
                <div class="message-bubble ${isMine ? 'message-mine' : 'message-theirs'}">
                    ${escapeHtml(msg.content)}
                </div>
            `;
        }).join('');

        if (chatBox.innerHTML !== newHtml) {
            chatBox.innerHTML = newHtml;

            if (isFirstLoad || isNearBottom) {
                chatBox.scrollTop = chatBox.scrollHeight;
                isFirstLoad = false;
            }
        }
    } catch (error) {
        console.error("Erro ao carregar mensagens:", error);
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content || isSending) return;

    isSending = true;

    const chatBox = document.getElementById('chatMessages');
    const noMsg = chatBox.querySelector('p');
    if (noMsg) noMsg.remove();
    
    const div = document.createElement('div');
    div.className = 'message-bubble message-mine';
    div.textContent = content;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    input.value = '';

    try {
        await apiFetch(`/messages/${otherUserId}`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        await fetchMessages();
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        div.style.backgroundColor = 'red';
        div.title = 'Erro ao enviar';
    } finally {
        isSending = false;
    }
}

window.addEventListener('beforeunload', () => {
    if (pollInterval) clearInterval(pollInterval);
});

document.getElementById('messageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

window.addEventListener('DOMContentLoaded', loadChat);