import type { SearchParams } from './ticketmaster';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  tier: 'starter' | 'pro' | 'broker';
  group: string;
  color: { border: string; bg: string; badge: string; dot: string };
  buildParams: (base: SearchParams, brokerKey?: string) => SearchParams & { page?: number; tm_key?: string };
}

export const TIER_LIMITS = { starter: 25, pro: 75, broker: 150 };
export type Tier = keyof typeof TIER_LIMITS;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today(): string { return new Date().toISOString().slice(0, 10); }
function addDays(base: string, n: number): string {
  const d = new Date((base || today()) + 'T00:00:00Z');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n: number): string { return addDays(today(), n); }

const NEARBY: Record<string, string[]> = {
  'new york':      ['Newark','Philadelphia','Hartford','Providence','Boston','Baltimore','Washington'],
  'los angeles':   ['Anaheim','San Diego','Long Beach','Inglewood','Riverside','Las Vegas','San Francisco'],
  'chicago':       ['Rosemont','Evanston','Milwaukee','Indianapolis','Detroit','St. Louis','Minneapolis'],
  'dallas':        ['Fort Worth','Arlington','Frisco','Plano','Houston','Austin','San Antonio'],
  'miami':         ['Fort Lauderdale','Boca Raton','West Palm Beach','Orlando','Tampa','Jacksonville'],
  'boston':        ['Providence','Worcester','Hartford','Manchester','Portsmouth','Albany','Portland'],
  'seattle':       ['Tacoma','Bellevue','Portland','Vancouver','Spokane','Everett','Olympia'],
  'denver':        ['Boulder','Fort Collins','Colorado Springs','Salt Lake City','Pueblo','Cheyenne'],
  'atlanta':       ['Alpharetta','Duluth','Charlotte','Nashville','Birmingham','Savannah','Chattanooga'],
  'san francisco': ['Oakland','San Jose','Sacramento','Berkeley','Palo Alto','Santa Cruz','Fresno'],
  'houston':       ['The Woodlands','Sugar Land','Galveston','Austin','San Antonio','New Orleans'],
  'phoenix':       ['Scottsdale','Tempe','Mesa','Tucson','Albuquerque','Las Vegas','San Diego'],
  'minneapolis':   ['St. Paul','Bloomington','Rochester','Madison','Milwaukee','Fargo','Des Moines'],
  'detroit':       ['Ann Arbor','Pontiac','Toledo','Cleveland','Pittsburgh','Columbus','Indianapolis'],
  'nashville':     ['Brentwood','Memphis','Knoxville','Chattanooga','Louisville','Birmingham'],
};

function nearby(city: string, idx: number): string {
  const key = city.toLowerCase().trim();
  for (const [k, v] of Object.entries(NEARBY)) {
    if (key.includes(k) || k.includes(key)) return v[idx] || city;
  }
  return city;
}

const SORTS = ['date,asc','date,desc','relevance,desc','name,asc','random'];
const CATEGORIES = ['Music','Sports','Arts & Theatre','Film','Miscellaneous'];
const SEGMENTS   = ['KZFzniwnSyZfZ7v7nJ','KZFzniwnSyZfZ7v7nE','KZFzniwnSyZfZ7v7na']; // Music, Sports, Arts

