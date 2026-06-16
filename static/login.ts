import bm from 'bm';

const form = document.getElementById('login-form')!;
const errEl = document.getElementById('error-msg')!;
const btn = document.getElementById('submit-btn') as HTMLButtonElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (document.getElementById('email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('password') as HTMLInputElement).value;
  errEl.className = 'hidden';
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    await bm.auth.signIn(email, password);
    location.href = '/';
  } catch (err: any) {
    errEl.textContent = err?.message || 'Invalid email or password.';
    errEl.className = 'mb-4 px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-sm';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});
