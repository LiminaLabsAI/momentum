# Instruction sources — the three-tier variation model (ADR-0011)

The primary instruction file each agent auto-loads (`CLAUDE.md` for Claude Code,
`AGENTS.md` for every AGENTS.md-standard agent) is **generated**, never
hand-edited. It is a projection of **(principal constants × per-agent variation
manifest)**. Regenerate with `npm run generate-instructions`; the suite's drift
guard fails if a committed template diverges from its sources.

## The three tiers

| Tier | What | Where | Rule |
|------|------|-------|------|
| **1 — Principal constants** (the neutral spine) | Navigation table, Rules 1–15, Naming, Constraints, Project Extensions pointer | `core/instructions/navigation.md`, `core/instructions/rules-body.md` | **Byte-identical** across every agent + surface (`CLAUDE.md` ≡ `AGENTS.md` body) |
| **2 — Variation manifest** | Everything that varies per agent | `adapters/<agent>/instructions/manifest.json` | One declarative record; generator auto-discovers it (OCP) |
| **3 — Surface delta** | Irreducibly agent-specific integration prose + the task-tool mapping line | `adapters/<agent>/instructions/surfaces.md` (optional) | A scoped delta, never the file's whole identity (SRP) |

The rules body carries **no agent-specific token** — the task tool is named only
in the Tier-3 delta, which every agent still loads. That is what makes the spine
byte-identical (and therefore a testable invariant, not a claim).

## `manifest.json` schema

```json
{
  "id": "opencode",
  "displayName": "opencode",
  "surface": "agents-md",
  "taskTool": "the built-in **task** tool (subagent fan-out)",
  "taskToolName": "The task tool",
  "hasSurfaceDelta": true
}
```

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Adapter id — must match the `adapters/<id>/` directory name |
| `displayName` | string | Human name used in the header scaffold + integration heading |
| `surface` | `"claude-md"` \| `"agents-md"` | Which instruction file this agent reads; drives the install destination |
| `taskTool` | string | Rendered into the Tier-3 task-tool mapping line (may contain markdown) |
| `taskToolName` | string | Capitalized short form for prose references |
| `hasSurfaceDelta` | boolean | Whether a `surfaces.md` integration delta exists for this agent |

## Assembly order

```
header (scaffold, display name from manifest)
  → navigation (Tier 1)
  → surfaces delta (Tier 3, if hasSurfaceDelta)
  → rules body (Tier 1, agent-neutral)
  → Project Extensions pointer tail (ADR-0010)
```

## Adding a new agent (the OCP path)

1. Create `adapters/<id>/instructions/manifest.json`.
2. Optionally add `adapters/<id>/instructions/surfaces.md` (integration delta).
3. Run `npm run generate-instructions`.

No edit to `scripts/generate-instructions.js` is required — it discovers
adapters by scanning `adapters/*/instructions/`. A suite test proves this by
generating for a synthetic adapter with zero generator edits.

## AGENTS.md when multiple AGENTS.md agents are installed

`AGENTS.md` is a shared standard, so one repo can host several AGENTS.md agents.
The committed per-agent template is the single-agent (N=1) projection. At
install/upgrade, when `installed.json.agents` holds more than one `agents-md`
agent, `AGENTS.md` is **composed**: the neutral spine once, plus one integration
section per installed AGENTS.md agent. `CLAUDE.md` is unaffected (Claude-only).
