/** Site-wide behavior: click tracking, open/closed status, sticky bar, reveal-on-scroll, year. */
import { track, type AhEvent } from './analytics';

// Click tracking for tel:/sms: and anything with data-track
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="tel:"], a[href^="sms:"], [data-track]');
  if (!a) return;
  const ev = (a.dataset.track as AhEvent) || (a.getAttribute('href')?.startsWith('sms:') ? 'click_text' : 'click_call');
  track(ev, { location: a.dataset.trackLoc || 'page' });
});

// Open / closed indicator (America/Chicago)
function houstonHour(tz: string) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
}
const fmt = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
function updateOpen() {
  document.querySelectorAll<HTMLElement>('[data-open-status]').forEach((el) => {
    const open = Number(el.dataset.open);
    const close = Number(el.dataset.close);
    const h = houstonHour(el.dataset.tz || 'America/Chicago');
    const isOpen = h >= open && h < close;
    el.classList.toggle('is-open', isOpen);
    const text = el.querySelector('[data-open-text]');
    if (text) text.textContent = isOpen ? `Open now · until ${fmt(close)}` : `Closed · opens ${fmt(open)}`;
  });
}
updateOpen();
setInterval(updateOpen, 60_000);

// Footer year (stays right even if the site isn't rebuilt in January)
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));

// Mobile sticky bar: hide while a quote form is on screen or the keyboard is up
const bar = document.querySelector<HTMLElement>('[data-action-bar]');
if (bar) {
  let formVisible = false;
  let typing = false;
  const sync = () => bar.classList.toggle('is-hidden', formVisible || typing);
  const form = document.querySelector('[data-quote-card]');
  if (form && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      formVisible = entry.isIntersecting;
      sync();
    }, { rootMargin: '0px 0px -80px 0px' }).observe(form);
  }
  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select')) {
      typing = true;
      sync();
    }
  });
  document.addEventListener('focusout', () => {
    typing = false;
    setTimeout(sync, 50);
  });
}

// Reveal on scroll (once)
const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-in'));
}
