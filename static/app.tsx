// app.tsx - thin entry. Orchestration only; feature code lives under lib/ + components/ + views/.
//
// This file is compiled on-the-fly by the framework's embedded esbuild
// (Go API, no Node) into /static/app.js. esbuild bundles every file
// imported from here into one ES module.
//
// Keep this file THIN - it just wires modules together. Real code lives in:
//   lib/        - logic + data helpers (e.g. lib/auth.ts)
//   components/ - shared UI primitives (e.g. components/ui.tsx)
//   views/      - one file per feature/screen (e.g. views/notes.tsx)
// Add a feature by creating static/views/<feature>.tsx exporting an init fn,
// then import + call it below. esbuild bundles the whole graph into app.js;
// relative imports resolve .ts/.tsx so the extension is optional.
// The SDK's import map ('bm' → /_internal/bm.js) is set in index.html.

import { initAuth, initLogin, initSignup } from './lib/auth';
import { initNotes } from './views/notes';

async function boot() {
  // login.html / signup.html load this same bundle. Wire their form
  // and stop - without this the form does a native GET and leaks
  // ?email=...&password=... into the URL.
  if (document.getElementById('login-form'))  { initLogin();  return; }
  if (document.getElementById('signup-form')) { initSignup(); return; }

  const me = await initAuth();
  if (!me) return; // anon view shown by initAuth
  await initNotes(me);
}

boot().catch(err => {
  console.error('boot:', err);
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<pre style="color:red;padding:1em">' + String(err) + '</pre>'
  );
});
