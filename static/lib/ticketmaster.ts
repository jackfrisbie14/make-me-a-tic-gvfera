export interface SearchParams {
  keyword:   string;
  city:      string;
  startDate: string;
  endDate:   string;
  category:  string;
  sort:      string;
  size?:     string;
  page?:     number;
  tm_key?:   string;
  sg_key?:   string;
  sh_key?:   string;
  source?:   'ticketmaster' | 'seatgeek' | 'stubhub';
}

export interface TMEvent {
  id:          string;
  name:        string;
  url:         string;
  images?:     { url: string; width: number; height: number }[];
  dates?:      { start?: { localDate?: string; localTime?: string }; status?: { code: string } };
  priceRanges?:{ min: number; max: number; currency: string }[];
  classifications?:{ segment?: { name: string }; genre?: { name: string } }[];
  _embedded?:  { venues?: { name: string; city?: { name: string }; state?: { stateCode: string } }[] };
  pleaseNote?: string;
  _source?:    'ticketmaster' | 'seatgeek' | 'stubhub';
}

// ─── Ticketmaster search ───────────────────────────────────────────────────────
export async function searchTickets(params: SearchParams): Promise<TMEvent[]> {
  const q = new URLSearchParams();
  if (params.keyword)   q.set('keyword',  params.keyword);
  if (params.city)      q.set('city',     params.city);
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate)   q.set('endDate',   params.endDate);
  if (params.category && params.category !== 'all') q.set('category', params.category);
  if (params.sort)      q.set('sort',     params.sort);
  if (params.size)      q.set('size',     params.size);
  if (params.page != null) q.set('page', String(params.page));
  if (params.tm_key)    q.set('tm_key',   params.tm_key);

  const res = await fetch(`/api/search-tickets?${q}`);
  if (!res.ok) throw new Error(`Ticketmaster ${res.status}`);
  const json = await res.json();
  const events: TMEvent[] = json?._embedded?.events ?? [];
  return events.map(e => ({ ...e, _source: 'ticketmaster' as const }));
}

// ─── SeatGeek search ──────────────────────────────────────────────────────────
export async function searchSeatGeek(params: SearchParams): Promise<TMEvent[]> {
  if (!params.sg_key) return [];
  const q = new URLSearchParams();
  if (params.keyword)   q.set('keyword',  params.keyword);
  if (params.city)      q.set('city',     params.city);
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate)   q.set('endDate',   params.endDate);
  if (params.category && params.category !== 'all') q.set('category', params.category);
  if (params.sort)      q.set('sort',     params.sort);
  if (params.size)      q.set('size',     params.size || '20');
  if (params.page != null) q.set('page', String((params.page || 0) + 1));
  if (params.sg_key)    q.set('sg_key',   params.sg_key);

  try {
    const res = await fetch(`/api/search-seatgeek?${q}`);
    if (!res.ok) return [];
    const json = await res.json();
    const events = json?.events ?? [];
    // Normalize SeatGeek shape → TMEvent shape
    return events.map((e: any): TMEvent => ({
      id:   'sg_' + e.id,
      name: e.title || e.short_title || '',
      url:  e.url || '',
      images: e.performers?.[0]?.image ? [{ url: e.performers[0].image, width: 640, height: 360 }] : [],
      dates: {
        start: { localDate: e.datetime_utc?.slice(0, 10), localTime: e.datetime_utc?.slice(11, 16) },
        status: { code: e.announce_date ? 'onsale' : 'onsale' },
      },
      priceRanges: e.stats?.lowest_price != null ? [{
        min: e.stats.lowest_price,
        max: e.stats.highest_price || e.stats.lowest_price,
        currency: 'USD',
      }] : [],
      classifications: [{ segment: { name: e.type || 'Event' }, genre: { name: e.taxonomies?.[0]?.name || '' } }],
      _embedded: { venues: e.venue ? [{ name: e.venue.name, city: { name: e.venue.city }, state: { stateCode: e.venue.state } }] : [] },
      pleaseNote: e.description || '',
      _source: 'seatgeek',
    }));
  } catch {
    return [];
  }
}

