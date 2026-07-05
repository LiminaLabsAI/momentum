---
type: Evidence
---

# Antigravity 2.x Fact Sheet — locked by live probes

> **Pinned to**: `agy` CLI **1.0.16** (`agy-version.txt`) · IDE 2.1.1 installed ·
> SDK `google-antigravity` 0.1.5 · probed **2026-07-05** on macOS (darwin arm64)
> **Method**: live headless CLI runs against a fresh `momentum init --agent antigravity`
> fixture + the CLI's own on-disk reference docs (`vendor-docs/`, copied verbatim from
> the builtin `agy-customizations` skill shipped inside `~/.gemini/antigravity-cli/builtin/`,
> checksum in `vendor-docs/builtin.checksum`). Every claim cites its transcript.
> LLM-answered listings are marked *(model-reported)*; all other claims are deterministic.

## 1. Customization roots & discovery (probe-01b + vendor SKILL.md)

- Project roots accepted: **`.agents/`, `.agent/`, `_agents/`, `_agent/`** — all four
  spellings, discovered by walking CWD up to the repo root (vendor-docs/SKILL.md
  "Discovery Locations"). Momentum's current split (`.agent/workflows/` +
  `.agents/skills/`) therefore *works by accident*, not by design.
- Empirical confirmation: marker skills planted in BOTH `.agent/skills/` and
  `.agents/skills/`, and marker workflows in BOTH `.agent/workflows/` and
  `.agents/workflows/`, were ALL discovered (`probe-01b-discovery.stdout.txt`,
  *(model-reported)* — corroborated for skills/workflows by slash registration below).
- Global root: **`~/.gemini/config/`** (vendor doc; NOT `~/.gemini/antigravity-cli/skills/`
  as some third-party articles claim). Builtin root: `~/.gemini/antigravity-cli/builtin/`.
- Priority: workspace > declared (`skills.json`/`plugins.json`) > global > builtin >
  global-declared. Name conflicts: higher priority wins.

## 2. Rules / primary instructions (probe-01b + vendor rules.md)

- **`AGENTS.md` (and `GEMINI.md`) auto-load hierarchically** — walk-up from CWD to repo
  root, no frontmatter, always active. The fixture's momentum AGENTS.md was demonstrably
  in context: the model quoted `.momentum/brainstorm-active` / `.momentum/merge-approved`
  (strings that exist only there), and in probe-03 it *followed Rule 1* — reading
  `specs/status.md` before acting (`probe-03` PreToolUse capture #1: `view_file` on
  `specs/status.md`).
- `.agents/rules/*.md` also exists as a rules surface (SKILL.md overview; `trigger:
  always_on` vs `model_decision`) — optional, momentum doesn't need it post-Phase-23.

## 3. Workflows → slash commands (probe-01b)

- Workflow `.md` files in `<root>/workflows/` register as **real slash commands**:
  the model listed `/scout`, `/swarm`, `/review-code`, `/continue`, `/dispatch`,
  `/handoff`, plus BOTH planted markers `/probe-singular-wf` and `/probe-plural-wf`
  *(model-reported)*. Builtin commands (`/goal`, `/schedule`, `/grill-me`, `/learn`,
  `/teamwork-preview`) coexist.
- Note: workflows are absent from the builtin customization guide (rules/skills/
  plugins/hooks/MCP only) — they are an IDE-heritage surface the CLI honors.

## 4. Skills (probe-01b + vendor skills.md + builtin layout)

- Format: **`skills/<name>/SKILL.md`** directories with required `name` +
  `description` frontmatter; optional `scripts/`, `examples/`, `resources/`,
  `references/` subdirs. Momentum's shipped shape is **already correct**.
- Progressive disclosure: only name+description injected; body loads on activation.
  Semantic activation via description (all 5 momentum skills + both markers listed
  in probe-01b).
- Builtin skills on disk confirm the layout (`builtin/skills/<name>/SKILL.md`).

## 5. Hooks — the complete contract (probe-03/04/05 + vendor hooks.md)

- **File**: `hooks.json` at a customization root (e.g. `.agents/hooks.json`).
- **Schema**: top-level keys are *hook names* (groups); each maps to event configs.
  Optional `"enabled": false` per group.
- **Events — exactly five**: `PreToolUse`, `PostToolUse` (grouped: `{matcher, hooks:[…]}`),
  `PreInvocation`, `PostInvocation`, `Stop` (FLAT list of handler objects — no matcher).
  **`SessionStart` DOES NOT EXIST** in this surface.
- **Session-start equivalent**: `PreInvocation` fires before every model call with
  `invocationNum` (0-based; observed 0,1,2,3 in probe-03) and supports
  `{"injectSteps":[{"ephemeralMessage": "…"}]}` output — native context injection,
  strictly better than a stdout-convention SessionStart. `invocationNum == 0` is
  session start.
