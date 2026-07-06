---
type: Ad-hoc Record
---

# Ad-hoc Work Record: 2026-07-06-repo-transfer-liminalabs

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: chore/repo-transfer-liminalabs
> **Backlog**: none
> **Status**: shipped

## Current Behavior

The project is moving from personal namespaces to the Limina Labs org:

1. GitHub repo transferred `avinash-singh-io/momentum` → `LiminaLabsAI/momentum`
   on 2026-07-06 (GitHub 301-redirects all old URLs). In-repo references still
   pointed at the old URL.
2. npm package published as `@avinash-singh-io/momentum`; the operator created
   npm org `limina-labs` and directed the package move as well. npm has no
   scope transfer — the move is publish-under-new-name + deprecate-old.

## Expected Behavior

- All functional GitHub references point at `github.com/LiminaLabsAI/momentum`.
- Package renamed `@limina-labs/momentum`, version bumped to **0.30.2**,
  published to npm; all install commands / badges / registry URLs updated
  (README, site docs, bin/momentum.js, bin/ecosystem.js, CLAUDE.md checklist).
- Old package `@avinash-singh-io/momentum` deprecated with a pointer message
  (all versions) — existing installs keep working but warn.
- Adapter install fingerprints re-baselined for the one drifted installed file
  (`README.md` from `core/specs-templates/`).

**Rule 14 note**: renaming the npm package changes a public contract — phase
territory by the letter. Shipped as a quick-task on explicit operator
direction ("GitHub and npm both should be transferred right now"); scope is
bounded (name strings + fixtures, no behavior change).

## Unchanged Behavior

- CLI command name stays `momentum`; no code paths change beyond name strings.
- Author attribution / LICENSE unchanged.
- Historical records keep old URLs/names (redirects + deprecation cover them):
  changelogs, phase histories/retrospectives, evidence captures, backlog
  entries, prior ad-hoc records.
- Site deploy target unchanged: `trymomentum/trymomentum.github.io` via
  `PAGES_DEPLOY_TOKEN` (secret survived the GitHub transfer — verified via
  `gh secret list`). Workflow mechanics untouched; comment-only edits.
- `homepage` stays `https://trymomentum.github.io`.

## Verification Evidence

All fresh from this session (2026-07-06):

**GitHub transfer** (`gh api repos/avinash-singh-io/momentum/transfer -f new_owner=LiminaLabsAI`):

```
$ gh api repos/LiminaLabsAI/momentum --jq '{full_name, owner: .owner.login, id}'
{"full_name":"LiminaLabsAI/momentum","id":1216672514,"owner":"LiminaLabsAI"}
$ curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://api.github.com/repos/avinash-singh-io/momentum
301 -> https://api.github.com/repositories/1216672514
$ gh secret list -R LiminaLabsAI/momentum
PAGES_DEPLOY_TOKEN  2026-06-07T18:24:40Z
$ gh release list -R LiminaLabsAI/momentum --limit 1
v0.30.1 — Issue sweep: …  Latest  v0.30.1
```

**Full suite** (`npm test`, after fixture re-baseline + test-regex updates):

```
ℹ pass 828
ℹ fail 0
ℹ cancelled 0
duration_ms 54598
```

**Pack + CLI smoke**:

```
$ npm pack --dry-run
npm notice name: @limina-labs/momentum
npm notice version: 0.30.2
npm notice total files: 182
$ node bin/momentum.js --version
0.30.2
```

**Reference sweep**: `grep -rn "github.com/avinash-singh-io"` and
`grep -rn "@avinash-singh-io/momentum"` over functional dirs (README,
package.json, bin/, core/, docs/, site/, .github/, tests/) → 0 hits;
remaining hits are frozen historical specs only. Fingerprint re-baselines
(claude-code / codex / antigravity via `scripts/capture-fingerprints.js
--write --note …`; opencode via `MOMENTUM_RESNAPSHOT_OPENCODE=1`) each
showed exactly one drifted file: installed `README.md`.

Post-merge steps (approval-gated, pending): tag `v0.30.2`, `npm publish
--access public` under the new scope, `gh release create`, `npm deprecate`
old package.
