#!/usr/bin/env bash
#
# Live end-to-end demo of momentum Team Mode (Phase 30 — Walk + Run + Fly).
#
# Simulates TWO developers (alice, bob) on TWO clones sharing ONE bare remote,
# driving the REAL `momentum team` / `momentum claim` CLI. Everything is local
# (a throwaway temp dir + a bare git remote on disk) and self-cleans — no network,
# no server. Run it and watch the whole coordination plane work across clones.
#
#   bash scripts/demo-team.sh
#
set -u

MOM="node $(cd "$(dirname "$0")/.." && pwd)/bin/momentum.js"
TMP="$(mktemp -d 2>/dev/null || mktemp -d -t momdemo)"
trap 'rm -rf "$TMP"' EXIT

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
note() { printf '   \033[2m%s\033[0m\n' "$*"; }
run()  { printf '   \033[2m$ %s\033[0m\n' "$1"; eval "$1" 2>&1 | sed 's/^/     /'; }

# ── setup: one bare remote, two developer clones ───────────────────────────
say "SETUP — one bare remote, two developer clones (alice, bob)"
git init --bare -q "$TMP/remote.git"
for dev in alice bob; do
  git clone -q "$TMP/remote.git" "$TMP/$dev"
  git -C "$TMP/$dev" config user.email "$dev@team.dev"
  git -C "$TMP/$dev" config user.name  "$dev"
done
printf 'team\n' > "$TMP/alice/README.md"
git -C "$TMP/alice" add -A && git -C "$TMP/alice" commit -qm init && git -C "$TMP/alice" branch -M main
git -C "$TMP/alice" push -qu origin main
git -C "$TMP/bob" pull -q origin main
A="$TMP/alice"; B="$TMP/bob"
note "two clones of one remote, like two laptops."

say "1. IDENTITY (Walk) — momentum knows WHO, from git config (no accounts)"
run "cd '$A' && $MOM team whoami"
run "cd '$B' && $MOM team whoami"

say "2. CLAIM (Walk) — both reach for the SAME phase number; exactly ONE wins"
run "cd '$A' && $MOM claim phase 30-feature-x"
note "bob reaches for the same number — the remote arbitrates (git ref-CAS):"
run "cd '$B' && $MOM claim phase 30-feature-x"
note "bob was deflected (exit 2); he picks another:"
run "cd '$B' && $MOM claim phase 30-feature-y"

say "3. FRAGMENTS (Walk) — each records their lane; the merge is CONFLICT-FREE"
run "cd '$A' && $MOM team record --branch phase-30-feature-x --phase 30x --status in-progress --progress building"
run "cd '$A' && git add -A && git commit -qm 'alice row' && git push -q origin main && echo pushed"
run "cd '$B' && $MOM team record --branch phase-30-feature-y --phase 30y --status open --progress planning"
run "cd '$B' && git add -A && git commit -qm 'bob row' && git pull --no-rebase --no-edit -q origin main && echo 'merged — zero conflicts'"
note "bob's board now shows BOTH developers' lanes, correctly attributed:"
run "cd '$B' && $MOM team board"

say "4. PRESENCE (Run) — heartbeat-on-invocation, no daemon"
run "cd '$A' && $MOM team heartbeat --branch phase-30-feature-x --activity coding"
run "cd '$A' && $MOM team presence"

say "5. SHARED LANDING TURN (Run) — one runway across clones"
run "cd '$A' && $MOM team turn take main"
note "bob tries the same turn while alice holds it:"
run "cd '$B' && $MOM team turn take main"
run "cd '$A' && $MOM team turn release main"

say "6. REVIEWER != AUTHOR (Run) — self-approval is NOT enough"
run "cd '$A' && $MOM team approve phase-30-feature-x"
note "gate check (author=alice): her own approval does not satisfy it:"
run "cd '$A' && $MOM team check phase-30-feature-x --author alice"
run "cd '$A' && $MOM team approve phase-30-feature-x --actor bob"
note "now a peer (bob) has approved — it passes:"
run "cd '$A' && $MOM team check phase-30-feature-x --author alice"

say "7. CROSS-MACHINE LEASE (Fly) — single owner; clock skew cannot double-own"
run "cd '$A' && $MOM team lease acquire deploy:prod"
run "cd '$B' && $MOM team lease acquire deploy:prod"
run "cd '$A' && $MOM team lease release deploy:prod"

say "8. PUBLISHED CONTRACT (Fly) — third parties can read team state"
run "cd '$A' && $MOM team contract"

printf '\n\033[1;32m✓ Team Mode demo complete — the whole plane worked across two clones.\033[0m\n'
printf '\033[2m  (all local: one bare remote + two clones; no server, no daemon)\033[0m\n\n'
