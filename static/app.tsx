import { searchTickets, type SearchParams, type TMEvent } from './lib/ticketmaster';
import { renderEventCard } from './components/EventCard';
import { initReels, startSpin, stopSpin } from './components/SlotMachine';
import { ALL_STRATEGIES, TIER_LIMITS, type Tier, type Strategy } from './lib/strategies';

declare const lucide: { createIcons(): void };

// ─── State ────────────────────────────────────────────────────────────────────
let spinning = false;
let currentTier: Tier = 'starter';
let selectedStrategyIds: Set<string> = new Set(['exact', 'relevance', 'offsale']);

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIERS: { id: Tier; label: string; threads: number; badge: string; desc: string }[] = [
  { id: 'starter', label: 'Starter', threads: 5,  badge: 'bg-teal-600/20 text-teal-300 border-teal-600/40',    desc: '5 strategies' },
  { id: 'pro',     label: 'Pro',     threads: 12, badge: 'bg-violet-600/20 text-violet-300 border-violet-600/40', desc: '12 strategies' },
  { id: 'broker',  label: 'Broker',  threads: 25, badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',   desc: '25 strategies' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tierStrategies(tier: Tier): Strategy[] {
  const tiers: Tier[] = ['starter', 'pro', 'broker'];
  const tierIndex = tiers.indexOf(tier);
  return ALL_STRATEGIES.filter(s => tiers.indexOf(s.tier) <= tierIndex);
}

function tierColor(tier: Tier) {
  return tier === 'broker' ? 'text-amber-300' : tier === 'pro' ? 'text-violet-300' : 'text-teal-300';
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render(): void {
  const root = document.getElementById('app')!;
  root.innerHTML = `
    <div class="bg-zinc-950 text-zinc-100 min-h-screen">

      <!-- Header -->
      <header class="sticky top-0 z-30 px-6 py-3 flex items-center justify-between bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow shadow-violet-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight text-white leading-none">TicketSpin</h1>
            <p class="text-[10px] text-violet-300/60 leading-none mt-0.5">Broker Intelligence Platform</p>
          </div>
        </div>
        <!-- Tier selector -->
        <div class="flex items-center gap-1.5" id="tier-tabs">
          ${TIERS.map(t => `
            <button data-tier="${t.id}"
              class="tier-tab px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150
                     ${t.id === currentTier
                       ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                       : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'}">
              ${t.label}
              <span class="ml-1 opacity-60">${t.threads}</span>
            </button>
          `).join('')}
        </div>
      </header>

      <!-- Search panel -->
      <div class="px-4 pt-6 pb-4 border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900/60 to-zinc-950">
        <!-- Slot machine -->
        <div class="flex justify-center mb-5">
          <div class="px-5 py-3 rounded-2xl border border-violet-700/30 bg-zinc-900/60 shadow-xl shadow-violet-950/20">
            <div class="text-center mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70">Ticket Spinner</span>
            </div>
            <div id="reels" class="flex gap-2 justify-center"></div>
          </div>
        </div>

        <!-- Search form -->
        <form id="search-form" class="max-w-4xl mx-auto">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
            <div class="col-span-2 sm:col-span-2 lg:col-span-2">
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">Artist / Event / Team</label>
              <input id="keyword" type="text" placeholder="e.g. Taylor Swift, Lakers…"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/40 transition-colors" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">City</label>
              <input id="city" type="text" placeholder="New York, LA…"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/40 transition-colors" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">Category</label>
              <select id="category"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/40 transition-colors">
                <option value="all">All</option>
                <option value="Music">Music</option>
                <option value="Sports">Sports</option>
                <option value="Arts & Theatre">Arts &amp; Theatre</option>
                <option value="Film">Film</option>
                <option value="Miscellaneous">Misc</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">Start Date</label>
              <input id="startDate" type="date"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/40 transition-colors" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">End Date</label>
              <input id="endDate" type="date"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/40 transition-colors" />
            </div>
          </div>

          <!-- Strategy picker -->
          <div class="mb-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Active Strategies
                <span id="strategy-count" class="ml-1.5 text-violet-400">0 selected</span>
              </span>
              <div class="flex gap-2">
                <button type="button" id="select-all-btn"
                  class="text-[10px] text-zinc-500 hover:text-violet-400 transition-colors">Select all</button>
                <span class="text-zinc-700">·</span>
                <button type="button" id="clear-strategies-btn"
                  class="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">Clear</button>
              </div>
            </div>
            <div id="strategy-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
              <!-- filled by renderStrategyGrid() -->
            </div>
          </div>

          <!-- SPIN button -->
          <div class="flex justify-center">
            <button type="submit" id="spin-btn"
              class="flex items-center gap-2.5 px-10 py-3.5 rounded-2xl
                     bg-violet-600 hover:bg-violet-500 active:scale-95
                     text-white font-bold text-base shadow-lg shadow-violet-900/40
                     transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              </svg>
              <span id="spin-label">SPIN</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Status bar -->
      <div id="status-bar" class="hidden px-6 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-400 flex items-center gap-2"></div>

      <!-- Results -->
      <div class="px-4 py-6 max-w-screen-2xl mx-auto w-full">
        <div id="results-header" class="hidden mb-5 flex items-center justify-between">
          <div id="results-count" class="text-sm text-zinc-400"></div>
          <button id="clear-btn" class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5">
            <i data-lucide="x" class="w-3.5 h-3.5"></i> Clear
          </button>
        </div>
        <div id="thread-results" class="space-y-5"></div>
        <div id="empty-state" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                 stroke-linejoin="round" class="text-zinc-700">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <h2 class="text-base font-semibold text-zinc-500 mb-1">Ready to Hunt</h2>
          <p class="text-sm text-zinc-600 max-w-xs">Pick your strategies, enter a search, and hit <strong class="text-violet-400">SPIN</strong> to run parallel broker sweeps.</p>
        </div>
        <div id="error-state" class="hidden flex flex-col items-center justify-center py-24 text-center">
          <div class="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-800/40 flex items-center justify-center mb-4">
            <i data-lucide="alert-triangle" class="w-8 h-8 text-red-400"></i>
          </div>
          <h2 class="text-base font-semibold text-red-300 mb-1">Search Failed</h2>
          <p id="error-msg" class="text-sm text-zinc-500 max-w-xs"></p>
        </div>
      </div>

      <!-- Footer -->
      <footer class="py-4 px-6 border-t border-zinc-800 text-center text-xs text-zinc-700">
        Powered by Ticketmaster Discovery API &mdash; click any card to buy on Ticketmaster.com
      </footer>
    </div>
  `;

  // Init reels
  initReels(document.getElementById('reels')!);

  // Set today as default start
  const todayStr = new Date().toISOString().slice(0, 10);
  (document.getElementById('startDate') as HTMLInputElement).value = todayStr;

  // Wire tier tabs
  document.getElementById('tier-tabs')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-tier]') as HTMLElement | null;
    if (btn) setTier(btn.dataset.tier as Tier);
  });

  // Wire strategy grid
  renderStrategyGrid();

  // Select all / clear
  document.getElementById('select-all-btn')!.addEventListener('click', () => {
    const avail = tierStrategies(currentTier);
    avail.forEach(s => selectedStrategyIds.add(s.id));
    renderStrategyGrid();
  });
  document.getElementById('clear-strategies-btn')!.addEventListener('click', () => {
    selectedStrategyIds.clear();
    renderStrategyGrid();
  });

  // Wire form
  document.getElementById('search-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!spinning) doSpin();
  });

  // Wire clear results
  document.getElementById('clear-btn')!.addEventListener('click', clearResults);

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setTier(tier: Tier): void {
  currentTier = tier;
  // Remove strategies no longer available
  const available = new Set(tierStrategies(tier).map(s => s.id));
  selectedStrategyIds = new Set([...selectedStrategyIds].filter(id => available.has(id)));

  // Update tab styles
  document.querySelectorAll('.tier-tab').forEach(btn => {
    const el = btn as HTMLElement;
    const isActive = el.dataset.tier === tier;
    el.className = `tier-tab px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
      isActive
        ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
        : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
    }`;
  });

  renderStrategyGrid();
}

