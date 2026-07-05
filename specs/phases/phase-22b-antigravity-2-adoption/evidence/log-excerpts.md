# Log excerpts (raw *.log files are gitignored; these are the load-bearing lines)

## Healthy hook load + execution (probe-03.log, 15:58)
```
I0705 15:58:32.360997 58541 hooks_manager.go:45] loaded 1 named hooks from 1 hooks.json file(s)
I0705 15:58:38.470816 58541 jsonhook.go:152] Loaded hooks.json from /private/tmp/claude-501/-Users-avinash-Workspace-Projects-cerebrio-momentum/6ea6ad30-4456-4d78-8a80-a6fe3f233b28/scratchpad/agy-fixture/.agents/hooks.json: 1 named hooks, 5 total handlers
I0705 15:58:38.477223 58541 json_hook_caller.go:145] JSON hook "jsonhook__momentum-probe_PreInvocation_0_0": executing command
I0705 15:58:38.879621 58541 json_hook_caller.go:145] JSON hook "jsonhook__momentum-probe_PostToolUse_0_0": executing command
I0705 15:58:41.872159 58541 json_hook_caller.go:145] JSON hook "jsonhook__momentum-probe_PreToolUse_0_0": executing command
I0705 15:58:41.908237 58541 json_hook_caller.go:145] JSON hook "jsonhook__momentum-probe_PostToolUse_0_0": executing command
```

## Hang signature (probe-04.log after 8 min — ONLY the kill signal, zero startup lines)
```
E0000 00:00:1783247908.888852 7570632 process_state.cc:708] RAW: Raising signal 15 with default behavior
```

## Backend/session context (probe-01b.log)
```
I0705 15:55:49.945906 39354 server.go:226] Creating CLI server backend: product=antigravity workspaceDirs=[/private/tmp/claude-501/-Users-avinash-Workspace-Projects-cerebrio-momentum/6ea6ad30-4456-4d78-8a80-a6fe3f233b28/scratchpad/agy-fixture] appDataDir=/Users/avinash/.gemini/antigravity-cli cascadeManager=true codeAssist=true
I0705 15:55:49.973320 39354 keyring.go:59] keyringAuth: loaded token, expiry=2026-07-05 16:53:57.035112 +0530 IST expired=false
I0705 15:55:54.224468 39354 model_config_manager.go:157] Propagating selected model override to backend: label="Gemini 3.5 Flash (Medium)"
I0705 15:56:01.089098 39354 model_config_manager.go:157] Propagating selected model override to backend: label="Gemini 3.5 Flash (Medium)"
```
