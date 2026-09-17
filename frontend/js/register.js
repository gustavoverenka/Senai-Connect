redirectIfLoggedIn();

let selectedRole = 'aluno';

document.querySelectorAll('.role-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.role-fields').forEach((f) => f.classList.remove('active'));

    tab.classList.add('active');
    selectedRole = tab.dataset.role;
    document.getElementById(`fields-${selectedRole}`).classList.add('active');
  });
});

const form = document.getElementById('register-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(alertBox);

  const payload = {
    name: document.getElementById('name').value.trim(),
    username: document.getElementById('username').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    unit: document.getElementById('unit').value.trim(),
    role: selectedRole,
  };

  if (selectedRole === 'aluno') {
    payload.course = document.getElementById('course').value.trim();
    payload.class_period = document.getElementById('class_period').value.trim();
    payload.registration_number = document.getElementById('registration_number').value.trim();
  } else if (selectedRole === 'ex-aluno') {
    payload.graduated_course = document.getElementById('graduated_course').value.trim();
    const gradYear = document.getElementById('graduation_year').value;
    if (gradYear) payload.graduation_year = parseInt(gradYear, 10);
    payload.current_company = document.getElementById('current_company').value.trim();
    payload.current_position = document.getElementById('current_position').value.trim();
    payload.linkedin_url = document.getElementById('linkedin_url').value.trim();
    payload.open_for_mentoring = document.getElementById('open_for_mentoring').checked;
  } else if (selectedRole === 'professor') {
    const areas = document.getElementById('teaching_areas').value.trim();
    payload.teaching_areas = areas ? areas.split(',').map((a) => a.trim()).filter(Boolean) : [];
    payload.teacher_code = document.getElementById('teacher_code').value.trim();
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Criando conta...';

  try {
    const data = await Api.register(payload);
    sessionStorage.setItem('sc_pending_email', payload.email);
    showAlert(alertBox, data.message, 'success');
    setTimeout(() => {
      window.location.href = 'verify.html';
    }, 1200);
  } catch (err) {
    showAlert(alertBox, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Criar conta';
  }
});