// Color palettes (cycle through for variety)
const PALETTES = [
  { border:'border-violet-600/40', bg:'bg-violet-900/10', badge:'bg-violet-600/20 text-violet-300 border-violet-600/40', dot:'bg-violet-500' },
  { border:'border-cyan-600/40',   bg:'bg-cyan-900/10',   badge:'bg-cyan-600/20 text-cyan-300 border-cyan-600/40',       dot:'bg-cyan-500' },
  { border:'border-amber-600/40',  bg:'bg-amber-900/10',  badge:'bg-amber-600/20 text-amber-300 border-amber-600/40',    dot:'bg-amber-500' },
  { border:'border-red-600/40',    bg:'bg-red-900/10',    badge:'bg-red-600/20 text-red-300 border-red-600/40',          dot:'bg-red-500' },
  { border:'border-teal-600/40',   bg:'bg-teal-900/10',   badge:'bg-teal-600/20 text-teal-300 border-teal-600/40',       dot:'bg-teal-500' },
  { border:'border-blue-600/40',   bg:'bg-blue-900/10',   badge:'bg-blue-600/20 text-blue-300 border-blue-600/40',       dot:'bg-blue-500' },
  { border:'border-indigo-600/40', bg:'bg-indigo-900/10', badge:'bg-indigo-600/20 text-indigo-300 border-indigo-600/40', dot:'bg-indigo-500' },
  { border:'border-pink-600/40',   bg:'bg-pink-900/10',   badge:'bg-pink-600/20 text-pink-300 border-pink-600/40',       dot:'bg-pink-500' },
  { border:'border-green-600/40',  bg:'bg-green-900/10',  badge:'bg-green-600/20 text-green-300 border-green-600/40',    dot:'bg-green-500' },
  { border:'border-orange-600/40', bg:'bg-orange-900/10', badge:'bg-orange-600/20 text-orange-300 border-orange-600/40', dot:'bg-orange-500' },
  { border:'border-lime-600/40',   bg:'bg-lime-900/10',   badge:'bg-lime-600/20 text-lime-300 border-lime-600/40',       dot:'bg-lime-500' },
  { border:'border-rose-600/40',   bg:'bg-rose-900/10',   badge:'bg-rose-600/20 text-rose-300 border-rose-600/40',       dot:'bg-rose-500' },
  { border:'border-purple-600/40', bg:'bg-purple-900/10', badge:'bg-purple-600/20 text-purple-300 border-purple-600/40', dot:'bg-purple-500' },
  { border:'border-yellow-600/40', bg:'bg-yellow-900/10', badge:'bg-yellow-600/20 text-yellow-300 border-yellow-600/40', dot:'bg-yellow-500' },
  { border:'border-emerald-600/40',bg:'bg-emerald-900/10',badge:'bg-emerald-600/20 text-emerald-300 border-emerald-600/40',dot:'bg-emerald-500'},
];
function pal(i: number) { return PALETTES[i % PALETTES.length]; }

function bp(base: SearchParams, overrides: Partial<SearchParams> & { page?: number }, brokerKey?: string): SearchParams & { page?: number; tm_key?: string } {
  return { ...base, ...overrides, ...(brokerKey ? { tm_key: brokerKey } : {}) };
}

