'use strict';

// Typed event emitter for orchestration primitives.
//
// Every primitive (scout, dispatch, handoff) emits structured events as
// it runs. Two default subscribers:
//   - renderer: prints `▸ <message>` lines to stdout (chat surface).
//   - persister: appends the same events to the ecosystem session log
//     (durable audit surface).
//
// One source, two surfaces — keeps live narration and the persistent
// log in lockstep. New event types are listed in EVENT_KINDS; adding
// one requires updating that list AND any rendering / persistence code
// that depends on the kind.

const EVENT_KINDS = Object.freeze([
  // Primitive lifecycle
  'started',
  'finished',
  'failed',

  // Step-level progress (file reads, sub-agent spawns, etc.)
  'step',
  'note',           // free-form info that should land in chat + log

  // Sub-agent lifecycle (used by dispatch)
  'subagent-started',
  'subagent-finished',
  'subagent-failed',

  // Result-level events
  'finding',        // emitted by scout/dispatch when a notable finding is identified
  'synthesized',    // emitted by dispatch after synthesis completes
]);

function isValidKind(kind) {
  return EVENT_KINDS.includes(kind);
}

/**
 * Create a new event emitter for a single primitive invocation.
 *
 * @param {object} opts
 * @param {string} opts.primitive   one of: 'scout' | 'dispatch' | 'handoff' | 'continue'
 * @param {string} [opts.runId]     monotonic per-primitive run id (set later by run-artifact)
 * @param {string} [opts.repo]      originating repo path
 * @returns {{ emit: Function, on: Function, kinds: string[], context: object }}
 */
function createEmitter(opts = {}) {
  const subscribers = [];
  const context = { ...opts };

  function emit(kind, payload = {}) {
    if (!isValidKind(kind)) {
      throw new Error(
        `orchestration/events: unknown event kind "${kind}". ` +
        `Valid kinds: ${EVENT_KINDS.join(', ')}`,
      );
    }
    const event = {
      kind,
      timestamp: new Date().toISOString(),
      primitive: context.primitive,
      runId: context.runId,
      repo: context.repo,
      ...payload,
    };
    for (const subscriber of subscribers) {
      try {
        subscriber(event);
      } catch (err) {
        // Subscribers MUST NOT throw — but if one does, log and continue
        // rather than letting it break the primitive.
        process.stderr.write(
          `orchestration/events: subscriber error: ${err.message}\n`,
        );
      }
    }
    return event;
  }

  function on(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('orchestration/events: subscriber must be a function');
    }
    subscribers.push(handler);
    return () => {
      const idx = subscribers.indexOf(handler);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  }

  return { emit, on, kinds: EVENT_KINDS, context };
}

/**
 * Default renderer subscriber — prints `▸ <message>` lines to a stream
 * (default: stdout). Mostly for the CLI doors; in-agent contexts
 * synthesize their own rendering layer.
 *
 * @param {object} [opts]
 * @param {NodeJS.WritableStream} [opts.stream]  default: process.stdout
 * @param {boolean} [opts.silent]  if true, no output (useful for tests)
 * @returns {Function} subscriber
 */
function createRenderer(opts = {}) {
  const stream = opts.stream || process.stdout;
  return function rendererSubscriber(event) {
    if (opts.silent) return;
    const line = renderEvent(event);
    if (line) stream.write(line + '\n');
  };
}

function renderEvent(event) {
  switch (event.kind) {
    case 'started':
      return `▸ ${event.primitive}${event.repo ? ` ${event.repo}` : ''}${
        event.message ? `: ${event.message}` : ''
      }`;
    case 'finished':
      return `▸ ${event.primitive} done${event.duration != null ? ` (${event.duration}ms)` : ''}${
        event.runArtifactPath ? ` → ${event.runArtifactPath}` : ''
      }`;
    case 'failed':
      return `▸ ${event.primitive} FAILED${event.error ? `: ${event.error}` : ''}`;
    case 'step':
      return `  ▸ ${event.message || ''}`;
    case 'note':
      return `  ▸ ${event.message || ''}`;
    case 'subagent-started':
      return `  ▸ ${event.repo}…`;
    case 'subagent-finished':
      return `  ▸ ${event.repo}… done${event.duration != null ? ` (${event.duration}ms)` : ''}`;
    case 'subagent-failed':
      return `  ▸ ${event.repo}… FAILED${event.error ? `: ${event.error}` : ''}`;
    case 'finding':
      return `  ▸ found: ${event.summary || event.message || ''}`;
    case 'synthesized':
      return event.message ? `▸ Synthesis\n${event.message}` : '▸ Synthesis';
    default:
      return null;
  }
}

/**
 * Default persister subscriber — appends events to the ecosystem
 * session log. Uses the shared session-log writer (lock-aware) so we
 * don't race with PostToolUse hook commits.
 *
 * @param {object} opts
 * @param {string} opts.ecosystemRoot   ecosystem root path
 * @param {string} opts.memberId        member id of the originating repo
 * @returns {Function} subscriber
 */
function createPersister(opts) {
  const { appendLine } = require('./session-log');
  return function persisterSubscriber(event) {
    if (!opts || !opts.ecosystemRoot || !opts.memberId) return;
    const line = persistEvent(event);
    if (!line) return;
    appendLine({
      ecosystemRoot: opts.ecosystemRoot,
      memberId: opts.memberId,
      kind: event.primitive,
      summary: line,
      context: event.runId ? `run-${event.runId}` : '',
    });
  };
}

function persistEvent(event) {
  // Only persist primitive-level lifecycle events; step-level events
  // would flood the session log.
  switch (event.kind) {
    case 'started':
      return `${event.primitive} ${event.repo || ''}${event.message ? `: ${event.message}` : ''}`.trim();
    case 'finished':
      return `${event.primitive} done${event.runArtifactPath ? ` → ${event.runArtifactPath}` : ''}`;
    case 'failed':
      return `${event.primitive} FAILED${event.error ? `: ${event.error}` : ''}`;
    case 'synthesized':
      return event.summary ? `${event.primitive} synthesis: ${event.summary}` : null;
    default:
      return null;
  }
}

module.exports = {
  EVENT_KINDS,
  isValidKind,
  createEmitter,
  createRenderer,
  createPersister,
  renderEvent,    // exported for tests
  persistEvent,   // exported for tests
};