function renderStrategyGrid(): void {
  const grid = document.getElementById('strategy-grid')!;
  const available = tierStrategies(currentTier);
  const locked = ALL_STRATEGIES.filter(s => {
    const tiers: Tier[] = ['starter', 'pro', 'broker'];
    return tiers.indexOf(s.tier) > tiers.indexOf(currentTier);
  });

  grid.innerHTML = [
    ...available.map(s => {
      const active = selectedStrategyIds.has(s.id);
      return `
        <button type="button" data-strategy="${s.id}"
          class="strategy-btn relative text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer
                 ${active
                   ? `${s.color.bg} ${s.color.border} ring-1 ring-inset ${s.color.border}`
                   : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                 }">
          <div class="flex items-center gap-1.5 mb-1">
            <div class="w-1.5 h-1.5 rounded-full ${active ? s.color.dot : 'bg-zinc-700'}"></div>
            <span class="text-[11px] font-semibold ${active ? 'text-zinc-100' : 'text-zinc-400'}">${s.name}</span>
          </div>
          <p class="text-[10px] leading-tight ${active ? 'text-zinc-400' : 'text-zinc-600'}">${s.description}</p>
          ${active ? `<div class="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-violet-600 flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="white"><path d="M1 4l2 2 4-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>` : ''}
        </button>
      `;
    }),
    ...locked.slice(0, 3).map(s => `
      <button type="button" disabled
        class="text-left px-3 py-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/20 opacity-40 cursor-not-allowed">
        <div class="flex items-center gap-1.5 mb-1">
          <i data-lucide="lock" class="w-2.5 h-2.5 text-zinc-600"></i>
          <span class="text-[11px] font-semibold text-zinc-600">${s.name}</span>
        </div>
        <p class="text-[10px] text-zinc-700 leading-tight capitalize">${s.tier} tier</p>
      </button>
    `),
  ].join('');

  // Update count
  const countEl = document.getElementById('strategy-count');
  if (countEl) countEl.textContent = `${selectedStrategyIds.size} selected`;

  // Wire clicks
  grid.querySelectorAll('[data-strategy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.strategy!;
      if (selectedStrategyIds.has(id)) selectedStrategyIds.delete(id);
      else selectedStrategyIds.add(id);
      renderStrategyGrid();
    });
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getSearchParams(): SearchParams {
  return {
    keyword:   (document.getElementById('keyword')   as HTMLInputElement).value.trim(),
    city:      (document.getElementById('city')      as HTMLInputElement).value.trim(),
    startDate: (document.getElementById('startDate') as HTMLInputElement).value,
    endDate:   (document.getElementById('endDate')   as HTMLInputElement).value,
    category:  (document.getElementById('category')  as HTMLSelectElement).value,
    sort: 'date,asc',
  };
}

