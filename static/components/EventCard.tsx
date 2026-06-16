import { type TMEvent, getBestImage, formatDate, formatPrice, getVenue, getGenre, getStatusBadge } from '../lib/ticketmaster';

export function renderEventCard(event: TMEvent): string {
  const img = getBestImage(event.images);
  const date = formatDate(event);
  const price = formatPrice(event);
  const venue = getVenue(event);
  const genre = getGenre(event);
  const status = getStatusBadge(event);

  return `
    <a href="${event.url}" target="_blank" rel="noopener noreferrer"
       class="ticket-card group block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden
              hover:border-violet-500/60 hover:shadow-lg hover:shadow-violet-900/20
              transition-all duration-200 cursor-pointer">
      <div class="relative aspect-video bg-zinc-800 overflow-hidden">
        ${img
          ? `<img src="${img}" alt="${escHtml(event.name)}"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />`
          : `<div class="w-full h-full flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                    stroke-linejoin="round" class="text-zinc-600">
                 <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
               </svg>
             </div>`}
        <div class="absolute top-2 right-2">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}">
            ${status.label}
          </span>
        </div>
        ${genre ? `<div class="absolute bottom-2 left-2">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-black/60 text-zinc-300 backdrop-blur-sm">
            ${escHtml(genre)}
          </span>
        </div>` : ''}
      </div>
      <div class="p-4 flex flex-col gap-2">
        <h3 class="font-semibold text-zinc-100 text-sm leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
          ${escHtml(event.name)}
        </h3>
        <div class="flex items-center gap-1.5 text-xs text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span>${date}</span>
        </div>
        ${venue ? `<div class="flex items-center gap-1.5 text-xs text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span class="truncate">${escHtml(venue)}</span>
        </div>` : ''}
        <div class="flex items-center justify-between mt-1">
          <span class="text-violet-400 font-bold text-sm">${escHtml(price)}</span>
          <span class="text-xs text-zinc-500 group-hover:text-violet-400 transition-colors flex items-center gap-1">
            Get Tickets
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>
    </a>
  `;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
