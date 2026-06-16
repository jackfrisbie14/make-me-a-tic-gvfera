import bm from 'bm';

declare const lucide: { createIcons(): void };

const PLAN_INFO = {
  starter: { label: 'Starter', price: '$249/mo', threads: 25, color: 'teal', desc: 'Perfect for individual brokers getting started.' },
  pro:     { label: 'Pro',     price: '$749/mo', threads: 75, color: 'violet', desc: 'For serious brokers running multiple markets.' },
  broker:  { label: 'Broker',  price: '$10,000/mo', threads: 150, color: 'amber', desc: 'Full 150-thread power. The professional edge.' },
};
type Plan = keyof typeof PLAN_INFO;

let me: any = null;
let profile: any = null;
let saving = false;
let activeTab: 'apikeys' | 'plan' | 'account' = 'apikeys';

async function boot() {
  me = await bm.auth.me();
  if (!me) { location.href = '/login.html'; return; }

  try {
    const res = await bm.api.get('/api/broker_profiles?limit=1') as any;
    profile = res?.data?.[0] || null;
    if (!profile) {
      // Create profile on first visit
      const created = await bm.api.post('/api/broker_profiles', { plan: 'starter' }) as any;
      profile = created?.data || created;
    }
  } catch {}

  render();
}

function render() {
  const root = document.getElementById('app')!;
  const plan: Plan = (profile?.plan || 'starter') as Plan;
  const info = PLAN_INFO[plan];
  const tmKey = profile?.tm_api_key || '';
  const sgKey = profile?.sg_api_key || '';
  const shKey = profile?.sh_api_key || '';

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
              <i data-lucide="settings" class="w-3.5 h-3.5 text-white pointer-events-none"></i>
            </div>
            <span class="font-semibold text-sm text-white">Settings</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-zinc-500">${me?.email || ''}</span>
          <button id="signout-btn" class="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div class="max-w-4xl mx-auto px-4 py-8">

        <!-- Page title -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-white mb-1">Account Settings</h1>
          <p class="text-zinc-500 text-sm">Manage your API keys, subscription plan, and account details.</p>
        </div>

        <!-- Tab nav -->
        <div class="flex gap-1 mb-6 bg-zinc-900/60 rounded-xl p-1 w-fit border border-zinc-800">
          ${(['apikeys','plan','account'] as const).map(tab => `
            <button data-tab="${tab}" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}">
              ${tab === 'apikeys' ? '🔑 API Keys' : tab === 'plan' ? '⚡ Plan' : '👤 Account'}
            </button>
          `).join('')}
        </div>

        <!-- ─── TAB: API Keys ─────────────────────────────────────── -->
        ${activeTab === 'apikeys' ? `
        <div class="space-y-6">

          <!-- Onboarding banner if no TM key -->
          ${!tmKey ? `
          <div class="rounded-2xl border border-amber-600/30 bg-amber-900/10 p-5 flex gap-4">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-600/30 flex items-center justify-center shrink-0">
              <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400 pointer-events-none"></i>
            </div>
            <div>
              <h3 class="font-semibold text-amber-300 mb-1">Get your free Ticketmaster API key</h3>
              <p class="text-sm text-amber-400/70 mb-3">You need a free Ticketmaster developer account to run searches. Takes 2 minutes.</p>
              <ol class="text-sm text-amber-300/80 space-y-1 list-decimal list-inside mb-3">
                <li>Go to <a href="https://developer.ticketmaster.com" target="_blank" class="underline hover:text-amber-200">developer.ticketmaster.com</a></li>
                <li>Sign up / log in → click <strong>My Apps</strong></li>
                <li>Create a new app → copy your <strong>Consumer Key</strong></li>
                <li>Paste it below ↓</li>
              </ol>
              <a href="https://developer.ticketmaster.com/products-and-docs/apis/getting-started/" target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm hover:bg-amber-500/30 transition-colors">
                <i data-lucide="external-link" class="w-4 h-4 pointer-events-none"></i>
                Open Ticketmaster Developer Portal
              </a>
            </div>
          </div>
          ` : ''}

          <!-- Ticketmaster Key -->
          ${apiKeyCard({
            id: 'tm',
            logo: '🎟️',
            name: 'Ticketmaster',
            subtitle: 'Discovery API — primary event search',
            docsUrl: 'https://developer.ticketmaster.com/products-and-docs/apis/getting-started/',
            docsLabel: 'Get free key at developer.ticketmaster.com',
            currentKey: tmKey,
            field: 'tm_api_key',
            placeholder: 'Paste your Consumer Key (e.g. xlDGiWcOV27y3W2CZl0iA8L9MvxL5uIU)',
            steps: ['Go to developer.ticketmaster.com', 'My Apps → Create App', 'Copy your Consumer Key'],
            color: 'blue',
            required: true,
          })}

          <!-- SeatGeek Key -->
          ${apiKeyCard({
            id: 'sg',
            logo: '🪑',
            name: 'SeatGeek',
            subtitle: 'Secondary market — resale pricing & inventory',
            docsUrl: 'https://platform.seatgeek.com/',
            docsLabel: 'Get key at platform.seatgeek.com',
            currentKey: sgKey,
            field: 'sg_api_key',
            placeholder: 'Paste your SeatGeek Client ID',
            steps: ['Go to platform.seatgeek.com', 'Register application', 'Copy your Client ID'],
            color: 'green',
            required: false,
          })}

          <!-- StubHub Key -->
          ${apiKeyCard({
            id: 'sh',
            logo: '🎫',
            name: 'StubHub',
            subtitle: 'Resale giant — real-time secondary market data',
            docsUrl: 'https://developer.stubhub.com/',
            docsLabel: 'Get key at developer.stubhub.com',
            currentKey: shKey,
            field: 'sh_api_key',
            placeholder: 'Paste your StubHub API Key',
            steps: ['Go to developer.stubhub.com', 'Create a developer account', 'Generate API credentials'],
            color: 'orange',
            required: false,
          })}

          <!-- Key pool explainer -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div class="flex items-start gap-3">
              <i data-lucide="info" class="w-4 h-4 text-zinc-500 mt-0.5 shrink-0 pointer-events-none"></i>
              <div>
                <p class="text-xs text-zinc-400 font-semibold mb-1">Why multiple sources?</p>
                <p class="text-xs text-zinc-600 leading-relaxed">
                  Ticketmaster shows face-value listings. SeatGeek and StubHub show resale prices.
                  With all three connected, your 150 threads scan <strong class="text-zinc-400">all three markets simultaneously</strong> —
                  giving you a complete picture of face value vs. resale spread for every event.
                  That arbitrage insight is what commands $10K/month.
                </p>
              </div>
            </div>
          </div>

        </div>
        ` : ''}

        <!-- ─── TAB: Plan ─────────────────────────────────────────── -->
        ${activeTab === 'plan' ? `
        <div class="space-y-4">
          <p class="text-sm text-zinc-500">Your current plan determines how many threads you can run per spin.</p>
          <div class="grid gap-4 sm:grid-cols-3">
            ${(['starter','pro','broker'] as Plan[]).map(p => {
              const pi = PLAN_INFO[p];
              const active = plan === p;
              const colors: Record<Plan, string> = {
                starter: 'border-teal-600/40 bg-teal-900/10',
                pro: 'border-violet-600/40 bg-violet-900/10',
                broker: 'border-amber-600/40 bg-amber-900/10',
              };
              const textColors: Record<Plan, string> = {
                starter: 'text-teal-300',
                pro: 'text-violet-300',
                broker: 'text-amber-300',
              };
              return `
              <div class="rounded-2xl border p-5 transition-all ${active ? colors[p] + ' ring-1 ring-inset ' + colors[p].split(' ')[0] : 'border-zinc-800 bg-zinc-900/40'}">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <h3 class="font-bold text-base ${active ? textColors[p] : 'text-zinc-300'}">${pi.label}</h3>
                    <p class="text-2xl font-black ${active ? textColors[p] : 'text-zinc-200'} mt-1">${pi.price}</p>
                  </div>
                  ${active ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">CURRENT</span>` : ''}
                </div>
                <div class="mb-4">
                  <div class="text-3xl font-black ${active ? textColors[p] : 'text-zinc-400'}">${pi.threads}</div>
                  <div class="text-xs text-zinc-600">concurrent threads</div>
                </div>
                <p class="text-xs text-zinc-500 mb-4">${pi.desc}</p>
                ${!active ? `
                  <button data-upgrade="${p}" class="w-full py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300 transition-colors upgrade-btn">
                    ${p === 'broker' ? 'Contact Sales' : 'Upgrade'}
                  </button>
                ` : `
                  <div class="w-full py-2 rounded-xl border border-zinc-700 text-center text-sm font-semibold text-zinc-500">Active Plan</div>
                `}
              </div>
              `;
            }).join('')}
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 mt-2">
            <p class="text-xs text-zinc-500 leading-relaxed">
              <strong class="text-zinc-400">Thread upgrade path:</strong> Each plan gives you more parallel search strategies per spin.
              The Broker plan's 150 threads fan out across Ticketmaster, SeatGeek, and StubHub simultaneously —
              effectively 50 threads per source, scanning face value, secondary market pricing, and inventory all at once.
              <strong class="text-zinc-400">Upgrade requires contacting us</strong> to provision your account — email
              <a href="mailto:hello@ticketspin.io" class="underline text-violet-400">hello@ticketspin.io</a>.
            </p>
          </div>
        </div>
        ` : ''}

        <!-- ─── TAB: Account ──────────────────────────────────────── -->
        ${activeTab === 'account' ? `
        <div class="space-y-4 max-w-md">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <h3 class="font-semibold text-zinc-200">Account Details</h3>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Email</label>
              <div class="px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm">${me?.email || ''}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Name</label>
              <div class="px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm">${me?.first_name || '—'}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Current Plan</label>
              <div class="px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm flex items-center gap-2">
                <span>${PLAN_INFO[plan].label}</span>
                <span class="text-zinc-600">·</span>
                <span class="text-zinc-500">${PLAN_INFO[plan].threads} threads</span>
                <span class="text-zinc-600">·</span>
                <span class="text-zinc-500">${PLAN_INFO[plan].price}</span>
              </div>
            </div>
          </div>
          <div class="rounded-xl border border-red-900/30 bg-red-900/10 p-4">
            <p class="text-xs text-zinc-500 mb-3">Need to cancel or change your plan? Contact us directly.</p>
            <a href="mailto:hello@ticketspin.io?subject=Account+Change+Request" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-800/40 bg-red-900/20 text-sm text-red-400 hover:bg-red-900/30 transition-colors">
              <i data-lucide="mail" class="w-4 h-4 pointer-events-none"></i>
              Contact Support
            </a>
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

  // Wire save buttons for each key card
  ['tm','sg','sh'].forEach(src => {
    const form = document.getElementById(`${src}-form`) as HTMLFormElement | null;
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById(`${src}-key-input`) as HTMLInputElement;
      const key = input.value.trim();
      const field = form.dataset.field!;
      const statusEl = document.getElementById(`${src}-status`);
      if (statusEl) statusEl.textContent = 'Saving…';
      try {
        if (profile?.id) {
          await bm.api.patch(`/api/broker_profiles/${profile.id}`, { [field]: key });
          if (profile) profile[field] = key;
        }
        if (statusEl) {
          statusEl.textContent = '✓ Saved';
          statusEl.className = 'text-xs text-green-400';
        }
        // Refresh profile
        const res = await bm.api.get('/api/broker_profiles?limit=1') as any;
        profile = res?.data?.[0] || profile;
        setTimeout(() => render(), 800);
      } catch (err: any) {
        if (statusEl) {
          statusEl.textContent = '✗ Error saving';
          statusEl.className = 'text-xs text-red-400';
        }
      }
    });

    // Wire remove button
    const removeBtn = document.getElementById(`${src}-remove`);
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        const field = removeBtn.dataset.field!;
        if (!confirm('Remove this API key?')) return;
        try {
          await bm.api.patch(`/api/broker_profiles/${profile.id}`, { [field]: '' });
          if (profile) profile[field] = '';
          const res = await bm.api.get('/api/broker_profiles?limit=1') as any;
          profile = res?.data?.[0] || profile;
          render();
        } catch {}
      });
    }
  });

  // Wire upgrade buttons
  root.querySelectorAll('[data-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = (btn as HTMLElement).dataset.upgrade!;
      if (plan === 'broker') {
        window.open('mailto:hello@ticketspin.io?subject=Broker+Plan+Inquiry', '_blank');
      } else {
        alert(`To upgrade to the ${PLAN_INFO[plan as Plan].label} plan, contact hello@ticketspin.io or we can wire Stripe billing here!`);
      }
    });
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── API key card component ────────────────────────────────────────────────────
interface CardOpts {
  id: string; logo: string; name: string; subtitle: string;
  docsUrl: string; docsLabel: string; currentKey: string;
  field: string; placeholder: string; steps: string[];
  color: string; required: boolean;
}
function apiKeyCard(opts: CardOpts): string {
  const { id, logo, name, subtitle, docsUrl, docsLabel, currentKey, field, placeholder, steps, color, required } = opts;
  const colorMap: Record<string, string> = {
    blue: 'border-blue-600/40 bg-blue-900/10',
    green: 'border-green-600/40 bg-green-900/10',
    orange: 'border-orange-600/40 bg-orange-900/10',
  };
  const activeColor = colorMap[color] || 'border-zinc-700 bg-zinc-900/40';
  const hasKey = !!currentKey;

  return `
    <div class="rounded-2xl border ${hasKey ? activeColor : 'border-zinc-800 bg-zinc-900/40'} p-5">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="text-2xl">${logo}</div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-zinc-200">${name}</h3>
              ${required ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/30 font-semibold">REQUIRED</span>` : `<span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-semibold">OPTIONAL</span>`}
            </div>
            <p class="text-xs text-zinc-500 mt-0.5">${subtitle}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${hasKey
            ? `<span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-900/20 text-green-400 border border-green-700/40">
                <i data-lucide="check-circle" class="w-3 h-3 pointer-events-none"></i> Connected
               </span>`
            : `<span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-500 border border-zinc-700">
                <i data-lucide="circle" class="w-3 h-3 pointer-events-none"></i> Not connected
               </span>`
          }
        </div>
      </div>

      <!-- Steps -->
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        ${steps.map((step, i) => `
          <div class="flex items-center gap-1.5 text-xs text-zinc-500">
            <span class="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">${i+1}</span>
            ${step}
          </div>
          ${i < steps.length - 1 ? '<span class="text-zinc-700">→</span>' : ''}
        `).join('')}
        <a href="${docsUrl}" target="_blank" class="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 ml-auto">
          <i data-lucide="external-link" class="w-3 h-3 pointer-events-none"></i>
          ${docsLabel}
        </a>
      </div>

      <!-- Key input form -->
      <form id="${id}-form" data-field="${field}">
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <input id="${id}-key-input" type="text"
              value="${hasKey ? maskKey(currentKey) : ''}"
              placeholder="${placeholder}"
              class="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 text-sm font-mono focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 pr-20"
            />
            ${hasKey ? `
              <button type="button" id="${id}-reveal" data-real="${currentKey}"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors">
                Show
              </button>
            ` : ''}
          </div>
          <button type="submit"
            class="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors whitespace-nowrap">
            ${hasKey ? 'Update' : 'Save Key'}
          </button>
          ${hasKey ? `
            <button type="button" id="${id}-remove" data-field="${field}"
              class="px-3 py-2.5 rounded-xl border border-red-800/30 bg-red-900/10 text-red-400 text-sm hover:bg-red-900/20 transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
            </button>
          ` : ''}
        </div>
        <p id="${id}-status" class="text-xs text-zinc-600 mt-1.5 h-4"></p>
      </form>

      <!-- Reveal logic inline -->
      ${hasKey ? `<script>
        setTimeout(() => {
          const btn = document.getElementById('${id}-reveal');
          const inp = document.getElementById('${id}-key-input');
          if (btn && inp) {
            btn.addEventListener('click', () => {
              const real = btn.dataset.real;
              if (inp.value.includes('•')) { inp.value = real; btn.textContent = 'Hide'; }
              else { inp.value = '${maskKey(currentKey)}'; btn.textContent = 'Show'; }
            });
          }
        }, 50);
      </script>` : ''}
    </div>
  `;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key;
  return key.slice(0, 4) + '•'.repeat(Math.max(0, key.length - 8)) + key.slice(-4);
}

boot();
