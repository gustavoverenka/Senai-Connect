// Redireciona usuários não autenticados.
if (!getToken()) logout();

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function searchUsers() {
    const query = document.getElementById('searchInput').value.trim();
    const listEl = document.getElementById('userResults');

    if (!query) {
        listEl.innerHTML = '<p style="color:var(--text-light);">Digite um termo para buscar.</p>';
        return;
    }

    try {
        const data = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
        const users = data.users || [];
        listEl.innerHTML = users.map(u => `
            <div class="user-result" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #ccc;">
                <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="window.location.href='user.html?id=${u.id}'">
                    <img src="${u.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0f172a&color=fff`}" class="avatar" alt="${escapeHtml(u.name)}" style="width:40px;height:40px;border-radius:50%;">
                    <div>
                        <strong>${escapeHtml(u.name)}</strong><br>
                        <span style="color:var(--text-light);">@${escapeHtml(u.username)}</span>
                    </div>
                </div>
                <button class="btn-primary" style="padding:5px 10px; font-size:0.9rem; width:auto;" onclick="event.stopPropagation(); toggleFollow(${u.id}, this)">Seguir</button>
            </div>`).join('') || '<p style="color:var(--text-light);">Nenhum usuário encontrado.</p>';
    } catch (error) {
        console.error("Erro na busca:", error);
    }
}

async function toggleFollow(userId, btn) {
    const isCurrentlyFollowing = btn.textContent === 'Deixar de Seguir';
    
    // Atualização otimista na interface.
    if (isCurrentlyFollowing) {
        btn.textContent = 'Seguir';
        btn.classList.replace('btn-secondary', 'btn-primary');
    } else {
        btn.textContent = 'Deixar de Seguir';
        btn.classList.replace('btn-primary', 'btn-secondary');
    }

    try {
        await apiFetch(`/users/${userId}/follow`, { method: 'POST' });
    } catch (error) {
        console.error("Erro ao seguir:", error);
        // Reverte a interface em caso de falha.
        if (isCurrentlyFollowing) {
            btn.textContent = 'Deixar de Seguir';
            btn.classList.replace('btn-primary', 'btn-secondary');
        } else {
            btn.textContent = 'Seguir';
            btn.classList.replace('btn-secondary', 'btn-primary');
        }
    }
}

document.getElementById('searchBtn').addEventListener('click', searchUsers);
document.getElementById('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchUsers(); });
