const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Configuração do seletor de Role na tela de cadastro
const roleOptions = document.querySelectorAll('.role-option');
const roleInput = document.getElementById('role');

if (roleOptions && roleInput) {
    roleOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            roleOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const selectedRole = opt.getAttribute('data-role');
            roleInput.value = selectedRole;

            // Exibir apenas os campos da role selecionada
            const fieldsAluno = document.getElementById('fields-aluno');
            const fieldsExAluno = document.getElementById('fields-ex-aluno');
            const fieldsProfessor = document.getElementById('fields-professor');

            if (fieldsAluno) fieldsAluno.style.display = selectedRole === 'aluno' ? 'block' : 'none';
            if (fieldsExAluno) fieldsExAluno.style.display = selectedRole === 'ex-aluno' ? 'block' : 'none';
            if (fieldsProfessor) fieldsProfessor.style.display = selectedRole === 'professor' ? 'block' : 'none';
        });
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn = loginForm.querySelector('button');
        btn.textContent = 'Entrando...';
        btn.disabled = true;

        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            setToken(data.token);
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            window.location.href = 'pages/feed.html';
        } catch (error) {
            btn.textContent = 'Entrar no SENAI Connect';
            btn.disabled = false;
        }
    });
}

if (registerForm) {
    let savedEmail = '';

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('role').value;
        const name = document.getElementById('name').value.trim();
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const unit = document.getElementById('unit').value.trim();

        // Monta o payload conforme a role
        const payload = { name, username, email, password, role, unit };

        if (role === 'aluno') {
            payload.course = document.getElementById('course').value.trim();
            payload.class_period = document.getElementById('class_period').value.trim();
        } else if (role === 'ex-aluno') {
            payload.graduated_course = document.getElementById('graduated_course').value.trim();
            payload.current_company = document.getElementById('current_company').value.trim();
            payload.linkedin_url = document.getElementById('linkedin_url').value.trim();
            payload.open_for_mentoring = document.getElementById('open_for_mentoring').checked;
        } else if (role === 'professor') {
            const areasStr = document.getElementById('teaching_areas').value.trim();
            payload.teaching_areas = areasStr ? areasStr.split(',').map(s => s.trim()) : [];
            payload.teacher_code = document.getElementById('teacher_code').value.trim();
        }

        const btn = registerForm.querySelector('button');
        btn.textContent = 'Criando conta...';
        btn.disabled = true;

        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            savedEmail = email;
            registerForm.style.display = 'none';
            document.querySelector('.auth-title').textContent = 'Ativação de Conta';
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
            const code = document.getElementById('verifyCode').value.trim();
            const btn = verifyForm.querySelector('button');
            
            btn.textContent = 'Verificando...';
            btn.disabled = true;

            try {
                await apiFetch('/auth/verify-email', {
                    method: 'POST',
                    body: JSON.stringify({ email: savedEmail, code })
                });
                showToast('Conta ativada com sucesso! Você já pode fazer login.', 'success');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1000);
            } catch (error) {
                btn.textContent = 'Ativar Conta';
                btn.disabled = false;
            }
        });
    }
}

