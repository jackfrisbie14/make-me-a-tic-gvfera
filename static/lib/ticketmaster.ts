// Ticketmaster API client
export interface TMEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    status: { code: string };
  };
  classifications?: Array<{
    genre?: { name: string };
    segment?: { name: string };
  }>;
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  images?: Array<{
    url: string;
    width: number;
    height: number;
    ratio?: string;
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      state?: { name: string };
      country?: { name: string };
    }>;
  };
  pleaseNote?: string;
  accessibility?: { info?: string };
}

export interface SearchParams {
  keyword: string;
  city: string;
  startDate: string;
  endDate: string;
  category: string;
  sort: string;
  page?: number;
}

export async function searchTickets(params: SearchParams): Promise<TMEvent[]> {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.city)    qs.set('city', params.city);
  if (params.startDate) qs.set('startDate', params.startDate + 'T00:00:00Z');
  if (params.endDate)   qs.set('endDate', params.endDate + 'T23:59:59Z');
  if (params.category && params.category !== 'all') qs.set('category', params.category);
  qs.set('sort', params.sort);
  qs.set('size', '20');
  qs.set('page', String(params.page ?? 0));

  const res = await fetch(`/api/search-tickets?${qs.toString()}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();

  // TM wraps events in _embedded.events
  return data?._embedded?.events ?? [];
}

export function getBestImage(images: TMEvent['images']): string {
  if (!images || images.length === 0) return '';
  // prefer 16_9 ratio, largest
  const sixteenNine = images.filter(i => i.ratio === '16_9').sort((a, b) => b.width - a.width);
  if (sixteenNine.length) return sixteenNine[0].url;
  return images.sort((a, b) => b.width - a.width)[0].url;
}

export function formatDate(event: TMEvent): string {
  const d = event.dates?.start?.localDate;
  const t = event.dates?.start?.localTime;
  if (!d) return 'Date TBD';
  const date = new Date(d + 'T' + (t || '00:00:00'));
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    ...(t ? { hour: 'numeric', minute: '2-digit' } : {})
  });
}

export function formatPrice(event: TMEvent): string {
  const pr = event.priceRanges?.[0];
  if (!pr) return 'Price TBD';
  if (pr.min === pr.max) return `$${pr.min.toFixed(0)}`;
  return `$${pr.min.toFixed(0)} – $${pr.max.toFixed(0)}`;
}

export function getVenue(event: TMEvent): string {
  const v = event._embedded?.venues?.[0];
  if (!v) return '';
  const parts = [v.name, v.city?.name, v.state?.name].filter(Boolean);
  return parts.join(', ');
}

export function getGenre(event: TMEvent): string {
  return event.classifications?.[0]?.genre?.name
    || event.classifications?.[0]?.segment?.name
    || '';
}

export function getStatusBadge(event: TMEvent): { label: string; color: string } {
  const code = event.dates?.status?.code || '';
  switch (code) {
    case 'onsale':      return { label: 'On Sale', color: 'bg-green-500/20 text-green-400 border-green-500/40' };
    case 'offsale':     return { label: 'Off Sale', color: 'bg-red-500/20 text-red-400 border-red-500/40' };
    case 'cancelled':   return { label: 'Cancelled', color: 'bg-red-700/20 text-red-300 border-red-700/40' };
    case 'postponed':   return { label: 'Postponed', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' };
    case 'rescheduled': return { label: 'Rescheduled', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
    default:            return { label: 'Available', color: 'bg-violet-500/20 text-violet-400 border-violet-500/40' };
  }
}