- **Handler**: `{type:"command"(default), command, timeout(30s default)}`; commands run
  via `sh -c` **with CWD = the directory containing hooks.json** (so momentum's shipped
  `bash scripts/…` resolves to `.agents/scripts/…` → broken); `~` expands.
- **Payloads (stdin, camelCase protojson)** — captured verbatim in `hook-captures/`:
  common fields `conversationId`, `workspacePaths[]`, `transcriptPath`,
  `artifactDirectoryPath`, `modelName`; PreToolUse adds `stepIdx` +
  `toolCall{name, args}`; PostToolUse adds `error` + `toolCall` (MAY BE `null` on
  non-tool steps — observed); PreInvocation adds `invocationNum`, `initialNumSteps`;
  Stop adds `executionNum`, `terminationReason` (observed `NO_TOOL_CALL`), `fullyIdle`.
- **Responses (stdout JSON, exit 0)**: PreToolUse `{"decision": "allow"|"deny"|"ask"|
  "force_ask", "reason", "permissionOverrides"}`; PostToolUse `{}`; PreInvocation
  `{injectSteps}`; PostInvocation `{injectSteps, terminationBehavior}`; Stop
  `{"decision":"continue", reason}` blocks stopping. (Third-party `allow_tool`
  claims are stale/wrong.)
- **Observed tool names** (probe-03 + transcript sweep): `run_command`
  (`args.CommandLine`, `args.Cwd`), `write_to_file` (`args.TargetFile`,
  `args.CodeContent`, `args.Overwrite`), `view_file` (`args.AbsolutePath`),
  `list_dir`, `list_permissions`. Tool names = lowercased `CORTEX_STEP_TYPE_*`.
  `apply_patch` (Codex's tool) never appears. Edit-tool family beyond
  `write_to_file` not yet observed — gate scripts must match broadly AND inspect
  `args` paths, not rely on one tool name.
- Momentum's shipped hooks.json shape (single top-level `"hooks"` wrapper +
  `SessionStart` key): UNVERIFIED — see §10.

## 6. Plugins (vendor plugins.md + `agy plugin` CLI)

- **`<root>/plugins/<name>/`** with required `plugin.json` (`{"name"}` optional field);
  bundles `skills/`, `rules/*.md`, `hooks.json`, `mcp_config.json` — auto-ingested,
  namespaced. `agy plugin list|import|install|uninstall|enable|disable|validate|link`;
  `import` migrates **from gemini or claude** (!). Empty dir fails validate with
  "missing plugin.json" (deterministic, `probe-plugin` run).
- This is the native distribution vehicle for the full momentum bundle (G3).

## 7. CLI operational surface (agy --help, live runs)