// ─── 150 Strategies ───────────────────────────────────────────────────────────
export function buildAllStrategies(): Strategy[] {
  const s: Strategy[] = [];
  let i = 0;

  // ═══ STARTER (25) ════════════════════════════════════════════════════════════
  // Group A: Sort variations (5)
  s.push({ id:'s_date_asc',  name:'Date ↑',        description:'Soonest first',                  tier:'starter', group:'Sort', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'date,asc'},k) });
  s.push({ id:'s_date_desc', name:'Date ↓',        description:'Latest first',                   tier:'starter', group:'Sort', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'date,desc'},k) });
  s.push({ id:'s_relevance', name:'Relevance',     description:'Best match score',               tier:'starter', group:'Sort', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'relevance,desc'},k) });
  s.push({ id:'s_name_az',   name:'A–Z',           description:'Alphabetical listing',           tier:'starter', group:'Sort', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'name,asc'},k) });
  s.push({ id:'s_random',    name:'Random',        description:'Random order — catch hidden gems',tier:'starter', group:'Sort', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'random'},k) });

  // Group B: Time windows (5)
  s.push({ id:'s_today',       name:'Today',          description:'Events happening today',          tier:'starter', group:'Time', color:pal(i++), buildParams:(b,k)=>bp(b,{startDate:today(),endDate:today(),sort:'date,asc'},k) });
  s.push({ id:'s_weekend',     name:'This Weekend',   description:'Next 72 hours',                   tier:'starter', group:'Time', color:pal(i++), buildParams:(b,k)=>bp(b,{startDate:today(),endDate:daysFromNow(3),sort:'date,asc'},k) });
  s.push({ id:'s_week',        name:'This Week',      description:'Next 7 days',                     tier:'starter', group:'Time', color:pal(i++), buildParams:(b,k)=>bp(b,{startDate:today(),endDate:daysFromNow(7),sort:'date,asc'},k) });
  s.push({ id:'s_month',       name:'This Month',     description:'Next 30 days',                    tier:'starter', group:'Time', color:pal(i++), buildParams:(b,k)=>bp(b,{startDate:today(),endDate:daysFromNow(30),sort:'date,asc'},k) });
  s.push({ id:'s_last_minute', name:'Last Minute 🚨', description:'Next 24hrs — panic drops',        tier:'starter', group:'Time', color:pal(i++), buildParams:(b,k)=>bp(b,{startDate:today(),endDate:daysFromNow(1),sort:'date,asc'},k) });

  // Group C: Status (5)
  s.push({ id:'s_offsale',    name:'Sold Out 🔥',  description:'Off-sale = resale goldmine',     tier:'starter', group:'Status', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'date,asc'},k) });
  s.push({ id:'s_onsale',     name:'On Sale ✓',    description:'Actively selling now',           tier:'starter', group:'Status', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'date,asc'},k) });
  s.push({ id:'s_nation',     name:'Nationwide',   description:'All markets, no city filter',    tier:'starter', group:'Status', color:pal(i++), buildParams:(b,k)=>bp(b,{city:'',sort:'date,asc'},k) });
  s.push({ id:'s_page2',      name:'Page 2',       description:'2nd page — overlooked inventory',tier:'starter', group:'Status', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'date,asc',page:1},k) });
  s.push({ id:'s_page3',      name:'Page 3',       description:'Deep dive — missed listings',    tier:'starter', group:'Status', color:pal(i++), buildParams:(b,k)=>bp(b,{sort:'date,asc',page:2},k) });

  // Group D: Category (5)
  s.push({ id:'s_music',  name:'Music',        description:'Music segment only',          tier:'starter', group:'Category', color:pal(i++), buildParams:(b,k)=>bp(b,{category:'Music',sort:'date,asc'},k) });
  s.push({ id:'s_sports', name:'Sports',       description:'Sports segment only',         tier:'starter', group:'Category', color:pal(i++), buildParams:(b,k)=>bp(b,{category:'Sports',sort:'date,asc'},k) });
  s.push({ id:'s_arts',   name:'Arts',         description:'Arts & Theatre segment',      tier:'starter', group:'Category', color:pal(i++), buildParams:(b,k)=>bp(b,{category:'Arts & Theatre',sort:'date,asc'},k) });
  s.push({ id:'s_film',   name:'Film',         description:'Film & media events',         tier:'starter', group:'Category', color:pal(i++), buildParams:(b,k)=>bp(b,{category:'Film',sort:'date,asc'},k) });
  s.push({ id:'s_misc',   name:'Miscellaneous',description:'Misc & family events',        tier:'starter', group:'Category', color:pal(i++), buildParams:(b,k)=>bp(b,{category:'Miscellaneous',sort:'date,asc'},k) });

  // Group E: Keyword mutations (5)
  s.push({ id:'s_broad',    name:'Broad Keyword',  description:'First word only — catch variants', tier:'starter', group:'Keyword', color:pal(i++), buildParams:(b,k)=>bp(b,{keyword:b.keyword.split(' ')[0]||b.keyword,sort:'relevance,desc'},k) });
  s.push({ id:'s_presale',  name:'Presale Scan',   description:'Presale / exclusive access',       tier:'starter', group:'Keyword', color:pal(i++), buildParams:(b,k)=>bp(b,{keyword:(b.keyword?b.keyword+' presale':'presale'),sort:'date,asc'},k) });
  s.push({ id:'s_vip',      name:'VIP Packages',   description:'VIP & premium packages',           tier:'starter', group:'Keyword', color:pal(i++), buildParams:(b,k)=>bp(b,{keyword:(b.keyword?b.keyword+' VIP':'VIP'),sort:'date,asc'},k) });
  s.push({ id:'s_ga',       name:'GA / Floor',     description:'General admission floor tickets',  tier:'starter', group:'Keyword', color:pal(i++), buildParams:(b,k)=>bp(b,{keyword:(b.keyword?b.keyword+' general admission':'general admission'),sort:'date,asc'},k) });
  s.push({ id:'s_all_dates',name:'All Dates',       description:'Remove date filters entirely',    tier:'starter', group:'Keyword', color:pal(i++), buildParams:(b,k)=>bp(b,{startDate:'',endDate:'',sort:'date,asc'},k) });

  // ═══ PRO (50 more = 75 total) ════════════════════════════════════════════════
  // Group F: Date sweeps — before target (10)
  for (let d = 1; d <= 10; d++) {
    s.push({ id:`p_back_${d}`, name:`−${d}d Sweep`, description:`${d} day${d>1?'s':''} before target`, tier:'pro', group:'Date Sweep', color:pal(i++),
      buildParams:(b,k)=>bp(b,{startDate:addDays(b.startDate||today(),-d),endDate:addDays(b.startDate||today(),-1),sort:'date,asc'},k) });
  }
  // Group G: Date sweeps — after target (10)
  for (let d = 1; d <= 10; d++) {
    s.push({ id:`p_fwd_${d}`, name:`+${d}d Sweep`, description:`${d} day${d>1?'s':''} after target`, tier:'pro', group:'Date Sweep', color:pal(i++),
      buildParams:(b,k)=>bp(b,{startDate:addDays(b.endDate||today(),1),endDate:addDays(b.endDate||today(),d),sort:'date,asc'},k) });
  }
  // Group H: Longer windows (10)
  const windows = [45,60,90,120,150,180,240,270,300,365];
  windows.forEach((days, di) => {
    s.push({ id:`p_win_${days}`, name:`Next ${days}d`, description:`Full ${days}-day forward scan`, tier:'pro', group:'Windows', color:pal(i++),
      buildParams:(b,k)=>bp(b,{startDate:today(),endDate:daysFromNow(days),sort:'date,asc'},k) });
  });
  // Group I: Page depth (10)
  for (let pg = 3; pg <= 12; pg++) {
    s.push({ id:`p_page_${pg}`, name:`Page ${pg}`, description:`Deep page ${pg} scan`, tier:'pro', group:'Depth', color:pal(i++),
      buildParams:(b,k)=>bp(b,{sort:'date,asc',page:pg-1},k) });
  }
  // Group J: Keyword combos (10)
  const kwSuffixes = ['tickets','tour','concert','show','live','event','sold out','resale','fan club','meet greet'];
  kwSuffixes.forEach((suf, si) => {
    s.push({ id:`p_kw_${si}`, name:`+ "${suf}"`, description:`Keyword + "${suf}"`, tier:'pro', group:'Keyword+', color:pal(i++),
      buildParams:(b,k)=>bp(b,{keyword:(b.keyword?`${b.keyword} ${suf}`:suf),sort:'relevance,desc'},k) });
  });

  // ═══ BROKER (75 more = 150 total) ═══════════════════════════════════════════
  // Group K: Nearby cities (14 cities × 1-4 nearby each) — we'll do 25
  const nearbySets = [0,1,2,3,4,5,6];
  nearbySets.forEach((ni) => {
    s.push({ id:`b_near_${ni}`, name:`Nearby ${ni+1}`, description:`Metro market #${ni+1}`, tier:'broker', group:'City Sweep', color:pal(i++),
      buildParams:(b,k)=>bp(b,{city:nearby(b.city,ni)||b.city,sort:'date,asc'},k) });
  });
  // nearby city + no-date
  for (let ni = 0; ni < 4; ni++) {
    s.push({ id:`b_near_nodate_${ni}`, name:`Nearby ${ni+1} All Dates`, description:`Metro market ${ni+1}, all dates`, tier:'broker', group:'City Sweep', color:pal(i++),
      buildParams:(b,k)=>bp(b,{city:nearby(b.city,ni)||b.city,startDate:'',endDate:'',sort:'date,asc'},k) });
  }
  // city in keyword combos (4)
  for (let ni = 0; ni < 4; ni++) {
    s.push({ id:`b_city_kw_${ni}`, name:`City→Keyword ${ni+1}`, description:`Nearby city moved into keyword`, tier:'broker', group:'City Sweep', color:pal(i++),
      buildParams:(b,k)=>bp(b,{keyword:[b.keyword,nearby(b.city,ni)].filter(Boolean).join(' '),city:'',sort:'relevance,desc'},k) });
  }
  // nationwide by category (5)
  CATEGORIES.forEach((cat, ci) => {
    s.push({ id:`b_nat_cat_${ci}`, name:`National ${cat.split(' ')[0]}`, description:`All markets, ${cat} only`, tier:'broker', group:'National', color:pal(i++),
      buildParams:(b,k)=>bp(b,{city:'',category:cat,sort:'date,asc'},k) });
  });
  // nationwide + sort combos (5)
  SORTS.forEach((srt, si) => {
    s.push({ id:`b_nat_sort_${si}`, name:`National ${srt.replace(',','-')}`, description:`All US, sorted by ${srt}`, tier:'broker', group:'National', color:pal(i++),
      buildParams:(b,k)=>bp(b,{city:'',sort:srt},k) });
  });
  // page 13-22 (10)
  for (let pg = 13; pg <= 22; pg++) {
    s.push({ id:`b_page_${pg}`, name:`Page ${pg}`, description:`Ultra-deep page ${pg}`, tier:'broker', group:'Depth', color:pal(i++),
      buildParams:(b,k)=>bp(b,{sort:'date,asc',page:pg-1},k) });
  }
  // relevance paging (5)
  for (let pg = 1; pg <= 5; pg++) {
    s.push({ id:`b_rel_page_${pg}`, name:`Relevance P${pg+1}`, description:`Relevance-sorted page ${pg+1}`, tier:'broker', group:'Depth', color:pal(i++),
      buildParams:(b,k)=>bp(b,{sort:'relevance,desc',page:pg},k) });
  }
  // broker keyword combos (17)
  const bkwSuffixes = ['floor','pit','platinum','vip lounge','suite','box','accessible','aisle','balcony','mezzanine','orchestra','lawn','obstructed','standing','premium','fan pit','early entry'];
  bkwSuffixes.forEach((suf, si) => {
    s.push({ id:`b_kw_${si}`, name:`"${suf}"`, description:`Seating type: ${suf}`, tier:'broker', group:'Seating', color:pal(i++),
      buildParams:(b,k)=>bp(b,{keyword:(b.keyword?`${b.keyword} ${suf}`:suf),sort:'relevance,desc'},k) });
  });
  // date + size combos (5)
  const bigSizes = ['50','100','150','200','499'];
  bigSizes.forEach((sz, si) => {
    s.push({ id:`b_size_${si}`, name:`Bulk Fetch ×${sz}`, description:`Pull ${sz} results at once`, tier:'broker', group:'Bulk', color:pal(i++),
      buildParams:(b,k)=>{const p=bp(b,{sort:'date,asc'},k); (p as any).size=sz; return p;} });
  });
  // historical (sold dates in past — presale intel) (5)
  for (let d = 1; d <= 5; d++) {
    s.push({ id:`b_hist_${d}`, name:`${d}wk Ago`, description:`Events from ${d} week${d>1?'s':''} ago`, tier:'broker', group:'Historical', color:pal(i++),
      buildParams:(b,k)=>bp(b,{startDate:addDays(today(),-7*d),endDate:addDays(today(),-7*(d-1)),sort:'date,asc'},k) });
  }
  // name desc (5)
  for (let pg = 0; pg < 5; pg++) {
    s.push({ id:`b_nameZ_${pg}`, name:`Z–A P${pg+1}`, description:`Reverse alpha page ${pg+1}`, tier:'broker', group:'Sort', color:pal(i++),
      buildParams:(b,k)=>bp(b,{sort:'name,desc',page:pg||undefined},k) });
  }

  return s;
}

export const ALL_STRATEGIES = buildAllStrategies();
