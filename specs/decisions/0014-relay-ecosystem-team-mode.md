---
type: ADR
---

# ADR-0014: Optional Relay + Ecosystem Team Mode

## Status

Accepted (Phase 30c — Team-Fly)

## Context

Walk (ADR-0012) + Run (ADR-0013) give a distributed team a conflict-free,
observable, trusted single-repo coordination plane — but pull-based (you see
teammates after `sync`), single-repo, and with an unpublished state format. Fly
closes the family with three optional/additive pieces, all preserving the
git-native, no-required-server identity.

## Decision

1. **Optional real-time relay** (`core/team/relay/`). A self-hostable,
   **authority-free** store-and-poll service that mirrors coordination events so
   teams get near-real-time visibility without waiting for a git sync. **Graceful
   absence**: no `relay_url` (or unreachable) → publish/poll are no-ops and the
   plane falls straight back to git-native `team sync`. The relay never gates,
   approves, or lands — removing it changes no correctness outcome (ADR-0009
   trust invariant intact). momentum ships the relay *code*; it never runs a
   hosted SaaS. It **does not depend on** the Phase-31 Platform MCP server,
   though it may later be exposed through it.

2. **Cross-machine leases via ref-CAS** (`core/team/lib/lease.js`). Swarm's
   wall-clock leases (no fencing) can double-own a repo under clock skew. Fly
   moves lease acquisition to `refs/momentum/leases/<resource>` ref-CAS — exactly
   one owner across machines, the remote arbitrating, no fencing service. This is
   the same first-push-wins primitive as claims (Walk) and queue turns (Run).

3. **Published coordination contract** (`core/team/contract/`). A versioned,
   third-party-consumable description of the fragment layout + `refs/momentum/*`
   namespace so external tools (dashboards, CI) can read team state. Breaking
   changes bump `CONTRACT_VERSION` (pinned by a test). Realizes ADR-0003 §5.

Ecosystem/multi-repo team mode (remote-URL members, synced initiatives) reuses
these same primitives; the lease-CAS is its load-bearing safety fix.

## Consequences

- **Positive.** Real-time visibility for teams that opt in, with zero required
  infra and clean degradation; swarm ownership is safe across machines; the state
  format is published and consumable.
- **Negative / accepted.** The relay is store-and-poll (near-real-time, not push);
  true push is a later refinement. Self-hosting the relay is the operator's
  responsibility (by design — no SaaS).

## Relates

Extends ADR-0012 (Walk) + ADR-0013 (Run); relates ADR-0003 (lane-state contract),
ADR-0009 (trust invariant). The Platform MCP server (Phase 31) may later host the
relay but Fly ships standalone.
