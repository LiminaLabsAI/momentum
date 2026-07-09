'use strict';

/**
 * Optional self-hostable coordination relay (Phase 30c Team-Fly, ADR-0014).
 *
 * AUTHORITY-FREE by design: it mirrors coordination EVENTS (fragment/claim
 * notifications) so teams get near-real-time visibility WITHOUT waiting for a git
 * sync. It never gates, approves, or lands — remove it and nothing about
 * correctness changes; the plane falls straight back to git-native (Walk/Run).
 * momentum ships this code; it does NOT run a hosted service — operators self-host.
 *
 * Minimal store-and-poll protocol (no external deps):
 *   POST /publish   { ...event }   → { ok, seq, protocol }
 *   GET  /events?since=N           → { protocol, events: [...] }
 *   GET  /health                   → { ok, protocol }
 *
 * Zero dependencies — node http only.
 */

const http = require('http');

const PROTOCOL_VERSION = 1;

function createRelay(opts) {
  opts = opts || {};
  const events = [];

  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/publish') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
      req.on('end', () => {
        try {
          const ev = JSON.parse(body || '{}');
          const stored = Object.assign({}, ev, { seq: events.length + 1 });
          events.push(stored);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true, seq: stored.seq, protocol: PROTOCOL_VERSION }));
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'bad json' }));
        }
      });
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/events')) {
      const since = Number(new URL(req.url, 'http://x').searchParams.get('since') || 0);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ protocol: PROTOCOL_VERSION, events: events.filter((e) => e.seq > since) }));
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, protocol: PROTOCOL_VERSION }));
      return;
    }
    res.writeHead(404); res.end();
  });

  return {
    listen(cb) { server.listen(opts.port || 0, '127.0.0.1', () => cb(server.address().port)); },
    close(cb) { server.close(cb); },
    events,
    server,
  };
}

module.exports = { createRelay, PROTOCOL_VERSION };
