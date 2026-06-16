import bm from 'bm';
import { searchTickets, searchSeatGeek, searchStubHub, type SearchParams, type TMEvent } from './lib/ticketmaster';
import { renderEventCard } from './components/EventCard';
import { initReels, startSpin, stopSpin } from './components/SlotMachine';
import { ALL_STRATEGIES, TIER_LIMITS, type Tier, type Strategy } from './lib/strategies';

declare const lucide: { createIcons(): void };

// ─── State ────────────────────────────────────────────────────────────────────
let spinning = false;
let currentTier: Tier = 'starter';
let selectedStrategyIds: Set<string> = new Set();
let brokerKey = '';    // TM key
let sgKey = '';        // SeatGeek key
let shKey = '';        // StubHub key
let profileId: number | null = null;
let me: any = null;

const PLAN_META: Record<Tier, { label: string; threads: number; price: string; color: string; border: string }> = {
  starter: { label: 'Starter',  threads: 25,  price: '$249/mo',    color: 'text-teal-300',   border: 'border-teal-600/40' },
  pro:     { label: 'Pro',      threads: 75,  price: '$749/mo',    color: 'text-violet-300', border: 'border-violet-600/40' },
  broker:  { label: 'Broker',   threads: 150, price: '$10,000/mo', color: 'text-amber-300',  border: 'border-amber-600/40' },
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  me = await bm.auth.me();
  if (!me) { location.href = '/login.html'; return; }

  // Load broker profile for their API key + plan
  try {
    const res = await bm.api.get('/api/broker_profiles?limit=1');
    const profile = (res as any)?.data?.[0];
    if (profile) {
      currentTier = (profile.plan || 'starter') as Tier;
      brokerKey = profile.tm_api_key || '';
    }
  } catch {}

  // Default: select all starter strategies
  const available = tierStrategies(currentTier);
  available.forEach(s => selectedStrategyIds.add(s.id));

  render();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tierStrategies(tier: Tier): Strategy[] {
  const order: Tier[] = ['starter', 'pro', 'broker'];
  const idx = order.indexOf(tier);
  return ALL_STRATEGIES.filter(s => order.indexOf(s.tier) <= idx);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render(): void {
  const root = document.getElementById('app')!;
  const planMeta = PLAN_META[currentTier];
  const available = tierStrategies(currentTier);

  root.innerHTML = `
    <div class="bg-zinc-950 text-zinc-100 min-h-screen">

      <!-- Header -->
      <header class="sticky top-0 z-30 px-4 py-3 flex items-center justify-between bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow shadow-violet-900/50 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <div class="hidden sm:block">
            <h1 class="text-sm font-bold tracking-tight text-white leading-none">TicketSpin</h1>
            <p class="text-[10px] text-violet-300/60 leading-none mt-0.5">Broker Intelligence Platform</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Plan badge -->
          <span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${planMeta.border} text-xs font-semibold ${planMeta.color}">
            <i data-lucide="zap" class="w-3 h-3 pointer-events-none"></i>
            ${planMeta.label} · ${planMeta.threads} threads
          </span>
          <!-- Key status -->
          ${brokerKey
            ? `<span class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-green-700/40 bg-green-900/20 text-[11px] text-green-400">
                <i data-lucide="key" class="w-3 h-3 pointer-events-none"></i> Key active
               </span>`
            : `<a href="/settings.html" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-700/40 bg-amber-900/20 text-[11px] text-amber-400 hover:bg-amber-900/40 transition-colors">
                <i data-lucide="alert-triangle" class="w-3 h-3 pointer-events-none"></i> Add API key
               </a>`
          }
          <a href="/settings.html"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors">
            <i data-lucide="settings" class="w-3.5 h-3.5 pointer-events-none"></i>
            <span class="hidden sm:inline">Settings</span>
          </a>
          <button id="signout-btn" class="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <!-- Search panel -->
      <div class="px-4 pt-5 pb-4 border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900/60 to-zinc-950">

        <!-- Slot machine -->
        <div class="flex justify-center mb-4">
          <div class="px-5 py-3 rounded-2xl border border-violet-700/30 bg-zinc-900/60 shadow-xl shadow-violet-950/20">
            <div class="text-center mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70">Ticket Spinner</span>
            </div>
            <div id="reels" class="flex gap-2 justify-center"></div>
          </div>
        </div>

        <!-- Search form -->
        <form id="search-form" class="max-w-5xl mx-auto">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
            <div class="col-span-2 sm:col-span-2">
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">Artist / Event / Team</label>
              <input id="keyword" type="text" placeholder="e.g. Taylor Swift, Lakers, Drake…"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">City</label>
              <input id="city" type="text" placeholder="New York, LA…"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">Start Date</label>
              <input id="startDate" type="date"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">End Date</label>
              <input id="endDate" type="date"
                class="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40" />
            </div>
          </div>

          <!-- Strategy grid header -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Strategies
                <span id="strategy-count" class="ml-1 text-violet-400">${selectedStrategyIds.size} / ${available.length}</span>
              </span>
              <!-- Group filter tabs -->
              <div id="group-tabs" class="hidden sm:flex items-center gap-1 flex-wrap"></div>
            </div>
            <div class="flex gap-2">
              <button type="button" id="select-all-btn" class="text-[10px] text-zinc-500 hover:text-violet-400 transition-colors">All</button>
              <span class="text-zinc-700">·</span>
              <button type="button" id="clear-strategies-btn" class="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">None</button>
            </div>
          </div>

          <!-- Strategy grid -->
          <div id="strategy-grid" class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-1.5 mb-3 max-h-64 overflow-y-auto pr-1"></div>

          <!-- Spin button -->
          <div class="flex items-center justify-center gap-4">
            <button type="submit" id="spin-btn"
              class="flex items-center gap-2.5 px-10 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-base shadow-lg shadow-violet-900/40 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              </svg>
              <span id="spin-label">SPIN ${selectedStrategyIds.size} THREADS</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Status bar -->
      <div id="status-bar" class="hidden px-6 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-400 flex items-center gap-2"></div>

      <!-- Results -->
      <div class="px-4 py-6 max-w-screen-2xl mx-auto w-full">
        <div id="results-header" class="hidden mb-4 flex items-center justify-between">
          <div id="results-count" class="text-sm text-zinc-400"></div>
          <button id="clear-btn" class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5">
            <i data-lucide="x" class="w-3.5 h-3.5 pointer-events-none"></i> Clear
          </button>
        </div>
        <div id="thread-results" class="space-y-4"></div>
        <div id="empty-state" class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-700">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <h2 class="text-base font-semibold text-zinc-500 mb-1">Ready to Hunt</h2>
          <p class="text-sm text-zinc-600 max-w-xs">Select strategies, enter a keyword, and hit <strong class="text-violet-400">SPIN</strong> to run parallel broker sweeps.</p>
          ${!brokerKey ? `<a href="/settings.html" class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-600/40 bg-amber-900/10 text-sm text-amber-300 hover:bg-amber-900/20 transition-colors">
            <i data-lucide="key" class="w-4 h-4 pointer-events-none"></i> Add your Ticketmaster API key to get started
          </a>` : ''}
        </div>
      </div>

      <!-- Footer -->
      <footer class="py-4 px-6 border-t border-zinc-800 text-center text-xs text-zinc-700">
        Powered by Ticketmaster Discovery API — click any card to buy on Ticketmaster.com
      </footer>
    </div>
  `;

  initReels(document.getElementById('reels')!);
  const todayStr = new Date().toISOString().slice(0, 10);
  (document.getElementById('startDate') as HTMLInputElement).value = todayStr;

  document.getElementById('signout-btn')!.addEventListener('click', async () => {
    await bm.auth.signOut();
    location.href = '/login.html';
  });

  renderStrategyGrid();

  document.getElementById('select-all-btn')!.addEventListener('click', () => {
    tierStrategies(currentTier).forEach(s => selectedStrategyIds.add(s.id));
    renderStrategyGrid();
    updateSpinLabel();
  });
  document.getElementById('clear-strategies-btn')!.addEventListener('click', () => {
    selectedStrategyIds.clear();
    renderStrategyGrid();
    updateSpinLabel();
  });

  document.getElementById('search-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!spinning) doSpin();
  });

  document.getElementById('clear-btn')!.addEventListener('click', clearResults);

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateSpinLabel() {
  const label = document.getElementById('spin-label');
  const count = document.getElementById('strategy-count');
  const available = tierStrategies(currentTier);
  if (label) label.textContent = `SPIN ${selectedStrategyIds.size} THREADS`;
  if (count) count.textContent = `${selectedStrategyIds.size} / ${available.length}`;
}

let activeGroupFilter: string | null = null;

function renderStrategyGrid(): void {
  const grid = document.getElementById('strategy-grid')!;
  const available = tierStrategies(currentTier);

  // Build group tabs
  const groups = Array.from(new Set(available.map(s => s.group)));
  const groupTabsEl = document.getElementById('group-tabs');
  if (groupTabsEl) {
    groupTabsEl.innerHTML = [
      `<button type="button" data-group="all"
        class="group-tab px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${!activeGroupFilter ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}">
        All
      </button>`,
      ...groups.map(g => `
        <button type="button" data-group="${g}"
          class="group-tab px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${activeGroupFilter === g ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}">
          ${g}
        </button>
      `)
    ].join('');
    groupTabsEl.querySelectorAll('[data-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = (btn as HTMLElement).dataset.group!;
        activeGroupFilter = g === 'all' ? null : g;
        renderStrategyGrid();
      });
    });
  }

  const filtered = activeGroupFilter ? available.filter(s => s.group === activeGroupFilter) : available;

  grid.innerHTML = filtered.map(s => {
    const active = selectedStrategyIds.has(s.id);
    return `
      <button type="button" data-strategy="${s.id}" title="${s.description}"
        class="strategy-btn relative text-left px-2 py-2 rounded-lg border transition-all duration-100 cursor-pointer text-center
               ${active
                 ? `${s.color.bg} ${s.color.border} ring-1 ring-inset ${s.color.border}`
                 : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
               }">
        <div class="text-[11px] font-semibold leading-tight ${active ? 'text-zinc-100' : 'text-zinc-500'} truncate">${s.name}</div>
        <div class="text-[9px] text-zinc-600 leading-tight mt-0.5 truncate">${s.group}</div>
        ${active ? `<div class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${s.color.dot} opacity-90"></div>` : ''}
      </button>
    `;
  }).join('');

  grid.querySelectorAll('[data-strategy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.strategy!;
      if (selectedStrategyIds.has(id)) selectedStrategyIds.delete(id);
      else selectedStrategyIds.add(id);
      renderStrategyGrid();
      updateSpinLabel();
    });
  });

  updateSpinLabel();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getSearchParams(): SearchParams {
  return {
    keyword:   (document.getElementById('keyword')   as HTMLInputElement).value.trim(),
    city:      (document.getElementById('city')      as HTMLInputElement).value.trim(),
    startDate: (document.getElementById('startDate') as HTMLInputElement).value,
    endDate:   (document.getElementById('endDate')   as HTMLInputElement).value,
    category:  'all',
    sort:      'date,asc',
  };
}

function setSpinning(s: boolean): void {
  spinning = s;
  const btn = document.getElementById('spin-btn') as HTMLButtonElement;
  btn.disabled = s;
  document.getElementById('spin-label')!.textContent = s ? 'SPINNING…' : `SPIN ${selectedStrategyIds.size} THREADS`;
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
  document.getElementById('results-header')!.className = 'hidden mb-4 flex items-center justify-between';
  document.getElementById('empty-state')!.className = 'flex flex-col items-center justify-center py-20 text-center';
}

// Batch parallel calls — cap at 10 simultaneous to respect rate limits
async function batchedParallel<T>(tasks: (() => Promise<T>)[], concurrency = 10): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try { results[i] = { status: 'fulfilled', value: await tasks[i]() }; }
      catch (e) { results[i] = { status: 'rejected', reason: e }; }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function doSpin(): Promise<void> {
  const base = getSearchParams();
  if (!base.keyword && !base.city) {
    alert('Enter a keyword or city first.');
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
  showStatus(`Firing ${activeStrategies.length} threads${brokerKey ? ' with your API key' : ''}…`);

  const threadContainer = document.getElementById('thread-results')!;

  // Render skeletons immediately
  activeStrategies.forEach((s, i) => {
    const el = document.createElement('div');
    el.id = `thread-${i}`;
    el.innerHTML = buildSkeleton(s);
    threadContainer.appendChild(el);
  });

  // Build tasks with key injection
  const tasks = activeStrategies.map(s => () => searchTickets(s.buildParams(base, brokerKey || undefined)));

  // Batch with concurrency cap to avoid hammering the API
  const concurrency = activeStrategies.length <= 10 ? activeStrategies.length : 10;
  const results = await batchedParallel(tasks, concurrency);

  stopSpin('🎟️');
  hideStatus();

  let totalFound = 0;
  let hasAny = false;

  results.forEach((result, i) => {
    const el = document.getElementById(`thread-${i}`)!;
    const s = activeStrategies[i];
    if (result.status === 'fulfilled') {
      const events: TMEvent[] = result.value;
      totalFound += events.length;
      if (events.length > 0) hasAny = true;
      renderThreadResults(el, s, s.buildParams(base, brokerKey || undefined), events);
    } else {
      renderThreadError(el, s, (result.reason as any)?.message || 'Failed');
    }
  });

  setSpinning(false);

  if (hasAny) {
    const header = document.getElementById('results-header')!;
    header.className = 'mb-4 flex items-center justify-between';
    document.getElementById('results-count')!.innerHTML =
      `Found <strong class="text-violet-400">${totalFound}</strong> events across <strong class="text-zinc-200">${activeStrategies.length}</strong> threads`;
    document.getElementById('empty-state')!.className = 'hidden';
  } else {
    document.getElementById('empty-state')!.innerHTML = `
      <div class="text-4xl mb-3">🎫</div>
      <h2 class="text-base font-semibold text-zinc-500 mb-1">No Results Found</h2>
      <p class="text-sm text-zinc-600 max-w-xs">Try a different keyword, wider date range, or more strategies.</p>
    `;
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildSkeleton(s: Strategy): string {
  return `
    <div class="rounded-xl border ${s.color.border} ${s.color.bg} p-3">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.color.badge}">
          <svg class="animate-spin w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          ${s.name}
        </span>
        <span class="text-[10px] text-zinc-600">${s.description}</span>
      </div>
      <div class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
        ${[0,1,2,3,4].map(() => `
          <div class="rounded-lg overflow-hidden">
            <div class="skeleton aspect-video rounded-t-lg"></div>
            <div class="bg-zinc-800 p-2 rounded-b-lg space-y-1">
              <div class="skeleton h-2.5 rounded w-3/4"></div>
              <div class="skeleton h-2 rounded w-1/2"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderThreadResults(el: HTMLElement, s: Strategy, params: any, events: TMEvent[]): void {
  const soldOut = events.filter(e => e.dates?.status?.code === 'offsale' || e.dates?.status?.code === 'cancelled');
  const active  = events.filter(e => e.dates?.status?.code !== 'offsale' && e.dates?.status?.code !== 'cancelled');
  const sorted  = [...soldOut, ...active];

  if (events.length === 0) {
    el.innerHTML = `
      <div class="rounded-xl border ${s.color.border} bg-zinc-900/40 p-3 flex items-center gap-3">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.color.badge}">${s.name}</span>
        <span class="text-xs text-zinc-600 italic">No events found</span>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="rounded-xl border ${s.color.border} ${s.color.bg} p-3">
      <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.color.badge}">✓ ${s.name}</span>
          <span class="text-[10px] text-zinc-600">${s.description}</span>
          ${soldOut.length > 0 ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-600/40">🔥 ${soldOut.length} sold out</span>` : ''}
        </div>
        <span class="text-[10px] text-zinc-600">${events.length} results</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2">
        ${sorted.slice(0, 14).map(e => renderEventCard(e)).join('')}
      </div>
      ${events.length > 14 ? `<div class="mt-2 text-center text-xs text-zinc-600">+${events.length - 14} more</div>` : ''}
    </div>
  `;
}

function renderThreadError(el: HTMLElement, s: Strategy, msg: string): void {
  el.innerHTML = `
    <div class="rounded-xl border border-red-800/30 bg-red-900/10 p-2.5 flex items-center gap-3">
      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.color.badge}">✗ ${s.name}</span>
      <span class="text-xs text-red-400">${msg}</span>
    </div>
  `;
}

boot();
