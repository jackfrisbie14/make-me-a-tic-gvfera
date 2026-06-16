// lib/dom.ts - keyed list rendering without the flicker.
//
// Use reconcileList instead of "container.innerHTML = rows.map(...).join('')"
// whenever a list re-renders on live data (bm.live). The innerHTML approach
// rebuilds every row each time, so an SSE refresh flashes the whole list, inputs
// lose focus, and icons re-initialise. reconcileList keeps unchanged rows exactly
// as they are and only adds / removes / replaces what actually changed.

export function reconcileList<T>(
  container: HTMLElement,
  rows: T[],
  idOf: (row: T) => string | number,
  rowHTML: (row: T) => string,
): void {
  const toEl = (html: string): HTMLElement => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild as HTMLElement;
  };
  const prev = new Map<string, HTMLElement>();
  Array.from(container.children).forEach(el => {
    const k = (el as HTMLElement).dataset.key;
    if (k != null) prev.set(k, el as HTMLElement);
  });
  // Reuse any row whose key + rendered HTML are unchanged (never touched → no flicker).
  const next = rows.map(row => {
    const key = String(idOf(row));
    const html = rowHTML(row).trim();
    const old = prev.get(key);
    if (old && old.dataset.h === html) return old;
    const el = toEl(html);
    el.dataset.key = key;
    el.dataset.h = html;
    return el;
  });
  const keep = new Set(next);
  Array.from(container.children).forEach(el => { if (!keep.has(el as HTMLElement)) el.remove(); });
  next.forEach((node, i) => {
    const cur = container.children[i];
    if (cur !== node) container.insertBefore(node, cur || null);
  });
}
