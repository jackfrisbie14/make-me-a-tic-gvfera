import bm from 'bm';

const form = document.getElementById('signup-form')!;
const errEl = document.getElementById('error-msg')!;
const btn = document.getElementById('submit-btn') as HTMLButtonElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const first_name = (document.getElementById('first_name') as HTMLInputElement).value.trim();
  const email = (document.getElementById('email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('password') as HTMLInputElement).value;
  errEl.className = 'hidden';
  btn.disabled = true;
  btn.textContent = 'Creating account…';
  try {
    await bm.auth.signUp({ email, password, first_name });
    location.href = '/';
  } catch (err: any) {
    errEl.textContent = err?.message || 'Signup failed. Please try again.';
    errEl.className = 'mb-4 px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-sm';
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});