function setSpinning(s: boolean): void {
  spinning = s;
  const btn = document.getElementById('spin-btn') as HTMLButtonElement;
  const label = document.getElementById('spin-label')!;
  btn.disabled = s;
  label.textContent = s ? 'SPINNING…' : 'SPIN';
}

function showStatus(msg: string): void {
  const bar = document.getElementById('status-bar')!;
  bar.className = 'px-6 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-400 flex items-center gap-2';
  bar.innerHTML = `
    <svg class="animate-spin w-3 h-3 text-violet-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
    ${msg}
  `;
}

function hideStatus(): void {
  document.getElementById('status-bar')!.className = 'hidden';
}

function clearResults(): void {
  document.getElementById('thread-results')!.innerHTML = '';
  document.getElementById('results-header')!.className = 'hidden mb-5 flex items-center justify-between';
  document.getElementById('empty-state')!.className = 'flex flex-col items-center justify-center py-24 text-center';
  document.getElementById('error-state')!.className = 'hidden flex flex-col items-center justify-center py-24 text-center';
}

async function doSpin(): Promise<void> {
  const base = getSearchParams();
  if (!base.keyword && !base.city && base.category === 'all') {
    alert('Enter a keyword, city, or select a category first.');
    return;
  }

  const activeStrategies = ALL_STRATEGIES.filter(s => selectedStrategyIds.has(s.id));
  if (activeStrategies.length === 0) {
    alert('Select at least one strategy.');
    return;
  }

  setSpinning(true);
  startSpin();
  clearResults();
  showStatus(`Running ${activeStrategies.length} broker strateg${activeStrategies.length > 1 ? 'ies' : 'y'} in parallel…`);

  const threadContainer = document.getElementById('thread-results')!;

  // Render skeletons
  activeStrategies.forEach((s, i) => {
    const el = document.createElement('div');
    el.id = `thread-${i}`;
    el.innerHTML = buildSkeleton(s);
    threadContainer.appendChild(el);
  });

  // Fire all in parallel
  const results = await Promise.allSettled(
    activeStrategies.map(s => searchTickets(s.buildParams(base)))
  );

  stopSpin('🎟️');
  hideStatus();

  let totalFound = 0;
  let hasAny = false;

  results.forEach((result, i) => {
    const el = document.getElementById(`thread-${i}`)!;
    const s = activeStrategies[i];
    const resolvedParams = s.buildParams(base);

    if (result.status === 'fulfilled') {
      const events: TMEvent[] = result.value;
      totalFound += events.length;
      if (events.length > 0) hasAny = true;
      renderThreadResults(el, s, resolvedParams, events);
    } else {
      renderThreadError(el, s, result.reason?.message || 'Failed');
    }
  });

  setSpinning(false);

  if (hasAny) {
    const header = document.getElementById('results-header')!;
    header.className = 'mb-5 flex items-center justify-between';
    document.getElementById('results-count')!.innerHTML =
      `Found <strong class="text-violet-400">${totalFound}</strong> event${totalFound !== 1 ? 's' : ''} across <strong class="text-zinc-200">${activeStrategies.length}</strong> strateg${activeStrategies.length !== 1 ? 'ies' : 'y'}`;
    document.getElementById('empty-state')!.className = 'hidden';
  } else {
    document.getElementById('empty-state')!.innerHTML = `
      <div class="text-4xl mb-3">🎫</div>
      <h2 class="text-base font-semibold text-zinc-500 mb-1">No Results Found</h2>
      <p class="text-sm text-zinc-600 max-w-xs">Try a different keyword, wider date range, or more strategies.</p>
    `;
    document.getElementById('empty-state')!.className = 'flex flex-col items-center justify-center py-24 text-center';
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildSkeleton(s: Strategy): string {
  return `
    <div class="rounded-2xl border ${s.color.border} ${s.color.bg} p-4">
      <div class="flex items-center gap-2 mb-4">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color.badge}">
          <svg class="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          ${s.name}
        </span>
        <span class="text-xs text-zinc-600">${s.description}</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        ${[0,1,2,3,4].map(() => `
          <div class="rounded-xl overflow-hidden">
            <div class="skeleton aspect-video rounded-t-xl"></div>
            <div class="bg-zinc-800 p-2.5 rounded-b-xl space-y-1.5">
              <div class="skeleton h-3 rounded w-3/4"></div>
              <div class="skeleton h-2 rounded w-1/2"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderThreadResults(el: HTMLElement, s: Strategy, params: SearchParams & { page?: number }, events: TMEvent[]): void {
  // Flag sold-out / off-sale events specially
  const soldOut = events.filter(e => e.dates?.status?.code === 'offsale' || e.dates?.status?.code === 'cancelled');
  const available = events.filter(e => e.dates?.status?.code !== 'offsale' && e.dates?.status?.code !== 'cancelled');

  const sortedEvents = [...soldOut, ...available]; // sold-out first for broker value

  const paramSummary = [
    params.keyword ? `"${params.keyword}"` : '',
    params.city || '',
    params.category && params.category !== 'all' ? params.category : '',
    params.page ? `page ${params.page + 1}` : '',
  ].filter(Boolean).join(' · ');

  if (events.length === 0) {
    el.innerHTML = `
      <div class="rounded-2xl border ${s.color.border} bg-zinc-900/40 p-4 flex items-center gap-3">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color.badge}">${s.name}</span>
        <span class="text-xs text-zinc-600 italic">No events found${paramSummary ? ` for ${paramSummary}` : ''}</span>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="rounded-2xl border ${s.color.border} ${s.color.bg} p-4">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color.badge}">
            ✓ ${s.name}
          </span>
          ${soldOut.length > 0 ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-600/40">
            🔥 ${soldOut.length} sold out
          </span>` : ''}
          <span class="text-xs text-zinc-600">${paramSummary}</span>
        </div>
        <span class="text-xs text-zinc-600">${events.length} result${events.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        ${sortedEvents.slice(0, 10).map(e => renderEventCard(e)).join('')}
      </div>
      ${events.length > 10 ? `
        <div class="mt-3 text-center text-xs text-zinc-600">+ ${events.length - 10} more — <a href="https://www.ticketmaster.com/search?q=${encodeURIComponent(params.keyword || '')}" target="_blank" class="text-violet-400 hover:underline">view on Ticketmaster</a></div>
      ` : ''}
    </div>
  `;
}

function renderThreadError(el: HTMLElement, s: Strategy, msg: string): void {
  el.innerHTML = `
    <div class="rounded-2xl border border-red-800/30 bg-red-900/10 p-3 flex items-center gap-3">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color.badge}">✗ ${s.name}</span>
      <span class="text-xs text-red-400">${msg}</span>
    </div>
  `;
}

// Boot
render();
