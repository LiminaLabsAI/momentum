// momentum enforcement plugin for opencode.
//
// Installed by momentum init/upgrade --agent opencode into
// .opencode/plugins/momentum.js — auto-loaded by opencode at startup.
//
// One plugin, three hooks — the opencode-native equivalent of the shell
// hooks the other adapters wire (core/scripts/brainstorm-gate.sh,
// check-history-reminder.sh, sessionstart-handoff.sh). Reads the same
// .momentum/ sentinels, so enforcement semantics are identical across
// platforms:
//
//   tool.execute.before  — brainstorm gate: while .momentum/brainstorm-active
//                          exists, write-class tools targeting specs/** throw
//                          (throwing blocks the tool call).
//   tool.execute.after   — history reminder: meaningful edits during phase
//                          work prompt for a history.md append (Rule 8).
//   event (session.created) — handoff banner: pending .momentum/inbox/
//                          handoffs surface at session start (TUI/serve
//                          sessions only; see the run-mode note below).
//
// Self-contained: node builtins only, no npm dependencies. Fail-open by
// design (like the shell hooks): any unexpected error in reminder/banner
// paths is swallowed; only the gate throws, and only on a confirmed
// specs/-write during an active brainstorm.

import fs from "node:fs"
import path from "node:path"

const WRITE_TOOLS = new Set(["write", "edit", "patch"])
const REMINDER_THROTTLE_MS = 30 * 60 * 1000 // one nudge per 30 min

function extractTargetPath(tool, args) {
  if (!args || typeof args !== "object") return null
  if (typeof args.filePath === "string") return args.filePath
  if (typeof args.path === "string") return args.path
  if (tool === "bash" && typeof args.command === "string") {
    // Mirror brainstorm-gate.sh's shell heuristic: first specs/ path in the
    // command (catches `> specs/...`, `sed -i ... specs/...`, `tee specs/...`).
    const m = args.command.match(/specs\/[^\s"'\\]+/)
    return m ? m[0] : null
  }
  return null
}

function isUnderSpecs(root, targetPath) {
  const abs = path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath)
  const rel = path.relative(path.join(root, "specs"), abs)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

export const MomentumPlugin = async ({ directory, worktree }) => {
  const root = worktree || directory || process.cwd()
  const momentumDir = path.join(root, ".momentum")

  // tool.execute.after does NOT carry tool args (confirmed live, Phase 22 G5)
  // — only the before hook sees them. Correlate by callID so the reminder
  // knows which path a completed write touched. Bounded: entries are removed
  // at after-time; the cap guards sessions whose after hooks never fire.
  const pendingWrites = new Map()
  const PENDING_CAP = 512

  return {
    "tool.execute.before": async (input, output) => {
      const tool = (input && input.tool) || ""
      if (!WRITE_TOOLS.has(tool) && tool !== "bash") return
      const target = extractTargetPath(tool, output && output.args)
      if (target && WRITE_TOOLS.has(tool) && input && input.callID) {
        if (pendingWrites.size >= PENDING_CAP) {
          pendingWrites.delete(pendingWrites.keys().next().value)
        }
        pendingWrites.set(input.callID, target)
      }
      if (!fs.existsSync(path.join(momentumDir, "brainstorm-active"))) return
      if (!target) return // fail-open when no path is extractable
      if (isUnderSpecs(root, target)) {
        throw new Error(
          [
            "[brainstorm-gate] Blocked: cannot write to specs/ during active brainstorm.",
            `[brainstorm-gate] Path: ${target}`,
            "[brainstorm-gate] The conversation IS the draft. Get explicit user approval, then:",
            "[brainstorm-gate]   rm .momentum/brainstorm-active",
            "[brainstorm-gate] and retry the write.",
          ].join("\n"),
        )
      }
    },

    "tool.execute.after": async (input, output) => {
      try {
        const tool = (input && input.tool) || ""
        if (!WRITE_TOOLS.has(tool)) return
        // Args live only in the before hook — recover the path via callID
        // (fallback to output.args for synthetic/direct invocations).
        let target = input && input.callID ? pendingWrites.get(input.callID) : undefined
        if (input && input.callID) pendingWrites.delete(input.callID)
        if (!target) target = extractTargetPath(tool, output && output.args)
        if (!target) return
        // Edits to the spec layer ARE the tracking — only code/doc edits
        // outside specs/ and .momentum/ warrant a history nudge.
        if (isUnderSpecs(root, target)) return
        const rel = path.relative(root, path.isAbsolute(target) ? target : path.join(root, target))
        if (rel.startsWith(".momentum")) return

        const stampFile = path.join(momentumDir, "history-reminder-stamp")
        const now = Date.now()
        try {
          const last = fs.statSync(stampFile).mtimeMs
          if (now - last < REMINDER_THROTTLE_MS) return
        } catch {
          /* no stamp yet — proceed */
        }
        fs.mkdirSync(momentumDir, { recursive: true })
        fs.writeFileSync(stampFile, String(now))
        console.log(
          "[momentum] Meaningful edit landed — if this completes a decision, discovery, or " +
            "scope change, append a history entry to your phase's history.md (Rule 8). " +
            "Resolve your phase from the current branch (Rule 15).",
        )
      } catch {
        /* reminder is best-effort; never disturb the session */
      }
    },

    // Handoff banner. Session events reach plugins ONLY via the generic
    // `event` bus in opencode 1.17.x — a named "session.created" hook key
    // never fires (live-verified, Phase 22 follow-up). The event handler is
    // registered conditionally: its mere presence HANGS `opencode run`
    // non-interactive mode (reproduced on 1.17.13), and a session-start
    // banner is meaningless there anyway — so run-mode skips it.
    ...(process.argv.includes("run")
      ? {}
      : {
          event: async ({ event }) => {
            try {
              if (!event || event.type !== "session.created") return
              const inboxDir = path.join(momentumDir, "inbox")
              if (!fs.existsSync(inboxDir)) return
              const pending = fs
                .readdirSync(inboxDir)
                .filter((f) => /^handoff-\d+\.md$/.test(f))
                .sort()
              if (pending.length === 0) return
              console.log(
                `[momentum] ${pending.length} pending handoff(s) in .momentum/inbox/: ` +
                  `${pending.join(", ")} — run /continue (or \`momentum continue\`) to pick up.`,
              )
            } catch {
              /* banner is best-effort; never disturb the session */
            }
          },
        }),
  }
}
