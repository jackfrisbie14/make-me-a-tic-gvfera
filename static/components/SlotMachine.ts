// Slot machine spinner component for the ticket finder

const REEL_SYMBOLS = ['🎵', '🎸', '🎭', '⚽', '🏀', '🎪', '🎺', '🎨', '🏆', '🎤'];

interface ReelState {
  el: HTMLElement;
  spinning: boolean;
  stopTimer?: ReturnType<typeof setTimeout>;
}

const reels: ReelState[] = [];

export function initReels(container: HTMLElement): void {
  container.innerHTML = '';
  reels.length = 0;

  for (let i = 0; i < 3; i++) {
    const reel = document.createElement('div');
    reel.className = 'slot-reel w-20 h-20 rounded-xl border-2 border-violet-700/60 bg-zinc-900 flex items-center justify-center overflow-hidden';

    const items = document.createElement('div');
    items.className = 'slot-items text-4xl text-center';
    items.style.lineHeight = '5rem';

    // Populate with symbols
    REEL_SYMBOLS.concat(REEL_SYMBOLS).forEach(sym => {
      const span = document.createElement('div');
      span.style.height = '5rem';
      span.style.display = 'flex';
      span.style.alignItems = 'center';
      span.style.justifyContent = 'center';
      span.textContent = sym;
      items.appendChild(span);
    });

    reel.appendChild(items);
    container.appendChild(reel);
    reels.push({ el: items, spinning: false });
  }
}

export function startSpin(): void {
  reels.forEach(r => {
    r.el.classList.remove('stopping');
    r.el.classList.add('spinning');
    r.spinning = true;
    if (r.stopTimer) clearTimeout(r.stopTimer);
  });
}

export function stopSpin(symbol?: string): void {
  reels.forEach((r, i) => {
    const delay = i * 220;
    r.stopTimer = setTimeout(() => {
      r.el.classList.remove('spinning');
      r.el.classList.add('stopping');
      r.spinning = false;

      // Set final symbol
      if (symbol) {
        const syms = r.el.querySelectorAll('div');
        if (syms.length > 0) {
          syms[0].textContent = symbol;
        }
      }

      setTimeout(() => {
        r.el.classList.remove('stopping');
      }, 500);
    }, delay);
  });
}

export function getRandomSymbols(events: { classifications?: Array<{ segment?: { name: string } }> }[]): string[] {
  const sportEvents = events.filter(e => e.classifications?.[0]?.segment?.name === 'Sports');
  const musicEvents = events.filter(e => e.classifications?.[0]?.segment?.name === 'Music');

  if (sportEvents.length > musicEvents.length) return ['⚽', '🏆', '⚽'];
  if (musicEvents.length > 0) return ['🎵', '🎤', '🎵'];
  return ['🎭', '🎪', '🎭'];
}
