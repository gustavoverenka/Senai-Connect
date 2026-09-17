redirectIfLoggedIn();

const form = document.getElementById('forgot-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(alertBox);

  const email = document.getElementById('email').value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    const data = await Api.forgotPassword({ email });
    showAlert(alertBox, data.message, 'success');
  } catch (err) {
    showAlert(alertBox, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar link de recuperação';
  }
});
