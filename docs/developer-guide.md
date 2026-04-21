# Developer Guide

## Contributing to momentum

This repo uses its own toolkit. Everything you need is already installed.

## Setup

```bash
git clone https://github.com/cerebrio/momentum
cd momentum
# momentum's own commands are in .claude/commands/
```

## Development Workflow

1. Check current state: read `specs/status.md`
2. Plan a phase: `/brainstorm-phase`
3. Start: `/start-phase`
4. Track discoveries: `/track` or `/log`
5. Complete: `/sync-docs` then `/complete-phase`

## Template Files

All files in `template/` are what gets installed into user projects.
**They must be generic** — no hardcoded project names, paths, or framework references.

When editing a command in `.claude/commands/`, mirror the same change in `template/.claude/commands/`.

## Testing

After any change to template files or install.sh:

```bash
rm -rf /tmp/test-momentum && mkdir /tmp/test-momentum
./install.sh /tmp/test-momentum
ls /tmp/test-momentum/.claude/commands/
```
