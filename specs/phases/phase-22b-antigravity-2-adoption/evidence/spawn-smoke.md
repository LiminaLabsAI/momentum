# G2 live spawn smoke — 2026-07-05, agy 1.0.16

## Invocation (adapter.spawn, MOMENTUM_AGY_PRINT_TIMEOUT=60s)
```json
{"repoId":"smoke-repo","status":0,"detail":"launched pid 68529 (log: .../spawn-smoke/.momentum/swarm-supervisor-22b-smoke-w1.log)"}
```

## Supervisor log content (hook-less fixture; prompt asked for BOOT-OK)
```
BOOT-OK
```

Verifies: real flag surface accepted (--new-project --dangerously-skip-permissions --print-timeout -p), cwd = repoPath, detached launch, per-repo log provisioning, print output captured.
