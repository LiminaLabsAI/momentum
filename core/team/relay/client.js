'use strict';

/**
 * Relay client (Phase 30c Team-Fly, ADR-0014).
 *
 * GRACEFUL ABSENCE is the whole point: with no relayUrl (or an unreachable one),
 * publish/poll are no-ops that report `skipped` — the caller simply falls back to
 * git-native `team sync`. Nothing depends on the relay; it carries no authority.
 *
 * Zero dependencies — node http only.
 */

const http = require('http');

function request(method, url, body) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch { return resolve({ ok: false, skipped: true, reason: 'no relay' }); }
    const data = body != null ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
        headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
      },
      (res) => {
        let out = '';
        res.on('data', (c) => { out += c; });
        res.on('end', () => { try { resolve(JSON.parse(out || '{}')); } catch { resolve({ ok: false }); } });
      }
    );
    req.on('error', () => resolve({ ok: false, skipped: true, reason: 'unreachable' }));
    req.setTimeout(1500, () => { req.destroy(); resolve({ ok: false, skipped: true, reason: 'timeout' }); });
    if (data) req.write(data);
    req.end();
  });
}

/** Publish a coordination event. No-op (skipped) when relayUrl is absent. */
async function publish(relayUrl, event) {
  if (!relayUrl) return { ok: false, skipped: true, reason: 'no relay' };
  return request('POST', relayUrl.replace(/\/$/, '') + '/publish', event);
}

/** Poll events since `since`. Returns { events } (possibly empty), never throws. */
async function poll(relayUrl, since) {
  if (!relayUrl) return { ok: false, skipped: true, events: [] };
  const r = await request('GET', relayUrl.replace(/\/$/, '') + `/events?since=${since || 0}`);
  return Array.isArray(r.events) ? r : { ok: false, skipped: true, events: [] };
}

module.exports = { publish, poll };
