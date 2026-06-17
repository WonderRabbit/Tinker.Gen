# Tinker.Gen

Tinker.Gen is a TypeScript CLI for repository analysis and deterministic generation scaffolds. The first milestone keeps CodeGraph optional and off by default, writes local artifacts under `.tinker/`, and uses preview/apply safety before creating files.

## Commands

- `tinker doctor --json` reports Node, config, schema, and CodeGraph health.
- `tinker analyze --no-codegraph --project .` writes inventory, diagnostics, and analysis manifest artifacts.
- `tinker codegraph setup --target codex --print` prints local MCP setup guidance.
- `tinker codegraph init --yes` is the only command that may initialize `.codegraph/`.
- `tinker plan --manifest examples/component-scaffold.json` validates and stores a template manifest.
- `tinker preview --manifest .tinker/template-manifest.json` creates checkpointed preview files.
- `tinker apply --preview <preview-id>` applies create-only actions after checkpoint validation.
- `tinker integration opencode print` prints an opt-in shim template that shells out to `tinker`.

## CodeGraph Policy

CodeGraph is a CLI-only provider in this milestone. Normal analysis falls back to the built-in analyzer if CodeGraph is missing or uninitialized, and `analyze` never runs `codegraph init`.

## Generation Policy

The current generator target is `component-scaffold`. It uses an internal deterministic renderer while preserving an adapter-shaped boundary for a later Yeoman adapter. This milestone does not claim production template coverage.
