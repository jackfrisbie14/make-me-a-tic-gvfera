import { searchTickets, type SearchParams, type TMEvent } from './lib/ticketmaster';
import { renderEventCard } from './components/EventCard';
import { initReels, startSpin, stopSpin, getRandomSymbols } from './components/SlotMachine';


declare const lucide: { createIcons(): void };

// ─── State ───────────────────────────────────────────────────────────────────
let spinning = false;
let threadCount = 1; // number of parallel "threads" / results shown at once
let currentEvents: TMEvent[] = [];
let activeThreads: ReturnType<typeof setTimeout>[] = [];

// ─── DOM ─────────────────────────────────────────────────────────────────────
function render(): void {
  const root = document.getElementById('app')!;
  root.innerHTML = `
    <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">

      <!-- Header -->
      <header class="tm-logo-bar px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                 fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight text-white">TicketSpin</h1>
            <p class="text-xs text-violet-300/70">Powered by Ticketmaster</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs text-zinc-400">
          <i data-lucide="zap" class="w-3.5 h-3.5 text-violet-400"></i>
          <span>Live ticket data</span>
        </div>
      </header>

      <!-- Slot Machine Hero -->
      <div class="flex flex-col items-center py-10 px-4 border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <!-- Slot display -->
        <div class="mb-6 p-4 rounded-2xl border border-violet-700/30 bg-zinc-900/60 shadow-xl shadow-violet-950/30">
          <div class="text-center mb-3">
            <span class="text-xs font-semibold uppercase tracking-widest text-violet-400">Ticket Spinner</span>
          </div>
          <div id="reels" class="flex gap-3 justify-center mb-3"></div>
          <div class="flex gap-2 justify-center text-xs text-zinc-500">
            <div class="w-2 h-2 rounded-full bg-violet-600" id="dot1"></div>
            <div class="w-2 h-2 rounded-full bg-zinc-700" id="dot2"></div>
            <div class="w-2 h-2 rounded-full bg-zinc-700" id="dot3"></div>
          </div>
        </div>

        <!-- Thread count picker -->
        <div class="flex items-center gap-3 mb-6">
          <span class="text-sm text-zinc-400">Threads:</span>
          <div class="flex gap-1.5" id="thread-btns">
            ${[1,2,3,4].map(n => `
              <button data-threads="${n}"
                class="thread-btn w-8 h-8 rounded-lg text-sm font-bold border transition-all duration-150
                       ${n === 1
                         ? 'bg-violet-600 border-violet-500 text-white shadow shadow-violet-900/50'
                         : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-violet-500/50 hover:text-violet-300'}"
              >${n}</button>
            `).join('')}
          </div>
          <span class="text-xs text-zinc-600">parallel searches</span>
        </div>

        <!-- Search form -->
        <form id="search-form" class="w-full max-w-3xl">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div class="sm:col-span-2 lg:col-span-1">
              <label class="block text-xs font-medium text-zinc-400 mb-1.5">Event / Artist / Team</label>
              <input id="keyword" type="text"
                placeholder="e.g. Taylor Swift, Lakers..."
                class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/50 transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-400 mb-1.5">City</label>
              <input id="city" type="text"
                placeholder="e.g. New York, LA..."
                class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/50 transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
              <select id="category"
                class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/50 transition-colors">
                <option value="all">All Categories</option>
                <option value="Music">Music</option>
                <option value="Sports">Sports</option>
                <option value="Arts &amp; Theatre">Arts &amp; Theatre</option>
                <option value="Film">Film</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-400 mb-1.5">Start Date</label>
              <input id="startDate" type="date"
                class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/50 transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-400 mb-1.5">End Date</label>
              <input id="endDate" type="date"
                class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/50 transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-400 mb-1.5">Sort By</label>
              <select id="sort"
                class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100
                       text-sm focus:outline-none focus:border-violet-500
                       focus:ring-1 focus:ring-violet-500/50 transition-colors">
                <option value="date,asc">Date ↑</option>
                <option value="date,desc">Date ↓</option>
                <option value="name,asc">Name A–Z</option>
                <option value="name,desc">Name Z–A</option>
                <option value="relevance,desc">Relevance</option>
              </select>
            </div>
          </div>

          <!-- Spin button -->
          <div class="flex justify-center">
            <button type="submit" id="spin-btn"
              class="spin-btn-active relative flex items-center gap-3 px-10 py-4 rounded-2xl
                     bg-violet-600 hover:bg-violet-500 active:scale-95
                     text-white font-bold text-lg shadow-lg shadow-violet-900/50
                     transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:animate-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                   stroke-linejoin="round" id="spin-icon">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                <path d="m9.5 14.5 5-5"/>
                <path d="m9.5 9.5 5 5"/>
              </svg>
              <span id="spin-label">SPIN</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Status bar -->
      <div id="status-bar" class="hidden px-6 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-500 flex items-center gap-2"></div>

      <!-- Results -->
      <div class="px-4 py-6 max-w-7xl mx-auto w-full">
        <div id="results-header" class="hidden mb-4 flex items-center justify-between">
          <div id="results-count" class="text-sm text-zinc-400"></div>
          <button id="clear-btn" class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
            Clear
          </button>
        </div>
        <div id="thread-results" class="space-y-8"></div>
        <div id="empty-state" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                 stroke-linejoin="round" class="text-zinc-600">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-zinc-400 mb-1">Ready to Spin</h2>
          <p class="text-sm text-zinc-600 max-w-xs">Enter a keyword, city, or category above and hit <strong class="text-violet-400">SPIN</strong> to search Ticketmaster with parallel threads.</p>
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
      <footer class="py-4 px-6 border-t border-zinc-800 text-center text-xs text-zinc-600">
        Powered by the Ticketmaster Discovery API &mdash; click any card to buy on Ticketmaster.com
      </footer>
    </div>
  `;

  // Init slot machine reels
  const reelContainer = document.getElementById('reels')!;
  initReels(reelContainer);

  // Wire thread picker
  document.querySelectorAll('.thread-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt((btn as HTMLElement).dataset.threads!);
      setThreadCount(n);
    });
  });

  // Wire form
  document.getElementById('search-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!spinning) doSpin();
  });

  // Wire clear
  document.getElementById('clear-btn')!.addEventListener('click', clearResults);

  // Set today as default start date
  const today = new Date().toISOString().slice(0, 10);
  (document.getElementById('startDate') as HTMLInputElement).value = today;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setThreadCount(n: number): void {
  threadCount = n;
  document.querySelectorAll('.thread-btn').forEach(btn => {
    const btnEl = btn as HTMLElement;
    const isActive = parseInt(btnEl.dataset.threads!) === n;
    btnEl.className = `thread-btn w-8 h-8 rounded-lg text-sm font-bold border transition-all duration-150 ${
      isActive
        ? 'bg-violet-600 border-violet-500 text-white shadow shadow-violet-900/50'
        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-violet-500/50 hover:text-violet-300'
    }`;
  });
}

