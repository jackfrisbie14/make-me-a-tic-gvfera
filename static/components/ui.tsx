// components/ui.tsx - canonical UI primitives.
//
// AGENT RULE: when you'd write the same Tailwind class string twice,
// add it here as a function instead. The third copy of a class="…"
// string is a drift signal - extract on the SECOND use.
//
// All primitives return HTML strings (no React, no JSX). Compose them
// in feature modules via template literals + innerHTML, matching the
// pattern in views/notes.tsx.

const escapeHtml = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
} as Record<string, string>)[c]);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export function Button(opts: {
  label: string;
  type?: 'submit' | 'button' | 'reset';
  variant?: ButtonVariant;
  size?: ButtonSize;
  attrs?: string;
  extraClass?: string;
}): string {
  const variant = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500',
    secondary: 'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }[opts.variant ?? 'primary'];
  const size = opts.size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2';
  return `<button type="${opts.type ?? 'button'}" class="rounded-md font-medium ${size} ${variant} ${opts.extraClass ?? ''}" ${opts.attrs ?? ''}>${escapeHtml(opts.label)}</button>`;
}

export function Input(opts: {
  name: string;
  type?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  attrs?: string;
}): string {
  // ALWAYS set an explicit text + bg + placeholder color paired by light/dark -
  // a bg without a matching text color is the #1 cause of invisible
  // white-on-white inputs. Never ship an input that relies on inherited color.
  return `<input name="${opts.name}" type="${opts.type ?? 'text'}" ${opts.required ? 'required' : ''} ${opts.placeholder ? `placeholder="${escapeHtml(opts.placeholder)}"` : ''} ${opts.value !== undefined ? `value="${escapeHtml(opts.value)}"` : ''} class="block w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500" ${opts.attrs ?? ''}>`;
}

export function Field(opts: { label: string; input: string; hint?: string }): string {
  return `<label class="block space-y-1">
    <span class="text-sm font-medium">${escapeHtml(opts.label)}</span>
    ${opts.input}
    ${opts.hint ? `<span class="text-xs text-zinc-500">${escapeHtml(opts.hint)}</span>` : ''}
  </label>`;
}

export function Card(opts: { title?: string; body: string; extraClass?: string }): string {
  return `<section class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 ${opts.extraClass ?? ''}">
    ${opts.title ? `<h2 class="text-base font-semibold mb-3">${escapeHtml(opts.title)}</h2>` : ''}
    ${opts.body}
  </section>`;
}

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

export function Badge(opts: { label: string; variant?: BadgeVariant }): string {
  const cls = {
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }[opts.variant ?? 'default'];
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}">${escapeHtml(opts.label)}</span>`;
}

export function EmptyState(opts: { message: string; cta?: string }): string {
  return `<div class="text-center py-12 text-zinc-500">
    <p class="text-sm">${escapeHtml(opts.message)}</p>
    ${opts.cta ? `<div class="mt-4">${opts.cta}</div>` : ''}
  </div>`;
}

// Add app-specific primitives below as patterns repeat. Examples:
//
//   export function PriceTag(opts: { cents: number }): string {
//     return `<span class="font-mono tabular-nums">$${(opts.cents / 100).toFixed(2)}</span>`;
//   }
//
//   export function UserAvatar(opts: { name: string; email: string }): string { ... }
//
// Rule of thumb: any styled element that appears in two feature files
// belongs here. The third instance is wasted work + drift waiting to
// happen.
