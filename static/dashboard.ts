import bm from 'bm';

declare const lucide: { createIcons(): void };
declare const Chart: any;

let me: any = null;
let profile: any = null;
let searches: any[] = [];
let watchlists: any[] = [];
let activeTab: 'overview' | 'history' | 'watchlist' = 'overview';
let chart: any = null;

async function boot() {
  me = await bm.auth.me();
  if (!me) { location.href = '/login.html'; return; }

  await Promise.all([
    loadProfile(),
    loadSearches(),
    loadWatchlists(),
  ]);

  render();
}

async function loadProfile() {
  try {
    const res = await bm.api.get('/api/broker_profiles?limit=1') as any;
    profile = res?.data?.[0] || null;
  } catch {}
}

async function loadSearches() {
  try {
    const res = await bm.api.get('/api/searches?limit=500&orderBy=created_at:desc') as any;
    searches = res?.data || [];
  } catch {}
}

async function loadWatchlists() {
  try {
    const res = await bm.api.get('/api/watchlists?limit=100&orderBy=created_at:desc') as any;
    watchlists = res?.data || [];
  } catch {}
}

// ─── Stats computation ────────────────────────────────────────────────────────
function computeStats() {
  const today = new Date().toISOString().slice(0, 10);
  const todaySearches = searches.filter(s => s.created_at?.startsWith(today));
  const totalResults = searches.reduce((a, s) => a + (s.results || 0), 0);
  const totalSoldOut = searches.reduce((a, s) => a + (s.sold_out || 0), 0);
  const todayResults = todaySearches.reduce((a, s) => a + (s.results || 0), 0);

  // Group by day for chart (last 14 days)
  const days: Record<string, { searches: number; results: number; soldOut: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days[d.toISOString().slice(0, 10)] = { searches: 0, results: 0, soldOut: 0 };
  }
  searches.forEach(s => {
    const day = s.created_at?.slice(0, 10);
    if (day && days[day]) {
      days[day].searches++;
      days[day].results += (s.results || 0);
      days[day].soldOut += (s.sold_out || 0);
    }
  });

  // Top keywords
  const kwCount: Record<string, number> = {};
  searches.forEach(s => { if (s.keyword) kwCount[s.keyword] = (kwCount[s.keyword] || 0) + 1; });
  const topKeywords = Object.entries(kwCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Source breakdown
  const srcCount: Record<string, number> = {};
  searches.forEach(s => { const src = s.source || 'ticketmaster'; srcCount[src] = (srcCount[src] || 0) + 1; });

  return {
    totalSearches: searches.length,
    todaySearches: todaySearches.length,
    totalResults,
    todayResults,
    totalSoldOut,
    opportunityRate: totalResults > 0 ? Math.round((totalSoldOut / totalResults) * 100) : 0,
    days,
    topKeywords,
    srcCount,
  };
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const root = document.getElementById('app')!;
  const plan = (profile?.plan || 'starter') as 'starter' | 'pro' | 'broker';
  const threadCap = { starter: 25, pro: 75, broker: 150 }[plan];
  const planLabels = { starter: 'Starter', pro: 'Pro', broker: 'Broker' };
  const stats = computeStats();
  const tmConnected = !!profile?.tm_api_key;
  const sgConnected = !!profile?.sg_api_key;
  const shConnected = !!profile?.sh_api_key;
  const sourcesConnected = [tmConnected, sgConnected, shConnected].filter(Boolean).length;

  root.innerHTML = `
    <div class="bg-zinc-950 min-h-screen">

      <!-- Header -->
      <header class="sticky top-0 z-30 px-4 py-3 flex items-center justify-between bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60">
        <div class="flex items-center gap-3">
          <a href="/" class="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm">
            <i data-lucide="arrow-left" class="w-4 h-4 pointer-events-none"></i>
            <span class="hidden sm:inline">Back to Spinner</span>
          </a>
          <span class="text-zinc-700">|</span>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <i data-lucide="bar-chart-2" class="w-3.5 h-3.5 text-white pointer-events-none"></i>
            </div>
            <span class="font-semibold text-sm text-white">Broker Dashboard</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/settings.html" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors">
            <i data-lucide="settings" class="w-3.5 h-3.5 pointer-events-none"></i>
            Settings
          </a>
          <button id="signout-btn" class="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors">Sign out</button>
        </div>
      </header>

      <div class="max-w-6xl mx-auto px-4 py-8">

        <!-- Title row -->
        <div class="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white mb-1">Good ${greeting()}, ${me?.first_name || me?.email?.split('@')[0] || 'Broker'} 👋</h1>
            <p class="text-zinc-500 text-sm">Here's your ticket hunting performance at a glance.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-lg border border-violet-600/40 bg-violet-900/10 text-xs font-bold text-violet-300">
              ${planLabels[plan]} · ${threadCap} threads
            </span>
            <span class="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-400">
              ${sourcesConnected}/3 sources
            </span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 mb-6 bg-zinc-900/60 rounded-xl p-1 w-fit border border-zinc-800">
          ${(['overview','history','watchlist'] as const).map(tab => `
            <button data-tab="${tab}" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}">
              ${tab === 'overview' ? '📊 Overview' : tab === 'history' ? '📋 Search History' : '👁️ Watchlist'}
            </button>
          `).join('')}
        </div>

        <!-- ── OVERVIEW ── -->
        ${activeTab === 'overview' ? `

        <!-- KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          ${kpiCard('Total Searches', stats.totalSearches.toLocaleString(), 'search', 'Today: ' + stats.todaySearches, 'violet')}
          ${kpiCard('Events Found', stats.totalResults.toLocaleString(), 'ticket', 'Today: ' + stats.todayResults, 'teal')}
          ${kpiCard('Sold-Out Found 🔥', stats.totalSoldOut.toLocaleString(), 'flame', 'Resale opportunities', 'red')}
          ${kpiCard('Opportunity Rate', stats.opportunityRate + '%', 'trending-up', 'Sold-out / total events', 'amber')}
        </div>

        <!-- Source connections -->
        <div class="grid sm:grid-cols-3 gap-3 mb-6">
          ${sourceCard('🎟️', 'Ticketmaster', 'Primary market · face value', tmConnected, '/settings.html')}
          ${sourceCard('🪑', 'SeatGeek', 'Secondary market · resale', sgConnected, '/settings.html')}
          ${sourceCard('🎫', 'StubHub', 'Secondary market · resale', shConnected, '/settings.html')}
        </div>

        <!-- Chart -->
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 mb-6">
          <h3 class="font-semibold text-zinc-200 mb-1 text-sm">Search Activity — Last 14 Days</h3>
          <p class="text-xs text-zinc-600 mb-4">Searches per day across all sources</p>
          <div class="h-48">
            <canvas id="activity-chart"></canvas>
          </div>
        </div>

        <!-- Top keywords + thread plan -->
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 class="font-semibold text-zinc-200 mb-3 text-sm">Top Searched Keywords</h3>
            ${stats.topKeywords.length === 0
              ? `<p class="text-xs text-zinc-600 italic">No searches yet — run your first spin!</p>`
              : `<div class="space-y-2">
                  ${stats.topKeywords.map(([kw, count], i) => `
                    <div class="flex items-center gap-3">
                      <span class="text-xs font-bold text-zinc-600 w-4">${i+1}</span>
                      <div class="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-violet-500 h-1.5 rounded-full" style="width:${Math.round((count / stats.topKeywords[0][1]) * 100)}%"></div>
                      </div>
                      <span class="text-xs text-zinc-300 font-medium w-24 truncate">${kw}</span>
                      <span class="text-xs text-zinc-500">${count}×</span>
                    </div>
                  `).join('')}
                </div>`
            }
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 class="font-semibold text-zinc-200 mb-3 text-sm">Your Thread Capacity</h3>
            <div class="space-y-3">
              ${(['starter','pro','broker'] as const).map(p => {
                const cap = { starter: 25, pro: 75, broker: 150 }[p];
                const pct = Math.round((cap / 150) * 100);
                const colors = { starter: 'bg-teal-500', pro: 'bg-violet-500', broker: 'bg-amber-500' };
                const textColors = { starter: 'text-teal-300', pro: 'text-violet-300', broker: 'text-amber-300' };
                const active = plan === p;
                return `
                  <div class="${active ? 'opacity-100' : 'opacity-30'}">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-semibold ${active ? textColors[p] : 'text-zinc-500'}">${planLabels[p]}${active ? ' ← you' : ''}</span>
                      <span class="text-xs text-zinc-500">${cap} threads</span>
                    </div>
                    <div class="bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div class="${colors[p]} h-1.5 rounded-full" style="width:${pct}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            ${plan !== 'broker' ? `
              <a href="/settings.html#plan" class="mt-4 inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300">
                <i data-lucide="zap" class="w-3 h-3 pointer-events-none"></i>
                Upgrade to unlock more threads
              </a>
            ` : `
              <p class="mt-4 text-xs text-amber-400">🏆 You're on the max plan — 150 threads!</p>
            `}
          </div>
        </div>

        ` : ''}

        <!-- ── SEARCH HISTORY ── -->
        ${activeTab === 'history' ? `
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div class="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 class="font-semibold text-zinc-200 text-sm">Recent Searches (${searches.length})</h3>
            <button id="refresh-history" class="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
              <i data-lucide="refresh-cw" class="w-3 h-3 pointer-events-none"></i> Refresh
            </button>
          </div>
          ${searches.length === 0
            ? `<div class="px-5 py-12 text-center text-zinc-600 text-sm">No searches yet. Go spin some tickets! 🎫</div>`
            : `<div class="divide-y divide-zinc-800/60">
                ${searches.slice(0, 50).map(s => `
                  <div class="px-5 py-3 flex items-center gap-4 hover:bg-zinc-900/60 transition-colors">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0">
                      ${srcEmoji(s.source)}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-zinc-200 truncate">${s.keyword || '(no keyword)'} ${s.city ? '· ' + s.city : ''}</div>
                      <div class="text-xs text-zinc-600">${s.strategy || 'Custom'} · ${formatTime(s.created_at)}</div>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      <span class="text-xs text-zinc-400">${s.results || 0} events</span>
                      ${s.sold_out > 0 ? `<span class="text-xs font-bold text-red-400">🔥 ${s.sold_out} sold out</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
              ${searches.length > 50 ? `<div class="px-5 py-3 text-xs text-zinc-600 text-center border-t border-zinc-800">Showing 50 of ${searches.length} searches</div>` : ''}
            `
          }
        </div>
        ` : ''}

        <!-- ── WATCHLIST ── -->
        ${activeTab === 'watchlist' ? `
        <div class="space-y-4">
          <!-- Add watchlist item -->
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 class="font-semibold text-zinc-200 mb-4 text-sm">Add to Watchlist</h3>
            <form id="watchlist-form" class="flex flex-wrap gap-2">
              <input id="wl-keyword" type="text" placeholder="Artist / Event / Team"
                class="flex-1 min-w-40 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500" />
              <input id="wl-city" type="text" placeholder="City (optional)"
                class="w-40 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500" />
              <input id="wl-notes" type="text" placeholder="Notes (optional)"
                class="w-48 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500" />
              <button type="submit" class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                + Watch
              </button>
            </form>
          </div>

          <!-- Watchlist items -->
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div class="px-5 py-4 border-b border-zinc-800">
              <h3 class="font-semibold text-zinc-200 text-sm">Watching (${watchlists.filter(w => w.active).length})</h3>
            </div>
            ${watchlists.length === 0
              ? `<div class="px-5 py-12 text-center text-zinc-600 text-sm">
                  No watchlist items yet.<br/>
                  <span class="text-xs text-zinc-700">Add keywords above to track sold-out events — we'll flag them when they appear in your searches.</span>
                </div>`
              : `<div class="divide-y divide-zinc-800/60">
                  ${watchlists.map(w => `
                    <div class="px-5 py-3 flex items-center gap-4 hover:bg-zinc-900/60 transition-colors ${!w.active ? 'opacity-40' : ''}">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-semibold text-zinc-200">${w.keyword}</span>
                          ${w.city ? `<span class="text-xs text-zinc-500">📍 ${w.city}</span>` : ''}
                          ${w.notes ? `<span class="text-xs text-zinc-600 italic">${w.notes}</span>` : ''}
                        </div>
                        <div class="text-xs text-zinc-600 mt-0.5">
                          Added ${formatTime(w.created_at)}
                          ${w.hit_count > 0 ? ` · <span class="text-green-400">${w.hit_count} hits</span>` : ''}
                          ${w.last_hit ? ` · Last seen ${formatTime(w.last_hit)}` : ''}
                        </div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <a href="/?keyword=${encodeURIComponent(w.keyword)}${w.city ? '&city=' + encodeURIComponent(w.city) : ''}"
                          class="px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-600/30 text-xs text-violet-300 hover:bg-violet-600/30 transition-colors">
                          Spin Now
                        </a>
                        <button data-delete-wl="${w.id}" class="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>`
            }
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p class="text-xs text-zinc-500 leading-relaxed">
              <strong class="text-zinc-400">How watchlists work:</strong> Every time you spin, any events matching your watchlist keywords
              are automatically flagged. In a future update, we'll add email/SMS alerts when watched events show up as sold-out —
              giving you a real-time resale opportunity feed.
            </p>
          </div>
        </div>
        ` : ''}

      </div>
    </div>
  `;

  // Wire tabs
  root.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = (btn as HTMLElement).dataset.tab as any;
      render();
    });
  });

  // Wire signout
  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    await bm.auth.signOut();
    location.href = '/login.html';
  });

  // Wire refresh history
  document.getElementById('refresh-history')?.addEventListener('click', async () => {
    await loadSearches();
    render();
  });

  // Wire watchlist form
  const wlForm = document.getElementById('watchlist-form') as HTMLFormElement | null;
  if (wlForm) {
    wlForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const kw = (document.getElementById('wl-keyword') as HTMLInputElement).value.trim();
      const city = (document.getElementById('wl-city') as HTMLInputElement).value.trim();
      const notes = (document.getElementById('wl-notes') as HTMLInputElement).value.trim();
      if (!kw) return;
      try {
        await bm.api.post('/api/watchlists', { keyword: kw, city, notes });
        await loadWatchlists();
        render();
      } catch {}
    });
  }

  // Wire watchlist delete
  root.querySelectorAll('[data-delete-wl]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.deleteWl!;
      if (!confirm('Remove from watchlist?')) return;
      try {
        await bm.api.delete(`/api/watchlists/${id}`);
        await loadWatchlists();
        render();
      } catch {}
    });
  });

  lucide?.createIcons();

  // Draw chart after render
  if (activeTab === 'overview') {
    const stats2 = computeStats();
    const canvas = document.getElementById('activity-chart') as HTMLCanvasElement | null;
    if (canvas && typeof Chart !== 'undefined') {
      if (chart) chart.destroy();
      const labels = Object.keys(stats2.days).map(d => {
        const dt = new Date(d + 'T00:00:00Z');
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const data = Object.values(stats2.days).map(d => d.searches);
      const soldOutData = Object.values(stats2.days).map(d => d.soldOut);
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Searches',
              data,
              backgroundColor: 'rgba(139, 92, 246, 0.4)',
              borderColor: 'rgba(139, 92, 246, 0.8)',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Sold-Out Found',
              data: soldOutData,
              backgroundColor: 'rgba(239, 68, 68, 0.4)',
              borderColor: 'rgba(239, 68, 68, 0.8)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#71717a', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#52525b', font: { size: 10 } }, grid: { color: '#27272a' } },
            y: { ticks: { color: '#52525b', font: { size: 10 } }, grid: { color: '#27272a' }, beginAtZero: true },
          },
        },
      });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function kpiCard(label: string, value: string, icon: string, sub: string, color: string) {
  const colors: Record<string, string> = {
    violet: 'border-violet-600/30 bg-violet-900/10',
    teal: 'border-teal-600/30 bg-teal-900/10',
    red: 'border-red-600/30 bg-red-900/10',
    amber: 'border-amber-600/30 bg-amber-900/10',
  };
  const textColors: Record<string, string> = {
    violet: 'text-violet-300', teal: 'text-teal-300', red: 'text-red-300', amber: 'text-amber-300',
  };
  return `
    <div class="rounded-2xl border ${colors[color]} p-5">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-zinc-500">${label}</span>
        <i data-lucide="${icon}" class="w-4 h-4 ${textColors[color]} pointer-events-none"></i>
      </div>
      <div class="text-3xl font-black ${textColors[color]} mb-1">${value}</div>
      <div class="text-xs text-zinc-600">${sub}</div>
    </div>
  `;
}

function sourceCard(logo: string, name: string, sub: string, connected: boolean, href: string) {
  return `
    <div class="rounded-xl border ${connected ? 'border-green-700/30 bg-green-900/10' : 'border-zinc-800 bg-zinc-900/40'} p-4 flex items-center gap-3">
      <div class="text-xl">${logo}</div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-zinc-200">${name}</div>
        <div class="text-xs text-zinc-600">${sub}</div>
      </div>
      ${connected
        ? `<span class="flex items-center gap-1 text-xs text-green-400 font-semibold shrink-0">
            <i data-lucide="check-circle" class="w-3.5 h-3.5 pointer-events-none"></i> Live
           </span>`
        : `<a href="${href}" class="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-400 shrink-0 transition-colors">
            <i data-lucide="plus-circle" class="w-3.5 h-3.5 pointer-events-none"></i> Connect
           </a>`
      }
    </div>
  `;
}

function srcEmoji(src: string): string {
  if (src === 'seatgeek') return '🪑';
  if (src === 'stubhub') return '🎫';
  return '🎟️';
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

boot();