// ─── StubHub search ───────────────────────────────────────────────────────────
export async function searchStubHub(params: SearchParams): Promise<TMEvent[]> {
  if (!params.sh_key) return [];
  const q = new URLSearchParams();
  if (params.keyword)   q.set('keyword',  params.keyword);
  if (params.city)      q.set('city',     params.city);
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate)   q.set('endDate',   params.endDate);
  if (params.size)      q.set('size',     params.size || '20');
  if (params.page != null) q.set('page', String(params.page || 0));
  if (params.sh_key)    q.set('sh_key',   params.sh_key);

  try {
    const res = await fetch(`/api/search-stubhub?${q}`);
    if (!res.ok) return [];
    const json = await res.json();
    const events = json?.events ?? [];
    return events.map((e: any): TMEvent => ({
      id:   'sh_' + e.id,
      name: e.name || e.title || '',
      url:  e.webURI ? `https://www.stubhub.com${e.webURI}` : 'https://www.stubhub.com',
      images: e.heroImageUrl ? [{ url: e.heroImageUrl, width: 640, height: 360 }] : [],
      dates: {
        start: { localDate: e.eventDateLocal?.slice(0, 10), localTime: e.eventDateLocal?.slice(11, 16) },
        status: { code: 'onsale' },
      },
      priceRanges: e.ticketInfo?.minListPrice != null ? [{
        min: e.ticketInfo.minListPrice,
        max: e.ticketInfo.maxListPrice || e.ticketInfo.minListPrice,
        currency: e.ticketInfo.currencyCode || 'USD',
      }] : [],
      classifications: [{ segment: { name: e.categoryGroupName || 'Event' }, genre: { name: e.categoryName || '' } }],
      _embedded: { venues: e.venue ? [{ name: e.venue.name, city: { name: e.venue.city }, state: { stateCode: e.venue.state } }] : [] },
      _source: 'stubhub',
    }));
  } catch {
    return [];
  }
}

// ─── Unified multi-source search ──────────────────────────────────────────────
export async function searchAll(params: SearchParams): Promise<TMEvent[]> {
  const [tm, sg, sh] = await Promise.allSettled([
    searchTickets(params),
    searchSeatGeek(params),
    searchStubHub(params),
  ]);
  const all: TMEvent[] = [];
  if (tm.status === 'fulfilled') all.push(...tm.value);
  if (sg.status === 'fulfilled') all.push(...sg.value);
  if (sh.status === 'fulfilled') all.push(...sh.value);
  return all;
}

// ─── Display helpers ──────────────────────────────────────────────────────────
export function getBestImage(images?: TMEvent['images']): string {
  if (!images?.length) return '';
  // Prefer 16:9 ~640w images
  const preferred = images
    .filter(i => i.url && !i.url.includes('RECOMENDATION'))
    .sort((a, b) => {
      const aScore = Math.abs(a.width - 640);
      const bScore = Math.abs(b.width - 640);
      return aScore - bScore;
    });
  return preferred[0]?.url || images[0]?.url || '';
}

export function formatDate(event: TMEvent): string {
  const d = event.dates?.start?.localDate;
  const t = event.dates?.start?.localTime;
  if (!d) return 'Date TBA';
  const date = new Date(d + 'T00:00:00');
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!t) return dateStr;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${dateStr} · ${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatPrice(event: TMEvent): string {
  const pr = event.priceRanges?.[0];
  if (!pr) return 'See site';
  const fmt = (n: number) => n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
  if (pr.min === pr.max) return fmt(pr.min);
  return `${fmt(pr.min)} – ${fmt(pr.max)}`;
}

export function getVenue(event: TMEvent): string {
  const v = event._embedded?.venues?.[0];
  if (!v) return '';
  const parts = [v.name, v.city?.name, v.state?.stateCode].filter(Boolean);
  return parts.join(', ');
}

export function getGenre(event: TMEvent): string {
  const c = event.classifications?.[0];
  return c?.genre?.name && c.genre.name !== 'Undefined' ? c.genre.name : (c?.segment?.name || '');
}

export function getStatusBadge(event: TMEvent): { label: string; color: string } {
  const src = (event as any)._source;
  const srcBadge = src === 'seatgeek' ? '🪑 ' : src === 'stubhub' ? '🎫 ' : '';
  const code = event.dates?.status?.code;
  if (code === 'offsale' || code === 'cancelled') {
    return { label: srcBadge + '🔥 Sold Out', color: 'bg-red-600/20 text-red-300 border-red-600/40' };
  }
  if (code === 'rescheduled') {
    return { label: srcBadge + '📅 Rescheduled', color: 'bg-amber-600/20 text-amber-300 border-amber-600/40' };
  }
  const note = (event.pleaseNote || '').toLowerCase();
  if (note.includes('limited') || note.includes('selling fast')) {
    return { label: srcBadge + '⚡ Limited', color: 'bg-orange-600/20 text-orange-300 border-orange-600/40' };
  }
  return { label: srcBadge + '✓ On Sale', color: 'bg-green-600/20 text-green-300 border-green-600/40' };
}
