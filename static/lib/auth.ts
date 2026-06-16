// lib/auth.ts - auth state + sign-out wiring (logic, no JSX → lib/).
//
// Pattern: each feature module exports an init function that takes
// whatever data it needs and returns whatever the entry needs from it.
// Keeps the entry (app.tsx) tiny and the boundaries clear.

import bm, { type User } from 'bm';

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;

export async function initAuth(): Promise<User | null> {
  const me: User | null = await bm.auth.me();
  if (!me) {
    const anon = $('.anon');
    if (anon) anon.hidden = false;
    return null;
  }

  // Reveal the authenticated UI.
  const app = $('.app');     if (app)  app.hidden  = false;
  const who = $('.who');     if (who)  who.hidden  = false;
  const name = $('.who-name');
  if (name) name.textContent = me.first_name || me.email;

  $('[data-action="signout"]')?.addEventListener('click', async () => {
    await bm.auth.signOut();
    location.reload();
  });

  return me;
}

// initLogin - wire the login form on login.html. WITHOUT this, the
// form has no action/method and the browser does a native GET submit,
// dumping ?email=...&password=... into the URL. preventDefault + POST
// via the typed SDK instead; redirect home on success, show the error
// inline on failure.
export function initLogin() {
  const form = document.getElementById('login-form') as HTMLFormElement | null;
  if (!form) return;
  const err = form.querySelector('.error') as HTMLElement | null;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (err) err.hidden = true;
    const fd = new FormData(form);
    try {
      await bm.auth.signIn(String(fd.get('email') || ''), String(fd.get('password') || ''));
      location.href = '/';
    } catch (ex: any) {
      if (err) { err.textContent = ex?.message || 'Sign-in failed'; err.hidden = false; }
    }
  });
}

// initSignup - same for signup.html. Object.fromEntries forwards every
// field (first_name, email, password, plus any auth.signup_fields).
export function initSignup() {
  const form = document.getElementById('signup-form') as HTMLFormElement | null;
  if (!form) return;
  const err = form.querySelector('.error') as HTMLElement | null;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (err) err.hidden = true;
    const fd = new FormData(form);
    try {
      await bm.auth.signUp(Object.fromEntries(fd.entries()) as any);
      location.href = '/';
    } catch (ex: any) {
      if (err) { err.textContent = ex?.message || 'Sign-up failed'; err.hidden = false; }
    }
  });
}
