const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = loginForm.querySelector('button');
        btn.textContent = 'Aguarde...';
        btn.disabled = true;

        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            setToken(data.token);
            window.location.href = 'pages/feed.html';
        } catch (error) {
            btn.textContent = 'Entrar';
            btn.disabled = false;
        }
    });
}

if (registerForm) {
    let savedEmail = '';

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = registerForm.querySelector('button');
        
        btn.textContent = 'Registrando...';
        btn.disabled = true;

        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, username, email, password, role: 'aluno' })
            });
            savedEmail = email;
            registerForm.style.display = 'none';
            document.querySelector('.auth-title').textContent = 'Verificar E-mail';
            document.getElementById('verifyForm').style.display = 'block';
        } catch (error) {
            btn.textContent = 'Finalizar Cadastro';
            btn.disabled = false;
        }
    });

    const verifyForm = document.getElementById('verifyForm');
    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('verifyCode').value;
            const btn = verifyForm.querySelector('button');
            
            btn.textContent = 'Verificando...';
            btn.disabled = true;

            try {
                await apiFetch('/auth/verify-email', {
                    method: 'POST',
                    body: JSON.stringify({ email: savedEmail, code })
                });
                showToast('Conta ativada com sucesso! Você já pode fazer login.', 'success');
                window.location.href = '../index.html';
            } catch (error) {
                btn.textContent = 'Ativar Conta';
                btn.disabled = false;
            }
        });
    }
}
