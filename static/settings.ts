import bm from 'bm';

declare const lucide: { createIcons(): void };

const PLANS = [
  { id: 'starter', label: 'Starter',  threads: 25,  price: '$249/mo',  color: 'text-teal-300',    border: 'border-teal-600/40',   bg: 'bg-teal-900/10' },
  { id: 'pro',     label: 'Pro',      threads: 75,  price: '$749/mo',  color: 'text-violet-300',  border: 'border-violet-600/40', bg: 'bg-violet-900/10' },
  { id: 'broker',  label: 'Broker',   threads: 150, price: '$10,000/mo',color: 'text-amber-300',   border: 'border-amber-600/40',  bg: 'bg-amber-900/10' },
];

async function boot() {
  const me = await bm.auth.me();
  if (!me) { location.href = '/login.html'; return; }

  // Load or create broker profile
  let profile: any = null;
  try {
    const res = await bm.api.get('/api/broker_profiles?limit=1');
    profile = res?.data?.[0] || null;
  } catch {}

  if (!profile) {
    // Create a default starter profile
    try {
      profile = await bm.api.post('/api/broker_profiles', { plan: 'starter', tm_api_key: '', key_label: '' });
      profile = profile?.data || profile;
    } catch {}
  }

  render(me, profile);
}

function render(me: any, profile: any) {
  const app = document.getElementById('app')!;
  const plan = profile?.plan || 'starter';
  const planInfo = PLANS.find(p => p.id === plan) || PLANS[0];
  const tmKey = profile?.tm_api_key || '';
  const keyLabel = profile?.key_label || '';
  const today = new Date().toISOString().slice(0, 10);
  const usageToday = (profile?.usage_date === today ? profile?.usage_today : 0) || 0;

  app.innerHTML = `
    <!-- Header -->
    <header class="sticky top-0 z-30 px-6 py-3 flex items-center justify-between bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60">
      <div class="flex items-center gap-3">
        <a href="/" class="flex items-center gap-3 group">
          <div class="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow shadow-violet-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <span class="text-base font-bold text-white group-hover:text-violet-300 transition-colors">TicketSpin</span>
        </a>
        <span class="text-zinc-700">/</span>
        <span class="text-sm text-zinc-400">Settings</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-zinc-500">${me.first_name || me.email}</span>
        <button id="signout-btn" class="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Sign out</button>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-4 py-10 space-y-8">

      <!-- Current Plan -->
      <div class="rounded-2xl border ${planInfo.border} ${planInfo.bg} p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-white">${planInfo.label} Plan</h2>
            <p class="${planInfo.color} font-semibold text-sm">${planInfo.price}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold border ${planInfo.border} ${planInfo.color} uppercase tracking-wide">Active</span>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-zinc-900/60 rounded-xl p-3 text-center">
            <div class="text-2xl font-black ${planInfo.color}">${planInfo.threads}</div>
            <div class="text-xs text-zinc-500 mt-0.5">Threads</div>
          </div>
          <div class="bg-zinc-900/60 rounded-xl p-3 text-center">
            <div class="text-2xl font-black text-zinc-200">${usageToday}</div>
            <div class="text-xs text-zinc-500 mt-0.5">Calls today</div>
          </div>
          <div class="bg-zinc-900/60 rounded-xl p-3 text-center">
            <div class="text-2xl font-black text-zinc-200">5,000</div>
            <div class="text-xs text-zinc-500 mt-0.5">Daily limit</div>
          </div>
        </div>
      </div>

      <!-- Upgrade Plans -->
      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">Plans</h3>
        <div class="grid grid-cols-3 gap-3">
          ${PLANS.map(p => `
            <div class="rounded-xl border ${p.id === plan ? p.border + ' ' + p.bg : 'border-zinc-800 bg-zinc-900/40'} p-4 text-center relative">
              ${p.id === plan ? `<div class="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">Current</div>` : ''}
              <div class="font-bold text-white mb-1">${p.label}</div>
              <div class="text-2xl font-black ${p.color} mb-1">${p.threads}</div>
              <div class="text-xs text-zinc-600 mb-3">threads</div>
              <div class="text-sm font-semibold ${p.color}">${p.price}</div>
              ${p.id !== plan ? `<button data-upgrade="${p.id}" class="mt-3 w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors">
                ${p.threads > planInfo.threads ? 'Upgrade' : 'Downgrade'}
              </button>` : ''}
            </div>
          `).join('')}
        </div>
        <p class="mt-3 text-xs text-zinc-700 text-center">Billing managed manually — contact us to upgrade your plan.</p>
      </div>

      <!-- API Key -->
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div class="flex items-center gap-2 mb-1">
          <i data-lucide="key" class="w-4 h-4 text-violet-400"></i>
          <h3 class="font-semibold text-white">Ticketmaster API Key</h3>
        </div>
        <p class="text-xs text-zinc-500 mb-4">
          Your personal key from
          <a href="https://developer.ticketmaster.com/products-and-docs/apis/getting-started/" target="_blank" class="text-violet-400 hover:underline">developer.ticketmaster.com</a>.
          Each key = 5,000 req/day. Stored encrypted, only used for your searches.
        </p>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">Label (optional)</label>
            <input id="key-label" type="text" value="${keyLabel}" placeholder="e.g. My TM Key"
              class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">Consumer Key</label>
            <input id="tm-key" type="password" value="${tmKey}" placeholder="Paste your Ticketmaster Consumer Key"
              class="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm font-mono focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40" />
          </div>
          <div id="key-save-msg" class="hidden text-xs text-green-400 flex items-center gap-1.5">
            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Key saved successfully
          </div>
          <button id="save-key-btn"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-sm transition-all duration-150">
            <i data-lucide="save" class="w-4 h-4"></i>
            Save API Key
          </button>
        </div>
      </div>

      <!-- How to get your key -->
      <div class="rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-6">
        <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
          <i data-lucide="book-open" class="w-4 h-4 text-zinc-400"></i>
          How to get your API key (2 minutes)
        </h3>
        <ol class="space-y-2 text-sm text-zinc-400">
          <li class="flex gap-2"><span class="text-violet-400 font-bold shrink-0">1.</span> Go to <a href="https://developer.ticketmaster.com" target="_blank" class="text-violet-400 hover:underline">developer.ticketmaster.com</a> and create a free account</li>
          <li class="flex gap-2"><span class="text-violet-400 font-bold shrink-0">2.</span> Click <strong class="text-zinc-200">My Apps</strong> → <strong class="text-zinc-200">Create New App</strong></li>
          <li class="flex gap-2"><span class="text-violet-400 font-bold shrink-0">3.</span> Give it any name, skip all optional fields, click <strong class="text-zinc-200">Save</strong></li>
          <li class="flex gap-2"><span class="text-violet-400 font-bold shrink-0">4.</span> Copy your <strong class="text-zinc-200">Consumer Key</strong> and paste it above</li>
          <li class="flex gap-2"><span class="text-violet-400 font-bold shrink-0">5.</span> Free tier = 5,000 requests/day — plenty for serious broker scanning</li>
        </ol>
      </div>

      <!-- Account -->
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
          <i data-lucide="user" class="w-4 h-4 text-zinc-400"></i>
          Account
        </h3>
        <div class="text-sm text-zinc-400 space-y-1">
          <p>Email: <span class="text-zinc-200">${me.email}</span></p>
          <p>Member since: <span class="text-zinc-200">${new Date(me.created_at || Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span></p>
        </div>
      </div>
    </div>
  `;

  // Wire sign out
  document.getElementById('signout-btn')!.addEventListener('click', async () => {
    await bm.auth.signOut();
    location.href = '/login.html';
  });

  // Wire save key
  document.getElementById('save-key-btn')!.addEventListener('click', async () => {
    const key = (document.getElementById('tm-key') as HTMLInputElement).value.trim();
    const label = (document.getElementById('key-label') as HTMLInputElement).value.trim();
    const btn = document.getElementById('save-key-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.innerHTML = '<span>Saving…</span>';
    try {
      if (profile?.id) {
        await bm.api.patch(`/api/broker_profiles/${profile.id}`, { tm_api_key: key, key_label: label });
      } else {
        await bm.api.post('/api/broker_profiles', { plan: 'starter', tm_api_key: key, key_label: label });
      }
      const msg = document.getElementById('key-save-msg')!;
      msg.className = 'text-xs text-green-400 flex items-center gap-1.5';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      setTimeout(() => { msg.className = 'hidden'; }, 3000);
    } catch (err: any) {
      alert('Failed to save: ' + (err?.message || 'unknown error'));
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" class="w-4 h-4 pointer-events-none"></i> Save API Key';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

boot();
