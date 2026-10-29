/**
 * /api/postback: affiliate / call network server-to-server callback → PostHog.
 *
 * Template to paste into a network's postback field (swap in that network's
 * own macros; the parameter names below are what this endpoint reads):
 *
 *   https://<host>/api/postback?k=<POSTBACK_SECRET>&network=<name>&offer={offer_id}
 *     &txn={transaction_id}&payout={payout}&status={status}
 *
 * Also accepted: transaction_id / order_id / conversion_id, commission / amount,
 * conversion_type=lead|sale, currency. GET or POST (form or JSON).
 * Add &dry=1 to see the parsed event without writing it.
 *
 * Affiliate links stay byte-identical (no sub-IDs are appended), so a
 * conversion is not tied to one click: this is a payout ledger per site,
 * network and offer. Every callback is also written to Workers Logs.
 *
 * Rules carried over from EA's endpoint:
 *   - the secret is required (env.POSTBACK_SECRET, set with `wrangler secret put`);
 *     without it the endpoint refuses, so it can't be used to spam PostHog
 *   - nothing is dropped for missing fields; it is recorded with what arrived
 *   - $insert_id makes retries idempotent
 *   - reversal statuses get their own event with negative revenue, so
 *     sum(revenue) is net revenue
 */
import analytics from '../src/data/analytics.json';

const SECRET_PARAMS = ['k', 'key', 'token', 'secret'];
const REVERSAL = /revers|refund|reject|declin|chargeback|cancel|void|fraud/i;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function fingerprint(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function collectParams(request) {
  const out = {};
  for (const [k, v] of new URL(request.url).searchParams) out[k] = v;
  if (request.method === 'POST') {
    try {
      const ct = (request.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('application/json')) Object.assign(out, await request.json());
      else for (const [k, v] of new URLSearchParams(await request.text())) out[k] = v;
    } catch {}
  }
  return out;
}

export async function handlePostback(request, env, site) {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const p = await collectParams(request);
  const expected = String((env && env.POSTBACK_SECRET) || '');
  if (!expected) return json({ ok: false, error: 'POSTBACK_SECRET is not set on this Worker' }, 503);
  const given = SECRET_PARAMS.map((k) => p[k]).find(Boolean) || '';
  if (given !== expected) return json({ ok: false, error: 'unauthorized' }, 403);
  for (const k of SECRET_PARAMS) delete p[k];
  const dry = p.dry === '1' || p.dry === 'true';
  delete p.dry;

  const network = String(p.network || p.net || 'unknown').toLowerCase();
  const offer = String(p.offer || p.offer_id || p.campaign || p.campaign_id || p.program || '');
  const txn = String(p.txn || p.transaction_id || p.txn_id || p.order_id || p.conversion_id || p.lead_id || p.call_id || '');
  const status = String(p.status || p.conversion_status || 'approved').toLowerCase();
  const payout = num(p.commission) ?? num(p.payout) ?? num(p.amount) ?? 0;
  const reversed = REVERSAL.test(status);
  const revenue = reversed ? -Math.abs(payout) : payout;
  const conversionType = String(p.conversion_type || (payout > 0 ? 'sale' : 'lead')).toLowerCase();

  const event = {
    api_key: analytics.posthogKey,
    event: 'affiliate_conversion',
    distinct_id: `postback:${site}:${network}`,
    timestamp: new Date().toISOString(),
    properties: {
      site,
      network,
      offer,
      transaction_id: txn,
      status,
      payout,
      revenue,
      currency: String(p.currency || 'USD').toUpperCase(),
      conversion_type: conversionType,
      raw: p,
      $insert_id: [site, network, txn || fingerprint(JSON.stringify(p)), reversed ? status : ''].join(':'),
      $process_person_profile: false,
    },
  };

  if (dry) return json({ ok: true, dry: true, event: { ...event, api_key: undefined } });

  console.log(JSON.stringify({ event: 'postback', site, network, offer, txn, status, payout }));
  if (!analytics.posthogKey) return json({ ok: false, error: 'PostHog key is not set (src/data/analytics.json)' }, 503);

  const res = await fetch(analytics.posthogHost.replace(/\/$/, '') + '/i/v0/e/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  // Non-200 makes the network retry; $insert_id keeps retries from double counting.
  return json({ ok: res.ok, posthog_status: res.status }, res.ok ? 200 : 502);
}
