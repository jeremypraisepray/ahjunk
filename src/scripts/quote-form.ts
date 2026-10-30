/** Quote form enhancement: steps, validation, ZIP check, photos, persistence, submit. */
import { validateStep, checkZip, formatPhoneInput, MAX_PHOTOS, type QuoteFields, type FieldErrors } from '../lib/quote';
import { track } from './analytics';

const STORE_KEY = 'ah-quote-v1';
const ATTR_KEY = 'ah-attribution-v1';
const OPEN = 7;
const CLOSE = 19;

const store = {
  get<T>(k: string): T | null {
    try {
      return JSON.parse(sessionStorage.getItem(k) || 'null');
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      sessionStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode / blocked */
    }
  },
  del(k: string) {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

function houstonOpenNow() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h >= OPEN && h < CLOSE;
}

/** Resize to ≤1600px JPEG ~0.8 so uploads stay small (Vercel body limit 4.5 MB). */
async function resizeImage(file: File, max = 1600, quality = 0.8): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', quality));
  } catch {
    return file; // e.g. HEIC on a browser that can't decode it — send as-is
  }
}

function init(card: HTMLElement) {
  const form = card.querySelector<HTMLFormElement>('[data-quote-form]')!;
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('[data-step]')];
  const live = card.querySelector<HTMLElement>('[data-live]')!;
  const stepNum = card.querySelector<HTMLElement>('[data-step-num]');
  const dots = [...card.querySelectorAll<HTMLElement>('[data-dot]')];
  const zipInput = form.querySelector<HTMLInputElement>('input[name=zip]')!;
  const zipMsg = card.querySelector<HTMLElement>('[data-zip-msg]')!;
  const phoneInput = form.querySelector<HTMLInputElement>('input[name=phone]')!;
  const photoInput = form.querySelector<HTMLInputElement>('[data-photos]')!;
  const photoList = card.querySelector<HTMLUListElement>('[data-photo-list]')!;
  const truck = card.querySelector<SVGElement>('[data-truck-fill]');
  const formError = card.querySelector<HTMLElement>('[data-form-error]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const body = card.querySelector<HTMLElement>('[data-quote-body]')!;
  const success = card.querySelector<HTMLElement>('[data-quote-success]')!;

  form.noValidate = true;
  let current = 1;
  let photos: { blob: Blob; url: string; name: string }[] = [];
  const startedAt = Date.now();
  form.querySelector<HTMLInputElement>('[data-t]')!.value = String(startedAt);

  // ── Attribution (first touch this session) ──
  const params = new URLSearchParams(location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'] as const;
  const fromUrl = Object.fromEntries(keys.map((k) => [k, params.get(k) || ''])) as Record<string, string>;
  const attr = keys.some((k) => fromUrl[k]) ? fromUrl : store.get<Record<string, string>>(ATTR_KEY) || fromUrl;
  store.set(ATTR_KEY, attr);
  for (const k of keys) {
    const el = form.elements.namedItem(k) as HTMLInputElement | null;
    if (el) el.value = attr[k] || '';
  }

  // ── Read / write fields ──
  const read = (): QuoteFields => {
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) ?? '');
    return {
      items: fd.getAll('items').map(String),
      zip: s('zip'),
      size: s('size'),
      when: s('when'),
      firstName: s('firstName'),
      phone: s('phone'),
      email: s('email'),
      address: s('address'),
      notes: s('notes'),
      contact: s('contact') || 'text',
    };
  };

  const restore = () => {
    const saved = store.get<Partial<QuoteFields>>(STORE_KEY);
    if (!saved) return;
    form.querySelectorAll<HTMLInputElement>('input[name=items]').forEach((el) => {
      if (saved.items?.includes(el.value)) el.checked = true;
    });
    for (const k of ['size', 'when', 'contact'] as const) {
      const v = saved[k];
      if (v) {
        const el = form.querySelector<HTMLInputElement>(`input[name=${k}][value="${CSS.escape(v)}"]`);
        if (el) el.checked = true;
      }
    }
    for (const k of ['zip', 'firstName', 'phone', 'email', 'address', 'notes'] as const) {
      const el = form.elements.namedItem(k) as HTMLInputElement | null;
      if (el && saved[k]) el.value = saved[k]!;
    }
  };
  const persist = () => store.set(STORE_KEY, read());

  // ── Errors ──
  const showErrors = (errs: FieldErrors, scope: HTMLElement) => {
    scope.querySelectorAll<HTMLElement>('[data-error-for]').forEach((p) => {
      const key = p.dataset.errorFor as keyof QuoteFields;
      p.textContent = errs[key] || '';
      const input = form.querySelector<HTMLElement>(`[name=${key}]:not([type=radio]):not([type=checkbox])`);
      if (input) input.setAttribute('aria-invalid', errs[key] ? 'true' : 'false');
    });
  };
  const focusFirstError = (errs: FieldErrors, scope: HTMLElement) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const el = scope.querySelector<HTMLElement>(`[name=${first}]`);
    el?.focus({ preventScroll: false });
    live.textContent = Object.values(errs).join(' ');
  };

  // ── Steps ──
  const go = (n: number, focus = true) => {
    current = n;
    steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === n));
    dots.forEach((d) => {
      const i = Number(d.dataset.dot);
      d.classList.toggle('is-active', i === n);
      d.classList.toggle('is-done', i < n);
    });
    if (stepNum) stepNum.textContent = String(n);
    const legend = steps[n - 1].querySelector('legend')?.textContent?.replace(/^\d/, '') || '';
    live.textContent = `Step ${n} of 3: ${legend}`;
    if (focus) {
      const rect = card.getBoundingClientRect();
      if (rect.top < 0) card.scrollIntoView({ block: 'start' });
      steps[n - 1].querySelector<HTMLElement>('input:not([type=hidden]), button')?.focus({ preventScroll: true });
    }
  };

  form.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-next]')) {
      const errs = validateStep(current as 1 | 2, read());
      showErrors(errs, steps[current - 1]);
      if (Object.keys(errs).length) return focusFirstError(errs, steps[current - 1]);
      track(current === 1 ? 'quote_step_1' : 'quote_step_2', current === 1 ? { items: read().items.join(','), zip_in_area: checkZip(read().zip).status === 'served' } : { size: read().size, when: read().when });
      go(current + 1);
    } else if (t.closest('[data-back]')) {
      go(current - 1);
    }
  });

  // ── ZIP feedback ──
  const renderZip = () => {
    const r = checkZip(zipInput.value);
    zipMsg.classList.toggle('is-ok', r.status === 'served');
    zipMsg.textContent =
      r.status === 'served' ? `✓ We serve ${r.zip} — ${r.area}` : r.status === 'unknown' ? 'We may still serve you — we’ll confirm.' : '';
  };
  zipInput.addEventListener('input', () => {
    zipInput.value = zipInput.value.replace(/\D/g, '').slice(0, 5);
    renderZip();
    if (zipInput.value.length === 5) {
      showErrors({}, zipInput.closest('.field')!);
      track('zip_check', { status: checkZip(zipInput.value).status });
    }
  });

  // ── Phone mask ──
  phoneInput.addEventListener('input', () => {
    const atEnd = phoneInput.selectionStart === phoneInput.value.length;
    const v = formatPhoneInput(phoneInput.value);
    if (atEnd) phoneInput.value = v;
  });
  phoneInput.addEventListener('blur', () => (phoneInput.value = formatPhoneInput(phoneInput.value)));

  // ── Truck fill follows load size ──
  const syncTruck = () => {
    const sel = form.querySelector<HTMLInputElement>('input[name=size]:checked');
    truck?.style.setProperty('--fill', sel?.dataset.fill || '0');
  };

  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'size') syncTruck();
    if (t.name !== 'photos') persist();
    // clear a group's error once it's satisfied
    if (['items', 'size', 'when'].includes(t.name)) {
      const p = card.querySelector<HTMLElement>(`[data-error-for=${t.name}]`);
      if (p && p.textContent) {
        const errs = validateStep(current as 1 | 2 | 3, read());
        p.textContent = errs[t.name as keyof QuoteFields] || '';
      }
    }
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type === 'text' || t.type === 'tel' || t.type === 'email' || t.tagName === 'TEXTAREA') persist();
  });

  // ── Photos ──
  const renderPhotos = () => {
    photoList.innerHTML = '';
    photos.forEach((p, i) => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = p.url;
      img.alt = `Photo ${i + 1}`;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '×';
      rm.setAttribute('aria-label', `Remove photo ${i + 1}`);
      rm.addEventListener('click', () => {
        URL.revokeObjectURL(p.url);
        photos.splice(i, 1);
        renderPhotos();
        photoInput.focus();
      });
      li.append(img, rm);
      photoList.append(li);
    });
  };
  photoInput.addEventListener('change', async () => {
    const files = [...(photoInput.files || [])].filter((f) => f.type.startsWith('image/'));
    photoInput.value = '';
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) live.textContent = `Only ${MAX_PHOTOS} photos allowed — added the first ${room}.`;
    for (const f of files.slice(0, Math.max(0, room))) {
      const blob = await resizeImage(f);
      photos.push({ blob, url: URL.createObjectURL(blob), name: f.name.replace(/\.\w+$/, '') + '.jpg' });
    }
    renderPhotos();
    if (files.length) live.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} added.`;
  });

  // ── Submit ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    const data = read();
    for (const s of [1, 2, 3] as const) {
      const errs = validateStep(s, data);
      if (Object.keys(errs).length) {
        if (s !== current) go(s, false);
        showErrors(errs, steps[s - 1]);
        return focusFirstError(errs, steps[s - 1]);
      }
    }

    const fd = new FormData(form);
    fd.delete('photos');
    photos.forEach((p) => fd.append('photos', p.blob, p.name));

    submitBtn.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      const json = await res.json().catch(() => ({}));
      if (res.status === 422 && json.errors) {
        const step = (['items', 'zip'].some((k) => k in json.errors) ? 1 : ['size', 'when'].some((k) => k in json.errors) ? 2 : 3) as 1 | 2 | 3;
        go(step, false);
        showErrors(json.errors, steps[step - 1]);
        return focusFirstError(json.errors, steps[step - 1]);
      }
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);

      track('quote_submit', { items: data.items.join(','), size: data.size, when: data.when, photos: photos.length });
      store.del(STORE_KEY);
      showSuccess(data.firstName);
    } catch (err) {
      formError.innerHTML = '';
      formError.append(
        'Something went wrong sending your request. Please try again, or call ',
        Object.assign(document.createElement('a'), { href: 'tel:+13465998378', textContent: '(346) 599-8378' }),
        '.',
      );
    } finally {
      submitBtn.removeAttribute('aria-busy');
      submitLabel.textContent = 'Get My Free Quote';
    }
  });

  function showSuccess(name: string) {
    const clean = name.trim().split(/\s+/)[0];
    success.querySelector('[data-success-name]')!.textContent = clean ? `, ${clean}` : '';
    if (!houstonOpenNow()) {
      success.querySelector('[data-success-msg]')!.textContent = 'We’re off the clock right now — we’ll reach out first thing at 7 AM.';
    }
    body.hidden = true;
    success.hidden = false;
    success.focus();
    card.scrollIntoView({ block: 'nearest' });
  }

  // ── External "quote this" links (service cards, header CTA, sticky bar) ──
  const openWith = (item?: string) => {
    if (item) {
      const el = form.querySelector<HTMLInputElement>(`input[name=items][value="${CSS.escape(item)}"]`);
      if (el && !el.checked) {
        el.checked = true;
        persist();
      }
      if (current !== 1) go(1, false);
    }
    if (!success.hidden) return success.focus();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    const target = item
      ? zipInput.value.length === 5
        ? steps[0].querySelector<HTMLElement>('[data-next]')
        : zipInput
      : steps[current - 1].querySelector<HTMLElement>('input:not([type=hidden])');
    setTimeout(() => target?.focus({ preventScroll: true }), reduce ? 0 : 450);
  };
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('[data-quote-open], [data-quote-item]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#') && !href.includes(location.pathname + '#') && !href.startsWith('?')) {
      // link to another page's form — let it navigate unless it's this page
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname) return;
    }
    e.preventDefault();
    (a.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
    openWith(a.dataset.quoteItem);
  });

  restore();
  const pre = params.get('item');
  if (pre) openWith(pre);
  renderZip();
  syncTruck();
}

document.querySelectorAll<HTMLElement>('[data-quote-card]').forEach(init);
