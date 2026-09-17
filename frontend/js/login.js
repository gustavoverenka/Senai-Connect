redirectIfLoggedIn();

const form = document.getElementById('login-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(alertBox);

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Entrando...';

  try {
    const data = await Api.login({ email, password });
    Storage.setToken(data.token);
    Storage.setUser(data.user);
    window.location.href = 'feed.html';
  } catch (err) {
    showAlert(alertBox, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});
