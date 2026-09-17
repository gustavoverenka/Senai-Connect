redirectIfLoggedIn();

const token = getQueryParam('token');
const form = document.getElementById('reset-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

if (!token) {
  showAlert(alertBox, 'Link inválido ou incompleto. Solicite uma nova recuperação de senha.');
  form.querySelectorAll('input, button').forEach((el) => (el.disabled = true));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(alertBox);

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showAlert(alertBox, 'As senhas não coincidem.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Redefinindo...';

  try {
    const data = await Api.resetPassword({ token, newPassword });
    showAlert(alertBox, data.message, 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (err) {
    showAlert(alertBox, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Redefinir senha';
  }
});