- Headless: `agy -p "…"` (print mode), `--print-timeout` (default 5m), `--model`,
  `--sandbox`, `--dangerously-skip-permissions`, `--add-dir`, `--continue`,
  `--conversation <id>`, `--new-project`, `--project`. Subcommands: `changelog`,
  `install`, `models`, `plugin`, `update`. **No `--cwd`, no `--skill` flags**
  (Phase 18's spawn contract is confirmed fictional). **No `inspect` subcommand.**
- **Conversation persistence**: without `--new-project`, print-mode runs can resume
  prior workspace conversation state — probe-01a was contaminated by an unrelated
  session's context. **Headless invocations (incl. spawn()) MUST isolate** via
  `--new-project` (or explicit `--project`/`--conversation`).
- Auth: keyring token shared with the IDE sign-in; also `ANTIGRAVITY_API_KEY`.
  Default model observed: `gemini-3.5-flash-low`. Latency: 1.5–2.5 min per print run
  in a momentum fixture.
- Session state: `~/.gemini/antigravity-cli/` (`brain/<conversationId>/` holds
  transcripts + artifacts; `log/cli-*.log` diagnostic logs).
- Subagents: `/agent` exists in TUI per third-party docs, but **no documented
  project-level subagent-definition surface** in the builtin customization guide and
  none observed via CLI print mode. G3 re-scopes to skills + child `agy -p` sessions.

## 8. VAL-002 — the six questions, answered

| # | Question (Phase 18) | Answer (2026-07-05, agy 1.0.16) | Evidence |
|---|---|---|---|
| a | `.agent/workflows/` vs `.agents/workflows/` | **Both work** (4 root spellings); canonical per vendor examples is `.agents/` | probe-01b; vendor SKILL.md |
| b | Workflows auto-register as `/<name>` | **Yes** — live listing incl. planted markers | probe-01b |
| c | `.agents/skills/<name>/SKILL.md` discovered | **Yes** — all 5 momentum skills + markers listed; format confirmed by builtin layout | probe-01b; builtin/skills |
| d | PreToolUse fires on shipped matchers | **Event fires** (vendor schema); shipped config broken by relative `scripts/` path + response contract; matchers partially stale (`apply_patch` dead) | probe-03/04/05; hooks.md |
| e | PostToolUse fires | **Yes** — incl. `toolCall: null` non-tool steps | probe-03 captures |
| f | SessionStart surfaced | **No such event.** Five events only; `PreInvocation` (invocationNum 0) + `injectSteps` is the vendor-native equivalent — *better* than the old design | probe-03 captures; vendor hooks.md |

**VAL-002 disposition**: closable as **resolved** — every question now has vendor-runtime
evidence. Capability mapping: `sessionStartHook` as modeled (a literal SessionStart
event) is permanently `false` on Antigravity; the *capability momentum actually needs*
(handoff banner at session start) is deliverable via PreInvocation injection (G1).

## 9. Transient-hang investigation (operational finding)

Between ~16:00 and ~16:25, EVERY `agy -p` run in the fixture with ANY
`hooks.json` present hung indefinitely — including past its own
`--print-timeout` — with a completely empty `--log-file` (healthy runs log
within seconds; compare probe-03.log's `hooks_manager.go`/`jsonhook.go` lines).
Bisect at ~16:30 (`B/A/C` in `probes/README.md`): all three combinations passed,
including the exact previously-hanging one. Conclusion: **transient environmental
hang, not config** — correlates with rapid `quotaRefreshLoop (force=true)`
cycling after 8+ probe sessions in ~40 min (throttling/backoff suspected;
`agy models` and hook-less runs kept working throughout).

**Operational consequences (bind G2):**
1. `--print-timeout` is NOT a reliable upper bound — headless callers
   (`spawn()`, probes, CI) MUST wrap `agy` in a hard external watchdog/kill.
2. Headless bursts can trip throttling; spawn fan-out needs pacing/backoff.
3. A hung `agy` writes nothing to its `--log-file` — absence of log output is
   the hang signature to detect.

## 10. Probe-04/05 final status — honest caveats

The intermittent hang (§9) returned mid-battery: run C (vendor-named config,
fixture) PASSED at ~16:31, then probe-04final (momentum shipped shape) and
probe-05 (deny + relative, vendor-named) both HUNG minutes later. Aggregate:
hook-ful runs 4 pass / 6 hang; hook-less runs 3/3 pass; `agy models` always
fine. The hang therefore tracks *hooks.json presence + an intermittent
environmental condition*, NOT config shape. Working hypothesis: hook-runner
subprocess stdin handling deadlocks intermittently (handler `timeout` not
enforced when it does); to be reported upstream.

Consequences for claims:
- **Momentum's shipped hooks.json shape: UNVERIFIED** — never observed firing
  (2 hangs, 0 passes), but hang ≠ proof of shape-rejection given §9. MOOT for
  implementation: G1 rewrites to the documented vendor-named schema regardless.
- **PreToolUse deny semantics + relative-command CWD: doc-sourced only**
  (vendor-docs/hooks.md) — live confirmation deferred; re-probe tracked as a
  phase task before capability flips that depend on them.
- **Hang itself is a first-class finding**: headless `agy` with hooks present
  can hang indefinitely, IGNORING `--print-timeout`, writing zero log lines.
  Every headless integration (spawn(), CI probes) MUST use an external
  watchdog + pacing. Filed to backlog in G4.

## 11. Cross-surface coverage — CLI vs IDE vs Agent Manager (added post-G5)

Antigravity ships one customization system over one shared agent engine
across THREE user surfaces — `agy` CLI, the IDE (VS Code fork, 2.1.1
installed here), and the Antigravity 2.0 Agent Manager. Vendor evidence for
the sharing: the builtin hooks doc's common-fields note enumerates per-product
artifact directories (CLI `antigravity-cli/`, 2.0 `antigravity/`, IDE
`antigravity-ide/`) for the SAME payload contract (vendor-docs/docs/hooks.md);
the CLI repo describes a "Shared Core Agent Engine"; the discovery/skills/
plugins guides are surface-agnostic.

| Claim | CLI (agy 1.0.16) | IDE 2.1.1 / Agent Manager |
|---|---|---|
| AGENTS.md hierarchical auto-load | LIVE-verified | vendor-doc shared (rules.md names both) |
| Skills `<name>/SKILL.md` discovery | LIVE-verified | vendor-doc shared (tutorial covers IDE) |
| Workflows → slash commands | LIVE-verified | IDE-heritage feature (originated there) — doc-shared |
| hooks.json five-event contract | LIVE fire-verified | vendor-doc shared (per-product artifact dirs) |
| PreInvocation banner injection | event LIVE-verified; injection doc-sourced | doc-shared |
| spawn()/plugins | LIVE-verified | CLI-only surfaces by design |

Residual: a ~10-minute operator observation pass inside the IDE + Agent
Manager (filed as **VAL-003** with the checklist). No file layout changes are
expected from it — the layout is the shared engine's; only observation is
missing. The 2026-07-03 Agent Manager session state (~/.gemini/antigravity/
brain/) was checked for free evidence: its logs only capture momentum's test
suite output, not config loading — inconclusive, hence VAL-003.
