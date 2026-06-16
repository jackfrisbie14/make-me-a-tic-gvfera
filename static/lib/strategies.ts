import type { SearchParams } from './ticketmaster';

export interface Strategy {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: 'starter' | 'pro' | 'broker';
  color: { border: string; bg: string; badge: string; dot: string };
  buildParams: (base: SearchParams) => SearchParams & { page?: number };
}

// Nearby cities for city sweep
const NEARBY_CITIES: Record<string, string[]> = {
  'new york': ['Newark', 'Brooklyn', 'Philadelphia', 'Hartford'],
  'los angeles': ['Anaheim', 'Long Beach', 'San Diego', 'Inglewood'],
  'chicago': ['Rosemont', 'Evanston', 'Milwaukee', 'Indianapolis'],
  'dallas': ['Fort Worth', 'Arlington', 'Frisco', 'Houston'],
  'miami': ['Fort Lauderdale', 'Boca Raton', 'West Palm Beach', 'Orlando'],
  'boston': ['Providence', 'Worcester', 'Hartford', 'Portsmouth'],
  'seattle': ['Tacoma', 'Bellevue', 'Portland', 'Vancouver'],
  'denver': ['Boulder', 'Fort Collins', 'Colorado Springs', 'Salt Lake City'],
  'atlanta': ['Alpharetta', 'Duluth', 'Charlotte', 'Nashville'],
  'san francisco': ['Oakland', 'San Jose', 'Sacramento', 'Berkeley'],
};

