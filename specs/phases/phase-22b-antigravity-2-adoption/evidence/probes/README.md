---
type: Evidence
---

# G0 Probe Battery — agy 1.0.16, 2026-07-05

Reproducible probes against a fresh `momentum init --agent antigravity` fixture.
All headless runs use `--new-project` (probe-01a showed print-mode resumes prior
workspace conversation state without it — see fact-sheet §7).

| Probe | Instrument | Question | Artifacts |
|---|---|---|---|
| 01a | `agy -p` sentinel quote (NO --new-project) | AGENTS.md load — CONTAMINATED, kept as the isolation lesson | probe-01a.log, probe-01a-sentinel.stdout.txt |
| 01b | `agy --new-project -p` 3-part listing | AGENTS.md load; skills discovery (both roots); workflow slash registration (both roots) | probe-01b.log, probe-01b-discovery.stdout.txt |
| 02 | marker files | Path matrix: markers planted in `.agent/` AND `.agents/` variants (skills + workflows) | fixture tree; results in 01b |
| 03 | vendor-schema hooks.json, per-event capture scripts, matcher `*` | Which events fire; payload shapes; real tool names | probe-03.log, probe-03-hooks.stdout.txt, hook-captures/ |
| 04 | momentum's SHIPPED hooks.json shape (top-level "hooks" wrapper + SessionStart key) with capture commands | Does the shipped shape parse/fire at all? | probe-04.log, probe-04-momentum-shape.stdout.txt |
| 05 | deny-writes PreToolUse (`{"decision":"deny"}`) + relative `./rel-capture.sh` PreInvocation | Deny semantics honored? Relative commands resolve from hooks.json dir? | probe-05.log, probe-05-deny.stdout.txt, rel-capture-cwd.txt |
| plugin | `agy plugin validate` on empty dir | plugin.json required | inline in fact-sheet §6 |
| non-LLM | builtin skill docs + CLI transcripts + `agy --help` | canonical formats, tool-name enumeration, flag surface | vendor-docs/, fact-sheet §5/§7 |

Probe scripts: `probe-01-discovery.sh` (superseded by 01b inline run), capture
hook template below. hooks.json variants used per probe are archived alongside.
