// views/notes.tsx - example feature module.
//
// Use this as the template for your own features (one file per feature/screen
// under views/):
//   1. Import bm + the row type for your table.
//   2. Import UI primitives from '../components/ui' instead of writing
//      your own Button/Input/Card markup.
//   3. Export an init(me) that wires events + does the first render.
//   4. Use bm.live(table, cb) (or bm.live.scoped for noisy tables) to
//      refresh on remote mutations.

import bm, { type User, type Note } from 'bm';
import { Button } from '../components/ui';
import { reconcileList } from '../lib/dom';

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c]);
}

async function render() {
  const ul = $('#notes') as HTMLUListElement | null;
  const empty = $('.empty');
  if (!ul) return;
  const rows: Note[] = await bm.table('notes').list({ limit: 100 });
  if (empty) empty.hidden = rows.length > 0;
  // reconcileList (lib/dom) re-renders WITHOUT flicker: it reuses unchanged rows
  // and only touches what changed. So when bm.live fires on a mutation (e.g. you
  // toggle one item), the rest of the list stays put - no flash, no lost focus,
  // no re-initialised icons. NEVER do "ul.innerHTML = rows.map(...).join('')" on
  // a live list; that rebuilds every row every time.
  reconcileList(ul, rows, n => n.id, n => `<li class="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center justify-between gap-3">
      <span>${escapeHtml(n.title)}</span>
      ${Button({ label: 'Delete', variant: 'ghost', size: 'sm', attrs: `data-id="${n.id}" data-action="delete-note"` })}
    </li>`);
}

export async function initNotes(_me: User) {
  await render();
  // Live SSE - refreshes the list on every CRUD mutation across all tabs.
  // For high-traffic tables use bm.live.scoped(table, refresh, {debounce})
  // - it debounces, dedupes concurrent fetches, and skips work when the
  // tab is hidden.
  bm.live('notes', () => render());

  $('#new-note')?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (new FormData(form).get('title') as string | null) ?? '';
    if (!title.trim()) return;
    await bm.table('notes').create({ title });
    form.reset();
    // SSE will fire bm.live and re-render.
  });

  // Delegated delete handler - uses the data-action attribute the
  // Button() component sets on each row.
  document.addEventListener('click', async (e: Event) => {
    const btn = (e.target as HTMLElement | null)?.closest('[data-action="delete-note"]') as HTMLElement | null;
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!id) return;
    await bm.table('notes').delete(id);
    // SSE fires bm.live and re-renders.
  });
}