function nearbyCities(city: string): string[] {
  const key = city.toLowerCase().trim();
  for (const [k, v] of Object.entries(NEARBY_CITIES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return [];
}

// Date helpers
function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
  return addDays(today(), n);
}

// ─── THE 25 STRATEGIES ────────────────────────────────────────────────────────

export const ALL_STRATEGIES: Strategy[] = [
  // ── STARTER (1–5) ──────────────────────────────────────────────────────────
  {
    id: 'exact',
    name: 'Exact Match',
    icon: 'search',
    description: 'Your exact search, date sorted',
    tier: 'starter',
    color: { border: 'border-violet-600/40', bg: 'bg-violet-900/10', badge: 'bg-violet-600/20 text-violet-300 border-violet-600/40', dot: 'bg-violet-500' },
    buildParams: (b) => ({ ...b, sort: 'date,asc' }),
  },
  {
    id: 'relevance',
    name: 'Relevance',
    icon: 'sparkles',
    description: 'Highest relevance matches',
    tier: 'starter',
    color: { border: 'border-cyan-600/40', bg: 'bg-cyan-900/10', badge: 'bg-cyan-600/20 text-cyan-300 border-cyan-600/40', dot: 'bg-cyan-500' },
    buildParams: (b) => ({ ...b, sort: 'relevance,desc' }),
  },
  {
    id: 'offsale',
    name: 'Sold Out 🔥',
    icon: 'flame',
    description: 'Off-sale events = resale goldmine',
    tier: 'starter',
    color: { border: 'border-red-600/40', bg: 'bg-red-900/10', badge: 'bg-red-600/20 text-red-300 border-red-600/40', dot: 'bg-red-500' },
    buildParams: (b) => ({ ...b, sort: 'date,asc' }),
  },
  {
    id: 'this_weekend',
    name: 'This Weekend',
    icon: 'calendar',
    description: 'Events in the next 72 hours',
    tier: 'starter',
    color: { border: 'border-amber-600/40', bg: 'bg-amber-900/10', badge: 'bg-amber-600/20 text-amber-300 border-amber-600/40', dot: 'bg-amber-500' },
    buildParams: (b) => ({ ...b, startDate: today(), endDate: daysFromNow(3), sort: 'date,asc' }),
  },
  {
    id: 'name_az',
    name: 'A–Z Browse',
    icon: 'list',
    description: 'Alphabetical — catch obscure listings',
    tier: 'starter',
    color: { border: 'border-teal-600/40', bg: 'bg-teal-900/10', badge: 'bg-teal-600/20 text-teal-300 border-teal-600/40', dot: 'bg-teal-500' },
    buildParams: (b) => ({ ...b, sort: 'name,asc' }),
  },

  // ── PRO (6–12) ─────────────────────────────────────────────────────────────
  {
    id: 'nationwide',
    name: 'Nationwide',
    icon: 'map',
    description: 'Remove city filter — all markets',
    tier: 'pro',
    color: { border: 'border-blue-600/40', bg: 'bg-blue-900/10', badge: 'bg-blue-600/20 text-blue-300 border-blue-600/40', dot: 'bg-blue-500' },
    buildParams: (b) => ({ ...b, city: '', sort: 'date,asc' }),
  },
  {
    id: 'date_back_3',
    name: '−3 Day Sweep',
    icon: 'rewind',
    description: 'Scan 3 days before target date',
    tier: 'pro',
    color: { border: 'border-indigo-600/40', bg: 'bg-indigo-900/10', badge: 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40', dot: 'bg-indigo-500' },
    buildParams: (b) => ({
      ...b,
      startDate: b.startDate ? addDays(b.startDate, -3) : addDays(today(), -3),
      endDate:   b.startDate ? addDays(b.startDate, -1) : today(),
      sort: 'date,asc',
    }),
  },
  {
    id: 'date_fwd_3',
    name: '+3 Day Sweep',
    icon: 'fast-forward',
    description: 'Scan 3 days after target date',
    tier: 'pro',
    color: { border: 'border-purple-600/40', bg: 'bg-purple-900/10', badge: 'bg-purple-600/20 text-purple-300 border-purple-600/40', dot: 'bg-purple-500' },
    buildParams: (b) => ({
      ...b,
      startDate: b.endDate ? addDays(b.endDate, 1)   : daysFromNow(1),
      endDate:   b.endDate ? addDays(b.endDate, 3)   : daysFromNow(4),
      sort: 'date,asc',
    }),
  },
  {
    id: 'first_word',
    name: 'Broad Keyword',
    icon: 'type',
    description: 'First word only — catch alternate spellings',
    tier: 'pro',
    color: { border: 'border-pink-600/40', bg: 'bg-pink-900/10', badge: 'bg-pink-600/20 text-pink-300 border-pink-600/40', dot: 'bg-pink-500' },
    buildParams: (b) => ({ ...b, keyword: b.keyword.split(' ')[0] || b.keyword, sort: 'relevance,desc' }),
  },
  {
    id: 'music',
    name: 'Music Only',
    icon: 'music',
    description: 'Force Music segment filter',
    tier: 'pro',
    color: { border: 'border-rose-600/40', bg: 'bg-rose-900/10', badge: 'bg-rose-600/20 text-rose-300 border-rose-600/40', dot: 'bg-rose-500' },
    buildParams: (b) => ({ ...b, category: 'Music', sort: 'date,asc' }),
  },
  {
    id: 'sports',
    name: 'Sports Only',
    icon: 'trophy',
    description: 'Force Sports segment filter',
    tier: 'pro',
    color: { border: 'border-green-600/40', bg: 'bg-green-900/10', badge: 'bg-green-600/20 text-green-300 border-green-600/40', dot: 'bg-green-500' },
    buildParams: (b) => ({ ...b, category: 'Sports', sort: 'date,asc' }),
  },
  {
    id: 'next_month',
    name: 'Next 30 Days',
    icon: 'calendar-days',
    description: 'Full upcoming month of events',
    tier: 'pro',
    color: { border: 'border-lime-600/40', bg: 'bg-lime-900/10', badge: 'bg-lime-600/20 text-lime-300 border-lime-600/40', dot: 'bg-lime-500' },
    buildParams: (b) => ({ ...b, startDate: today(), endDate: daysFromNow(30), sort: 'date,asc' }),
  },

  // ── BROKER (13–25) ─────────────────────────────────────────────────────────
  {
    id: 'nearby_1',
    name: 'Nearby City 1',
    icon: 'map-pin',
    description: 'Closest metro market',
    tier: 'broker',
    color: { border: 'border-orange-600/40', bg: 'bg-orange-900/10', badge: 'bg-orange-600/20 text-orange-300 border-orange-600/40', dot: 'bg-orange-500' },
    buildParams: (b) => ({ ...b, city: nearbyCities(b.city)[0] || b.city, sort: 'date,asc' }),
  },
  {
    id: 'nearby_2',
    name: 'Nearby City 2',
    icon: 'map-pin',
    description: '2nd closest metro market',
    tier: 'broker',
    color: { border: 'border-yellow-600/40', bg: 'bg-yellow-900/10', badge: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40', dot: 'bg-yellow-500' },
    buildParams: (b) => ({ ...b, city: nearbyCities(b.city)[1] || b.city, sort: 'date,asc' }),
  },
  {
    id: 'nearby_3',
    name: 'Nearby City 3',
    icon: 'map-pin',
    description: '3rd closest metro market',
    tier: 'broker',
    color: { border: 'border-amber-600/40', bg: 'bg-amber-900/10', badge: 'bg-amber-600/20 text-amber-300 border-amber-600/40', dot: 'bg-amber-500' },
    buildParams: (b) => ({ ...b, city: nearbyCities(b.city)[2] || b.city, sort: 'date,asc' }),
  },
  {
    id: 'nearby_4',
    name: 'Nearby City 4',
    icon: 'map-pin',
    description: '4th closest metro market',
    tier: 'broker',
    color: { border: 'border-red-700/40', bg: 'bg-red-950/20', badge: 'bg-red-700/20 text-red-400 border-red-700/40', dot: 'bg-red-600' },
    buildParams: (b) => ({ ...b, city: nearbyCities(b.city)[3] || b.city, sort: 'date,asc' }),
  },
  {
    id: 'presale_scan',
    name: 'Presale Scan',
    icon: 'key',
    description: 'Events with presale/exclusive notes',
    tier: 'broker',
    color: { border: 'border-violet-500/40', bg: 'bg-violet-950/20', badge: 'bg-violet-500/20 text-violet-200 border-violet-500/40', dot: 'bg-violet-400' },
    buildParams: (b) => ({ ...b, keyword: (b.keyword ? b.keyword + ' presale' : 'presale'), sort: 'date,asc' }),
  },
  {
    id: 'vip_packages',
    name: 'VIP Packages',
    icon: 'star',
    description: 'VIP / premium packages listed',
    tier: 'broker',
    color: { border: 'border-yellow-500/40', bg: 'bg-yellow-950/20', badge: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40', dot: 'bg-yellow-400' },
    buildParams: (b) => ({ ...b, keyword: (b.keyword ? b.keyword + ' VIP' : 'VIP'), sort: 'date,asc' }),
  },
  {
    id: 'page2',
    name: 'Page 2 Results',
    icon: 'layers',
    description: 'Second page — overlooked inventory',
    tier: 'broker',
    color: { border: 'border-cyan-500/40', bg: 'bg-cyan-950/20', badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40', dot: 'bg-cyan-400' },
    buildParams: (b) => ({ ...b, sort: 'date,asc', page: 1 }),
  },
  {
    id: 'page3',
    name: 'Page 3 Results',
    icon: 'layers',
    description: 'Third page — deep inventory scan',
    tier: 'broker',
    color: { border: 'border-teal-500/40', bg: 'bg-teal-950/20', badge: 'bg-teal-500/20 text-teal-200 border-teal-500/40', dot: 'bg-teal-400' },
    buildParams: (b) => ({ ...b, sort: 'date,asc', page: 2 }),
  },
  {
    id: 'next_90',
    name: 'Next 90 Days',
    icon: 'calendar-range',
    description: 'Full quarter — forward planning',
    tier: 'broker',
    color: { border: 'border-emerald-500/40', bg: 'bg-emerald-950/20', badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40', dot: 'bg-emerald-400' },
    buildParams: (b) => ({ ...b, startDate: today(), endDate: daysFromNow(90), sort: 'date,asc' }),
  },
  {
    id: 'arts',
    name: 'Arts & Theatre',
    icon: 'drama',
    description: 'Theatre, opera, comedy — all arts',
    tier: 'broker',
    color: { border: 'border-pink-500/40', bg: 'bg-pink-950/20', badge: 'bg-pink-500/20 text-pink-200 border-pink-500/40', dot: 'bg-pink-400' },
    buildParams: (b) => ({ ...b, category: 'Arts & Theatre', sort: 'date,asc' }),
  },
  {
    id: 'last_minute',
    name: 'Last Minute',
    icon: 'clock',
    description: 'Next 24hrs — panic sellers drop tickets',
    tier: 'broker',
    color: { border: 'border-red-500/40', bg: 'bg-red-950/20', badge: 'bg-red-500/20 text-red-200 border-red-500/40', dot: 'bg-red-400' },
    buildParams: (b) => ({ ...b, startDate: today(), endDate: daysFromNow(1), sort: 'date,asc' }),
  },
  {
    id: 'no_dates',
    name: 'All Dates',
    icon: 'infinity',
    description: 'Remove date filters entirely',
    tier: 'broker',
    color: { border: 'border-indigo-500/40', bg: 'bg-indigo-950/20', badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40', dot: 'bg-indigo-400' },
    buildParams: (b) => ({ ...b, startDate: '', endDate: '', sort: 'date,asc' }),
  },
  {
    id: 'keyword_city_swap',
    name: 'City in Keyword',
    icon: 'refresh-cw',
    description: 'Move city into keyword field',
    tier: 'broker',
    color: { border: 'border-blue-500/40', bg: 'bg-blue-950/20', badge: 'bg-blue-500/20 text-blue-200 border-blue-500/40', dot: 'bg-blue-400' },
    buildParams: (b) => ({
      ...b,
      keyword: [b.keyword, b.city].filter(Boolean).join(' '),
      city: '',
      sort: 'relevance,desc',
    }),
  },
];

export const TIER_LIMITS = {
  starter: 5,
  pro: 12,
  broker: 25,
};

export type Tier = keyof typeof TIER_LIMITS;
