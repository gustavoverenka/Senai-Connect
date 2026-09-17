redirectIfLoggedIn();

const pendingEmail = sessionStorage.getItem('sc_pending_email');
if (pendingEmail) {
  document.getElementById('email').value = pendingEmail;
}

const form = document.getElementById('verify-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(alertBox);

  const email = document.getElementById('email').value.trim();
  const code = document.getElementById('code').value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Verificando...';

  try {
    const data = await Api.verifyEmail({ email, code });
    sessionStorage.removeItem('sc_pending_email');
    showAlert(alertBox, data.message, 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (err) {
    showAlert(alertBox, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Ativar conta';
  }
});
