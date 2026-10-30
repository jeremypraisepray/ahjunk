/** Fires to GA4/Google Ads (gtag), dataLayer (GTM) and Plausible — whichever exist. */
type Cfg = { ga4: string; gads: string; leadLabel: string; callLabel: string };
declare global {
  interface Window {
    AH_ANALYTICS?: Cfg;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
  }
}

export type AhEvent = 'quote_step_1' | 'quote_step_2' | 'quote_submit' | 'click_call' | 'click_text' | 'zip_check';

export function track(event: AhEvent, params: Record<string, string | number | boolean> = {}) {
  try {
    const cfg = window.AH_ANALYTICS;
    window.gtag?.('event', event, params);
    if (cfg?.gads) {
      const label = event === 'quote_submit' ? cfg.leadLabel : event === 'click_call' || event === 'click_text' ? cfg.callLabel : '';
      if (label) window.gtag?.('event', 'conversion', { send_to: `${cfg.gads}/${label}` });
    }
    window.plausible?.(event, { props: params });
    if (import.meta.env.DEV) console.debug('[track]', event, params);
  } catch {
    /* analytics must never break the page */
  }
}