function getSearchParams(): SearchParams {
  return {
    keyword:  (document.getElementById('keyword')  as HTMLInputElement).value.trim(),
    city:     (document.getElementById('city')     as HTMLInputElement).value.trim(),
    startDate:(document.getElementById('startDate')as HTMLInputElement).value,
    endDate:  (document.getElementById('endDate')  as HTMLInputElement).value,
    category: (document.getElementById('category') as HTMLSelectElement).value,
    sort:     (document.getElementById('sort')     as HTMLSelectElement).value,
  };
}

function setSpinning(s: boolean): void {
  spinning = s;
  const btn = document.getElementById('spin-btn') as HTMLButtonElement;
  const label = document.getElementById('spin-label')!;
  btn.disabled = s;
  label.textContent = s ? 'SPINNING…' : 'SPIN';
  if (s) {
    btn.classList.remove('spin-btn-active');
    btn.classList.add('opacity-80');
  } else {
    btn.classList.add('spin-btn-active');
    btn.classList.remove('opacity-80');
  }
}

function showStatus(msg: string): void {
  const bar = document.getElementById('status-bar')!;
  bar.className = 'px-6 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-500 flex items-center gap-2';
  bar.innerHTML = `
    <svg class="animate-spin w-3 h-3 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
  document.getElementById('empty-state')!.className = 'flex flex-col items-center justify-center py-24 text-center';
  document.getElementById('error-state')!.className = 'hidden flex flex-col items-center justify-center py-24 text-center';
}

async function doSpin(): Promise<void> {
  const params = getSearchParams();
  if (!params.keyword && !params.city && params.category === 'all') {
    alert('Please enter a keyword, city, or select a category to search.');
    return;
  }

  setSpinning(true);
  startSpin();
  clearResults();
  showStatus(`Launching ${threadCount} search thread${threadCount > 1 ? 's' : ''} against Ticketmaster…`);

  // Cancel any pending thread timers
  activeThreads.forEach(t => clearTimeout(t));
  activeThreads = [];

  const threadContainer = document.getElementById('thread-results')!;

  // Build thread variations
  const threadParams = buildThreadVariations(params, threadCount);

  // Create thread skeleton sections
  threadParams.forEach((tp, i) => {
    const section = document.createElement('div');
    section.id = `thread-${i}`;
    section.innerHTML = buildThreadSkeleton(i, tp);
    threadContainer.appendChild(section);
  });

  // Fire all threads concurrently
  const results = await Promise.allSettled(
    threadParams.map(tp => searchTickets(tp))
  );

  // Stop slot animation
  const anySuccess = results.some(r => r.status === 'fulfilled' && (r.value as TMEvent[]).length > 0);
  const firstSuccess = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<TMEvent[]> | undefined;
  const symbols = firstSuccess ? getRandomSymbols(firstSuccess.value) : ['🎟️', '🎟️', '🎟️'];
  stopSpin(symbols[0]);

  hideStatus();

  let totalFound = 0;
  let hasAnyResults = false;

  results.forEach((result, i) => {
    const section = document.getElementById(`thread-${i}`)!;
    if (result.status === 'fulfilled') {
      const events: TMEvent[] = result.value;
      totalFound += events.length;
      if (events.length > 0) hasAnyResults = true;
      renderThreadResults(section, i, threadParams[i], events);
    } else {
      renderThreadError(section, i, threadParams[i], result.reason?.message || 'Unknown error');
    }
  });

  setSpinning(false);

  if (hasAnyResults) {
    const header = document.getElementById('results-header')!;
    header.className = 'mb-4 flex items-center justify-between';
    const count = document.getElementById('results-count')!;
    count.innerHTML = `Found <strong class="text-violet-400">${totalFound}</strong> event${totalFound !== 1 ? 's' : ''} across <strong class="text-zinc-300">${threadCount}</strong> thread${threadCount > 1 ? 's' : ''}`;
    document.getElementById('empty-state')!.className = 'hidden';
  } else if (!results.some(r => r.status === 'fulfilled')) {
    // All failed
    document.getElementById('empty-state')!.className = 'hidden';
    const errEl = document.getElementById('error-state')!;
    errEl.className = 'flex flex-col items-center justify-center py-24 text-center';
    document.getElementById('error-msg')!.textContent = 'Could not reach Ticketmaster. Check your API key or try again.';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } else {
    document.getElementById('empty-state')!.innerHTML = `
      <div class="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        <span class="text-3xl">🎫</span>
      </div>
      <h2 class="text-lg font-semibold text-zinc-400 mb-1">No Events Found</h2>
      <p class="text-sm text-zinc-600 max-w-xs">Try different keywords, a broader date range, or another city.</p>
    `;
    document.getElementById('empty-state')!.className = 'flex flex-col items-center justify-center py-24 text-center';
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildThreadVariations(base: SearchParams, count: number): SearchParams[] {
  if (count === 1) return [base];

  const variants: SearchParams[] = [base];

  // Thread 2: different sort
  if (count >= 2) {
    variants.push({ ...base, sort: base.sort === 'date,asc' ? 'relevance,desc' : 'date,asc' });
  }
  // Thread 3: broaden - remove city constraint
  if (count >= 3) {
    variants.push({ ...base, city: '', sort: 'date,asc' });
  }
  // Thread 4: broaden keyword
  if (count >= 4) {
    const kw = base.keyword.split(' ')[0]; // first word only
    variants.push({ ...base, keyword: kw, city: '', sort: 'relevance,desc' });
  }

  return variants.slice(0, count);
}

const THREAD_COLORS = [
  { border: 'border-violet-600/40', bg: 'bg-violet-900/10', label: 'Thread 1', badge: 'bg-violet-600/20 text-violet-300 border-violet-600/40' },
  { border: 'border-cyan-600/40',   bg: 'bg-cyan-900/10',   label: 'Thread 2', badge: 'bg-cyan-600/20 text-cyan-300 border-cyan-600/40' },
  { border: 'border-emerald-600/40',bg: 'bg-emerald-900/10',label: 'Thread 3', badge: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40' },
  { border: 'border-orange-600/40', bg: 'bg-orange-900/10', label: 'Thread 4', badge: 'bg-orange-600/20 text-orange-300 border-orange-600/40' },
];

function buildThreadSkeleton(i: number, params: SearchParams): string {
  const tc = THREAD_COLORS[i];
  const desc = buildThreadDesc(params, i);
  return `
    <div class="rounded-2xl border ${tc.border} ${tc.bg} p-4">
      <div class="flex items-center gap-2 mb-4">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tc.badge}">
          <svg class="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          ${tc.label}
        </span>
        <span class="text-xs text-zinc-500">${desc}</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        ${[0,1,2,3].map(() => `
          <div class="rounded-2xl overflow-hidden">
            <div class="skeleton aspect-video rounded-t-2xl"></div>
            <div class="bg-zinc-800 p-3 rounded-b-2xl space-y-2">
              <div class="skeleton h-3 rounded w-3/4"></div>
              <div class="skeleton h-2 rounded w-1/2"></div>
              <div class="skeleton h-2 rounded w-2/3"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildThreadDesc(params: SearchParams, threadIndex: number): string {
  const parts: string[] = [];
  if (params.keyword) parts.push(`"${params.keyword}"`);
  if (params.city)    parts.push(params.city);
  if (params.category && params.category !== 'all') parts.push(params.category);
  parts.push(params.sort === 'relevance,desc' ? 'by relevance' : `sort: ${params.sort}`);
  if (threadIndex === 2 && !params.city) parts.push('(nationwide)');
  if (threadIndex === 3) parts.push('(broad match)');
  return parts.join(' · ');
}

function renderThreadResults(section: HTMLElement, i: number, params: SearchParams, events: TMEvent[]): void {
  const tc = THREAD_COLORS[i];
  const desc = buildThreadDesc(params, i);

  if (events.length === 0) {
    section.innerHTML = `
      <div class="rounded-2xl border ${tc.border} ${tc.bg} p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${tc.badge}">
            ${tc.label}
          </span>
          <span class="text-xs text-zinc-500">${desc}</span>
        </div>
        <p class="text-sm text-zinc-600 italic">No events found for this query.</p>
      </div>
    `;
    return;
  }

  section.innerHTML = `
    <div class="rounded-2xl border ${tc.border} ${tc.bg} p-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${tc.badge}">
            ✓ ${tc.label}
          </span>
          <span class="text-xs text-zinc-500">${desc}</span>
        </div>
        <span class="text-xs text-zinc-500">${events.length} results</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${events.slice(0, 8).map(e => renderEventCard(e)).join('')}
      </div>
      ${events.length > 8 ? `
        <div class="mt-3 text-center text-xs text-zinc-500">+ ${events.length - 8} more on Ticketmaster</div>
      ` : ''}
    </div>
  `;
}

function renderThreadError(section: HTMLElement, i: number, params: SearchParams, msg: string): void {
  const tc = THREAD_COLORS[i];
  const desc = buildThreadDesc(params, i);
  section.innerHTML = `
    <div class="rounded-2xl border border-red-800/30 bg-red-900/10 p-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${tc.badge}">
          ✗ ${tc.label}
        </span>
        <span class="text-xs text-zinc-500">${desc}</span>
      </div>
      <p class="text-sm text-red-400">${msg}</p>
    </div>
  `;
}

// Boot
render();
