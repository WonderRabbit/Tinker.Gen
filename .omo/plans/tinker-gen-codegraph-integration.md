# Tinker.Gen Optional CodeGraph Integration

## TL;DR
> Summary:      Build the first Tinker.Gen milestone as a greenfield TypeScript CLI with deterministic repository analysis, schema-backed artifacts, preview/apply safety, and optional CodeGraph assistance behind an off-by-default provider. CodeGraph is CLI-only in this milestone; MCP/Codex/opencode setup is printed guidance unless the user invokes an explicit setup command.
> Deliverables:
> - TypeScript CLI scaffold with `tinker` bin, tests, lint, typecheck, and build scripts
> - Config schema with explicit CodeGraph opt-in and local-only write policy
> - Built-in analyzer plus optional `@colbymchenry/codegraph` CLI provider
> - Stable `.tinker/` inventory, diagnostics, manifest, preview, checkpoint, and lock artifacts
> - Minimal deterministic generator target and safe preview/apply flow
> - Optional OpenCode/Tiny-Chu shim after the core CLI is accepted
> Effort:       Medium
> Risk:         Medium - greenfield architecture plus external CLI integration and write-safety requirements

## Scope

### Must have

- Greenfield TypeScript/Node CLI.
- Package manager: `npm`.
- Runtime target: Node `>=22.5.0`.
- Module format: ESM.
- CLI bin name: `tinker`.
- Entrypoint layout:
  - `src/cli.ts`
  - `src/commands/*.ts`
  - `src/config/*.ts`
  - `src/analysis/*.ts`
  - `src/codegraph/*.ts`
  - `src/generation/*.ts`
  - `src/preview/*.ts`
  - `src/apply/*.ts`
  - `src/schemas/*.ts`
- Test runner: Vitest.
- Typecheck: `tsc --noEmit`.
- Lint/format check: Biome.
- Build: `tsc -p tsconfig.json`.
- Config file: `tinker.config.json`.
- Config validator: Zod, with JSON Schema files emitted or maintained under `schemas/`.
- Config precedence, highest to lowest:
  1. CLI flags
  2. `tinker.config.json`
  3. built-in defaults
- CodeGraph defaults:
  - `enabled: false`
  - `command: "codegraph"`
  - `projectPath: "."`
  - `autoInit: false`
  - `preferMcp: false`
  - `timeoutMs: 10000`
  - `maxFiles: 20`
- CodeGraph integration is CLI-only for this milestone.
- `analyze --codegraph` must never run `codegraph init`.
- Only `tinker codegraph init` may create `.codegraph/`, and it must require explicit confirmation unless passed `--yes`.
- Global/user config writes are forbidden unless a later explicit setup command is added and separately approved.
- Stable artifacts:
  - `.tinker/inventory.json`
  - `.tinker/analysis-manifest.json`
  - `.tinker/diagnostics.json`
  - `.tinker/template-manifest.json`
  - `.tinker/previews/{previewId}.json`
  - `.tinker/checkpoints/{previewId}.json`
  - `.tinker/apply.lock`
- Provider contract includes:
  - `providerId`
  - `providerVersion`
  - `artifactSchemaVersion`
  - `command`
  - `cwd`
  - `projectPath`
  - `timestamp`
  - `indexed`
  - `diagnostics`
  - `sourceRefs`
- Built-in analyzer first pass includes:
  - gitignore-aware file inventory
  - language counts
  - package manifest detection
  - TypeScript/JavaScript import graph using the TypeScript compiler API
- Minimal generator target:
  - artifact type: `component-scaffold`
  - manifest schema version: `tinker.template-manifest.v1`
  - input: component name, output root, language, layers
  - output directory: `.tinker/generated/<componentName>/`
  - preview actions: create-only file actions with SHA-256 content hashes

### Must NOT have

- No Tiny-Chu core dependency.
- No mandatory CodeGraph dependency.
- No automatic `codegraph init` from `analyze`.
- No silent writes to `~/.codex/config.toml`, `~/.config/opencode/opencode.json`, or other user/global config.
- No HKUST-KnowComp/CodeGraph integration.
- No model-generated final source files.
- No production business templates before analyzer/manifest/preview/apply contracts are proven.
- No Yeoman runtime dependency in this milestone until dependency risk is reviewed separately. The generator API must be adapter-shaped so a Yeoman adapter can be added later without changing manifest contracts.

## Verification strategy

> Zero human intervention - all verification is agent-executed.

- Test decision: TDD + Vitest for config, provider, analyzer, manifest, preview, and apply contracts.
- QA policy: every todo has an agent-executed CLI scenario.
- Evidence: `.omo/evidence/task-<N>-<slug>.<ext>`.
- Real-surface commands must use the built CLI through `node dist/cli.js ...` after `npm run build`.
- If `codegraph` is unavailable in a later environment, CodeGraph QA must use a PATH-shadow fixture script for unavailable/error cases and record the real `command -v codegraph` result separately.

## Execution strategy

### Parallel execution waves

Wave 1 (bootstrap chain): Todo 1, then Todo 2, then Todo 3, then Todos 4 and 5 in parallel, then Todo 6 after Todo 5.
Wave 2 (after analyzer/config/provider contracts): Todo 7, then Todo 8, then Todo 9, then Todos 10 and 12 in parallel, then Todo 11.
Wave 3 (after core CLI acceptance): Todos 13 and 14 in parallel.

Critical path: 1 -> 2 -> 3 -> 7 -> 8 -> 9 -> 10 -> 11 -> final verification.

### Dependency matrix

| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | none | 2, 3, 4, 5, 6 | none |
| 2 | 1 | 3, 5, 6, 7, 12 | none |
| 3 | 1, 2 | 4, 5, 7, 8 | none |
| 4 | 1, 3 | 7 | 5 |
| 5 | 1, 2, 3 | 6, 7, 12 | 4 |
| 6 | 1, 2, 5 | 12 | none |
| 7 | 2, 3, 4, 5 | 8, 12 | none |
| 8 | 3, 7 | 9, 10 | 12 |
| 9 | 8 | 10 | 12 |
| 10 | 8, 9 | 11 | 12 |
| 11 | 10 | final verification | none |
| 12 | 2, 5, 7 | final verification | 8, 9, 10, 11 |
| 13 | 11, 12 | final verification | 14 |
| 14 | 11, 12 | final verification | 13 |

## Todos

- [ ] 1. Scaffold TypeScript CLI and toolchain
  What to do / Must NOT do
  Create the greenfield npm package, ESM TypeScript project, `tinker` bin, CLI entrypoint, Vitest, Biome, and build/typecheck/test scripts. Use Node `>=22.5.0`. Do not add CodeGraph, Yeoman, Tiny-Chu, or OpenCode dependencies in this todo.
  Parallelization: Can parallel N | Wave 1 | Blocks 2, 3, 4, 5, 6
  References (executor has NO interview context - be exhaustive): `.omo/drafts/tinker-gen-codegraph-integration.md`; `.omo/ultraresearch/20260617-195951/SYNTHESIS.md`
  Acceptance criteria (agent-executable): `npm run build`, `npm run typecheck`, `npm run test`, and `npm run lint` exit 0; `node dist/cli.js --help` prints a `tinker` command list.
  QA scenarios (name the exact tool + invocation): Happy QA: `omo sparkshell --shell 'npm run build > .omo/evidence/task-1-build.txt && node dist/cli.js --help > .omo/evidence/task-1-cli-help.txt && rg -n "Usage|tinker" .omo/evidence/task-1-cli-help.txt'` PASS if build exits 0 and help mentions `tinker` or `Usage`. Failure QA: `omo sparkshell --shell 'node dist/cli.js __unknown__ > .omo/evidence/task-1-unknown-command.txt 2>&1; test $? -ne 0; rg -n "unknown|invalid|Unknown" .omo/evidence/task-1-unknown-command.txt'` PASS if the unknown command exits nonzero and reports an invalid command.
  Commit: N | draft `chore(cli): scaffold tinker cli toolchain` | Files `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, `src/cli.ts`, `tests/**`

- [ ] 2. Define config schema and precedence
  What to do / Must NOT do
  Add Zod runtime config schema, JSON Schema artifact, defaults, file loader for `tinker.config.json`, CLI override merge, and local-only write policy. CodeGraph must be off by default. Do not read or write global Codex/opencode config.
  Parallelization: Can parallel Y | Wave 1 | Blocks 3, 5, 6, 7, 12 | Blocked by 1
  References: `.omo/drafts/tinker-gen-codegraph-integration.md` section `Decisions Recorded`; `.omo/ultraresearch/20260617-195951/wave-3-librarian-constrained-generation.md`
  Acceptance criteria: failing-first Vitest coverage proves defaults, config file load, CLI flag override, invalid config diagnostics, and `analysis.codegraph.enabled === false` by default; `npm run test -- tests/config.test.ts` exits 0.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js doctor --json --config ./missing-config.json > .omo/evidence/task-2-doctor-missing-config.json && node -e "const j=require(\"./.omo/evidence/task-2-doctor-missing-config.json\"); if (j.config?.analysis?.codegraph?.enabled !== false) process.exit(1)"'` PASS if defaults load and CodeGraph is false. Failure QA: `omo sparkshell --shell 'printf "{ invalid json" > /tmp/tinker-invalid-config.json; node dist/cli.js doctor --json --config /tmp/tinker-invalid-config.json > .omo/evidence/task-2-invalid-config.json 2>&1; test $? -ne 0; rg -n "config|JSON|invalid" .omo/evidence/task-2-invalid-config.json'` PASS if invalid config exits nonzero and names the config error.
  Commit: N | draft `feat(config): add tinker config schema` | Files `src/config/**`, `schemas/tinker-config.schema.json`, `tests/config.test.ts`

- [ ] 3. Define provider and artifact contracts
  What to do / Must NOT do
  Add TypeScript types plus JSON schemas for provider results, inventory, analysis manifest, diagnostics, template manifest, preview, and checkpoint artifacts. Include `providerId`, `providerVersion`, `artifactSchemaVersion`, command/cwd/projectPath, timestamp, indexed status, diagnostics, and source refs. Do not make CodeGraph fields mandatory for the built-in provider.
  Parallelization: Can parallel Y | Wave 1 | Blocks 4, 5, 7, 8 | Blocked by 1, 2
  References: `.omo/ultraresearch/20260617-195951/SYNTHESIS.md` sections `Normalized model` and `Validation stage`; `.omo/ultraresearch/20260617-195951/wave-2-librarian-data-architecture-inventory.md`; `.omo/drafts/tinker-gen-codegraph-integration.md`
  Acceptance criteria: `npm run test -- tests/artifact-contracts.test.ts` validates happy and invalid examples for every schema; `npm run typecheck` proves exported types compile.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js schema list > .omo/evidence/task-3-schema-list.txt && rg -n "inventory|analysis-manifest|diagnostics|template-manifest|preview|checkpoint" .omo/evidence/task-3-schema-list.txt'` PASS if every planned schema family is listed. Failure QA: `omo sparkshell --shell 'node dist/cli.js schema validate --kind inventory --file tests/fixtures/invalid-inventory.json > .omo/evidence/task-3-invalid-schema.txt 2>&1; test $? -ne 0; rg -n "schema|invalid|validation" .omo/evidence/task-3-invalid-schema.txt'` PASS if invalid inventory fixture fails schema validation.
  Commit: N | draft `feat(contracts): define analysis artifact schemas` | Files `src/schemas/**`, `src/analysis/contracts.ts`, `schemas/*.json`, `tests/artifact-contracts.test.ts`

- [ ] 4. Implement built-in analyzer
  What to do / Must NOT do
  Implement a deterministic built-in provider that respects `.gitignore`, skips dependency/build/cache directories, records file inventory, language counts, package manifests, and TS/JS import graph via the TypeScript compiler API. Do not do free-form symbol extraction in this milestone.
  Parallelization: Can parallel Y | Wave 1 | Blocks 7 | Blocked by 1, 3
  References: `.omo/ultraresearch/20260617-195951/SYNTHESIS.md` section `Analyzer layer`; `.omo/ultraresearch/20260617-195951/wave-3-librarian-repo-map.md`
  Acceptance criteria: `npm run test -- tests/builtin-analyzer.test.ts` covers gitignore behavior, language counts, package manifest detection, and TS/JS import graph on a fixture repo.
  QA scenarios: Happy QA: `omo sparkshell --shell 'rm -rf .tinker && node dist/cli.js analyze --no-codegraph --project tests/fixtures/basic-ts --out .tinker > .omo/evidence/task-4-analyze-no-codegraph.txt && node -e "const j=require(\"./.tinker/inventory.json\"); if (j.providerId !== \"builtin\") process.exit(1)"'` PASS if built-in inventory is written with `providerId:"builtin"`. Failure QA: `omo sparkshell --shell 'node dist/cli.js analyze --no-codegraph --project tests/fixtures/missing-project > .omo/evidence/task-4-missing-project.txt 2>&1; test $? -ne 0; rg -n "project|not found|missing" .omo/evidence/task-4-missing-project.txt'` PASS if a missing project exits nonzero.
  Commit: N | draft `feat(analysis): add builtin repository analyzer` | Files `src/analysis/builtin-provider.ts`, `src/analysis/gitignore.ts`, `tests/builtin-analyzer.test.ts`, `tests/fixtures/basic-ts/**`

- [ ] 5. Implement CodeGraph CLI wrapper and status parser
  What to do / Must NOT do
  Add a CLI-only CodeGraph wrapper using child process execution with timeout, JSON parsing, version/status detection, and structured errors for missing CLI, nonzero exit, invalid JSON, uninitialized repo, timeout, and unsupported version. Do not use the CodeGraph SDK or MCP in this milestone.
  Parallelization: Can parallel Y | Wave 1 | Blocks 6, 7, 12 | Blocked by 1, 2, 3
  References: `.omo/drafts/tinker-gen-codegraph-integration.md` section `CodeGraph Evidence`; local command evidence from `codegraph --help`, `codegraph status --json`, `codegraph query --help`, `codegraph affected --help`; https://colbymchenry.github.io/codegraph/
  Acceptance criteria: `npm run test -- tests/codegraph-cli.test.ts` covers real/fake command paths, timeouts, invalid JSON, nonzero exit, initialized false, and version capture.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js codegraph status --json --project . > .omo/evidence/task-5-codegraph-status.json && node -e "const j=require(\"./.omo/evidence/task-5-codegraph-status.json\"); if (!j.codegraph || typeof j.codegraph.available !== \"boolean\") process.exit(1)"'` PASS if status JSON includes a CodeGraph availability object. Failure QA: `omo sparkshell --shell 'PATH=/usr/bin:/bin node dist/cli.js codegraph status --json --project . > .omo/evidence/task-5-codegraph-missing-cli.json 2>&1; test $? -ne 0; rg -n "codegraph|not found|unavailable" .omo/evidence/task-5-codegraph-missing-cli.json'` PASS if missing CLI exits nonzero and reports unavailable CodeGraph.
  Commit: N | draft `feat(codegraph): add cli status wrapper` | Files `src/codegraph/cli.ts`, `src/codegraph/errors.ts`, `tests/codegraph-cli.test.ts`

- [ ] 6. Add explicit CodeGraph setup commands
  What to do / Must NOT do
  Add `tinker codegraph status`, `tinker codegraph init`, and `tinker codegraph setup --target codex|opencode --print`. `status` is read-only. `init` is the only command allowed to create `.codegraph/`; require confirmation unless `--yes`. `setup --print` prints snippets only; no global file writes. Do not implement non-printing global config writes in this plan.
  Parallelization: Can parallel Y | Wave 1 | Blocks 12 | Blocked by 1, 2, 5
  References: `.omo/drafts/tinker-gen-codegraph-integration.md`; CodeGraph help for `install --print-config codex` and `install --print-config opencode`
  Acceptance criteria: `npm run test -- tests/codegraph-commands.test.ts` proves `status` does not write, `init` requires confirmation, `--yes` allows init in a temp fixture, and setup only prints config snippets.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js codegraph setup --target codex --print > .omo/evidence/task-6-codegraph-codex-snippet.txt && node dist/cli.js codegraph setup --target opencode --print > .omo/evidence/task-6-codegraph-opencode-snippet.txt && rg -n "serve|--mcp|codegraph" .omo/evidence/task-6-codegraph-codex-snippet.txt .omo/evidence/task-6-codegraph-opencode-snippet.txt'` PASS if both printed snippets contain `codegraph serve --mcp`. Failure QA: `omo sparkshell --shell 'rm -rf /tmp/tinker-cg-init-fixture && mkdir -p /tmp/tinker-cg-init-fixture; node dist/cli.js codegraph init --project /tmp/tinker-cg-init-fixture > .omo/evidence/task-6-codegraph-init-blocked.txt 2>&1; test $? -ne 0; test ! -d /tmp/tinker-cg-init-fixture/.codegraph'` PASS if init without `--yes` exits nonzero and does not create `.codegraph/`.
  Commit: N | draft `feat(codegraph): add explicit setup commands` | Files `src/commands/codegraph.ts`, `tests/codegraph-commands.test.ts`

- [ ] 7. Implement `analyze` provider selection and normalized artifacts
  What to do / Must NOT do
  Add `tinker analyze --no-codegraph` and `tinker analyze --codegraph`. Default uses built-in only. When CodeGraph is enabled but unavailable/uninitialized, emit diagnostics and fall back to built-in unless `--require-codegraph` is passed. Write `.tinker/inventory.json`, `.tinker/analysis-manifest.json`, and `.tinker/diagnostics.json`. Do not run `codegraph init`.
  Parallelization: Can parallel N | Wave 2 | Blocks 8, 12 | Blocked by 2, 3, 4, 5
  References: `.omo/drafts/tinker-gen-codegraph-integration.md` sections `Decisions Recorded` and `Scope In`; `.omo/ultraresearch/20260617-195951/SYNTHESIS.md`
  Acceptance criteria: `npm run test -- tests/analyze-command.test.ts` covers default built-in, explicit no-codegraph, codegraph unavailable fallback, codegraph uninitialized fallback, `--require-codegraph` failure, artifact writes, and diagnostics.
  QA scenarios: Happy QA: `omo sparkshell --shell 'rm -rf .tinker && node dist/cli.js analyze --no-codegraph --project tests/fixtures/basic-ts > .omo/evidence/task-7-analyze-builtin.txt && test -f .tinker/inventory.json && test -f .tinker/analysis-manifest.json && test -f .tinker/diagnostics.json'` PASS if all normalized artifacts exist. Failure QA: `omo sparkshell --shell 'rm -rf .codegraph; node dist/cli.js analyze --codegraph --project . > .omo/evidence/task-7-analyze-codegraph-uninitialized.txt 2>&1; test ! -d .codegraph; rg -n "fallback|uninitialized|diagnostic|builtin" .omo/evidence/task-7-analyze-codegraph-uninitialized.txt .tinker/diagnostics.json'` PASS if uninitialized CodeGraph does not create `.codegraph/` and records fallback diagnostics.
  Commit: N | draft `feat(analysis): normalize provider outputs` | Files `src/commands/analyze.ts`, `src/analysis/run-analysis.ts`, `tests/analyze-command.test.ts`

- [ ] 8. Add manifest schema and minimal generator target
  What to do / Must NOT do
  Define `tinker.template-manifest.v1` for `component-scaffold`. Inputs: component name, output root, language, layers. Output root defaults to `.tinker/generated/<componentName>/`. Expected preview actions are create-only with target path, template id, content hash, and source inventory refs. Do not call an LLM.
  Parallelization: Can parallel Y | Wave 2 | Blocks 9, 10 | Blocked by 3, 7
  References: `.omo/ultraresearch/20260617-195951/SYNTHESIS.md` sections `Small-model stage`, `Validation stage`, `Generation stage`; `.omo/ultraresearch/20260617-195951/wave-3-librarian-openapi-generator.md`
  Acceptance criteria: `npm run test -- tests/template-manifest.test.ts` validates good/bad manifests and proves `tinker plan --manifest examples/component-scaffold.json` writes `.tinker/template-manifest.json`.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js plan --manifest examples/component-scaffold.json > .omo/evidence/task-8-plan-manifest.txt && node -e "const j=JSON.parse(require(\"fs\").readFileSync(\".tinker/template-manifest.json\",\"utf8\")); if (j.schemaVersion !== \"tinker.template-manifest.v1\") process.exit(1)" > .omo/evidence/task-8-manifest-json.txt'` PASS if the manifest is valid JSON with v1 schema. Failure QA: `omo sparkshell --shell 'node dist/cli.js plan --manifest tests/fixtures/invalid-component-manifest.json > .omo/evidence/task-8-invalid-manifest.txt 2>&1; test $? -ne 0; rg -n "manifest|invalid|schema" .omo/evidence/task-8-invalid-manifest.txt'` PASS if invalid manifest exits nonzero.
  Commit: N | draft `feat(manifest): add component scaffold manifest` | Files `src/generation/manifest.ts`, `schemas/template-manifest.schema.json`, `examples/component-scaffold.json`, `tests/template-manifest.test.ts`

- [ ] 9. Implement deterministic generator adapter
  What to do / Must NOT do
  Add a generator adapter interface and a minimal internal template renderer for `component-scaffold`. Use create-only output under `.tinker/generated/<componentName>/`. Keep templates static and deterministic. Do not add Yeoman runtime yet; leave a `YeomanGeneratorAdapter` interface placeholder only if it has no dependency.
  Parallelization: Can parallel Y | Wave 2 | Blocks 10 | Blocked by 8
  References: `.omo/ultraresearch/20260617-195951/verify-yeoman-programmatic.md`; `.omo/ultraresearch/20260617-195951/wave-3-librarian-yeoman-source.md`; `.omo/ultraresearch/20260617-195951/SYNTHESIS.md` caveat about Yeoman dependency risk
  Acceptance criteria: `npm run test -- tests/generator-adapter.test.ts` proves deterministic output, stable hashes, create-only actions, and no source-tree writes during generation.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js generate --manifest examples/component-scaffold.json --dry-run > .omo/evidence/task-9-generate-dry-run.txt && rg -n "component-scaffold|create|dry" .omo/evidence/task-9-generate-dry-run.txt'` PASS if dry-run lists create-only actions. Failure QA: `omo sparkshell --shell 'before=$(git status --short | wc -l); node dist/cli.js generate --manifest examples/component-scaffold.json --dry-run > .omo/evidence/task-9-no-write.txt; after=$(git status --short | wc -l); test "$before" = "$after"'` PASS if dry-run does not change git status count.
  Commit: N | draft `feat(generate): add deterministic component generator` | Files `src/generation/**`, `templates/component-scaffold/**`, `tests/generator-adapter.test.ts`

- [ ] 10. Implement preview checkpoints, hashes, and locks
  What to do / Must NOT do
  Add `tinker preview` that turns a template manifest into `.tinker/previews/{previewId}.json` and `.tinker/checkpoints/{previewId}.json`. Use SHA-256 content hashes. Use `.tinker/apply.lock` as a single-writer lock. Conflict policy: create-only targets fail if existing; overwrite is unsupported in this milestone. Latest-preview requirement: apply can use only an existing checkpoint generated for the current manifest hash.
  Parallelization: Can parallel Y | Wave 2 | Blocks 11 | Blocked by 8, 9
  References: `.omo/ultraresearch/20260617-195951/wave-3-librarian-tinker-contract.md`; `.omo/ultraresearch/20260617-195951/wave-3-librarian-openapi-generator.md`; `.omo/drafts/tinker-gen-codegraph-integration.md`
  Acceptance criteria: `npm run test -- tests/preview.test.ts` covers preview creation, hash stability, existing target conflict, lock behavior, stale manifest rejection, and no disk writes outside `.tinker/previews` and `.tinker/checkpoints`.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js preview --manifest .tinker/template-manifest.json > .omo/evidence/task-10-preview.txt && node -e "const fs=require(\"fs\"); const p=fs.readdirSync(\".tinker/previews\").filter(f=>f.endsWith(\".json\")); const c=fs.readdirSync(\".tinker/checkpoints\").filter(f=>f.endsWith(\".json\")); if (!p.length || !c.length) process.exit(1)" > .omo/evidence/task-10-preview-files.txt'` PASS if preview and checkpoint JSON files exist. Failure QA: `omo sparkshell --shell 'mkdir -p .tinker/generated/sample && touch .tinker/generated/sample/index.ts; node dist/cli.js preview --manifest .tinker/template-manifest.json > .omo/evidence/task-10-existing-target-conflict.txt 2>&1; test $? -ne 0; rg -n "conflict|exists|target" .omo/evidence/task-10-existing-target-conflict.txt'` PASS if existing target conflicts block preview.
  Commit: N | draft `feat(preview): add checkpointed generation preview` | Files `src/preview/**`, `tests/preview.test.ts`

- [ ] 11. Implement safe apply
  What to do / Must NOT do
  Add `tinker apply --preview PREVIEW_ID`. It must acquire `.tinker/apply.lock`, verify checkpoint hashes and target nonexistence immediately before writing, write through temp files plus atomic rename where possible, abort on partial failure, and produce `.tinker/diagnostics.json` updates. It must fail if no preview is supplied or the preview is stale. No rollback for already-created files in this milestone; instead fail before any write if any target is unsafe.
  Parallelization: Can parallel Y | Wave 2 | Blocks final verification | Blocked by 10
  References: `.omo/ultraresearch/20260617-195951/wave-3-librarian-tinker-contract.md`; `.omo/ultraresearch/20260617-195951/wave-2-librarian-generation-safety.md`
  Acceptance criteria: `npm run test -- tests/apply.test.ts` covers no-preview failure, stale-preview failure, successful create-only apply, target-exists conflict, lock conflict, and preflight all-or-nothing behavior.
  QA scenarios: Happy QA: `omo sparkshell --shell 'PREVIEW_ID=$(node -e "const fs=require(\"fs\"); const files=fs.readdirSync(\".tinker/previews\").filter(f=>f.endsWith(\".json\")).sort(); console.log(files.at(-1).replace(/\\\\.json$/,\"\"))"); node dist/cli.js apply --preview "$PREVIEW_ID" > .omo/evidence/task-11-apply-success.txt && test -d .tinker/generated'` PASS if latest derived preview applies and creates `.tinker/generated`. Failure QA: `omo sparkshell --shell 'node dist/cli.js apply > .omo/evidence/task-11-apply-without-preview.txt 2>&1; test $? -ne 0; rg -n "preview|required|missing" .omo/evidence/task-11-apply-without-preview.txt'` PASS if apply without preview exits nonzero.
  Commit: N | draft `feat(apply): add safe preview apply` | Files `src/apply/**`, `src/commands/apply.ts`, `tests/apply.test.ts`

- [ ] 12. Add doctor command and real CLI QA fixtures
  What to do / Must NOT do
  Add `tinker doctor --json` that reports Node version, config load result, output directory writability, CodeGraph CLI availability/version/status, and artifact schema availability. Add fixture scripts for real CLI QA and PATH-shadow CodeGraph failure modes. Do not mutate project or global config in doctor.
  Parallelization: Can parallel Y | Wave 2 | Blocks final verification | Blocked by 2, 5, 7
  References: `.omo/drafts/tinker-gen-codegraph-integration.md`; local CodeGraph evidence from `codegraph status --json`
  Acceptance criteria: `npm run test -- tests/doctor.test.ts` covers real/fake CodeGraph availability, unavailable CLI, invalid config, and JSON output shape.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js doctor --json > .omo/evidence/task-12-doctor.json && node -e "const j=require(\"./.omo/evidence/task-12-doctor.json\"); if (!j.node || !j.schemas || !j.codegraph) process.exit(1)"'` PASS if doctor reports node, schemas, and CodeGraph sections. Failure QA: `omo sparkshell --shell 'PATH=/usr/bin:/bin node dist/cli.js doctor --json > .omo/evidence/task-12-doctor-no-codegraph.json && node -e "const j=require(\"./.omo/evidence/task-12-doctor-no-codegraph.json\"); if (j.codegraph?.available !== false) process.exit(1)"'` PASS if doctor succeeds while reporting CodeGraph unavailable.
  Commit: N | draft `feat(doctor): report cli and codegraph health` | Files `src/commands/doctor.ts`, `tests/doctor.test.ts`, `tests/fixtures/fake-codegraph/**`

- [ ] 13. Add optional OpenCode/Tiny-Chu shim after core acceptance
  What to do / Must NOT do
  Add a minimal optional shim package or local plugin template that shells out to `tinker` commands and exposes only status/analyze/preview/apply helpers. The core CLI must not import Tiny-Chu or OpenCode. The shim must be disabled unless installed or copied by the user.
  Parallelization: Can parallel Y | Wave 3 | Blocks final verification | Blocked by 11, 12
  References: `.omo/ultraresearch/20260617-195951/SYNTHESIS.md` section `Tiny-Chu integration`; `.omo/ultraresearch/20260617-195951/wave-2-librarian-opencode-plugins.md`; `.omo/ultraresearch/20260617-195951/wave-1-librarian-tiny-chu-architecture.md`
  Acceptance criteria: `npm run test -- tests/opencode-shim.test.ts` proves shim commands shell out to `tinker`, core package has no Tiny-Chu dependency, and plugin generation is opt-in.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js integration opencode print > .omo/evidence/task-13-opencode-shim.txt && rg -n "tinker|analyze|preview|apply" .omo/evidence/task-13-opencode-shim.txt'` PASS if shim output shells out to `tinker` commands. Failure QA: `omo sparkshell --shell 'npm ls tiny-chu @opencode-ai/plugin > .omo/evidence/task-13-no-tiny-chu-core.txt 2>&1; test $? -ne 0; ! rg -n "\"tiny-chu\"|\"@opencode-ai/plugin\"" package.json src'` PASS if those packages are absent from core package/source.
  Commit: N | draft `feat(integration): add optional opencode shim` | Files `src/commands/integration.ts`, `integrations/opencode/**`, `tests/opencode-shim.test.ts`

- [ ] 14. Add documentation, examples, and dependency-risk notes
  What to do / Must NOT do
  Write README usage for off-by-default CodeGraph, explicit setup, analyzer artifacts, preview/apply safety, and current generator limits. Include Yeoman dependency-risk note and state that the milestone uses an internal deterministic renderer while preserving adapter shape for a later Yeoman adapter. Do not claim production template coverage.
  Parallelization: Can parallel Y | Wave 3 | Blocks final verification | Blocked by 11, 12
  References: `.omo/ultraresearch/20260617-195951/SYNTHESIS.md`; `.omo/drafts/tinker-gen-codegraph-integration.md`; https://colbymchenry.github.io/codegraph/
  Acceptance criteria: `npm run lint` passes docs/config examples; README commands match implemented CLI; examples validate with tests.
  QA scenarios: Happy QA: `omo sparkshell --shell 'node dist/cli.js --help > .omo/evidence/task-14-help.txt && node dist/cli.js doctor --json > .omo/evidence/task-14-doctor.json && rg -n "CodeGraph|preview|apply|analyze" README.md > .omo/evidence/task-14-readme-check.txt'` PASS if docs mention the implemented command families. Failure QA: `omo sparkshell --shell '! rg -n "production-ready|auto-writes global|Tiny-Chu core dependency|HKUST" README.md > .omo/evidence/task-14-readme-forbidden.txt'` PASS if forbidden claims are absent.
  Commit: N | draft `docs: document codegraph analysis workflow` | Files `README.md`, `examples/**`, `tests/docs-examples.test.ts`

## Final verification wave (after ALL todos)

> Runs in parallel. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.

- [ ] F1. Plan compliance audit
  Run exact command: `omo sparkshell --shell 'npm run build > .omo/evidence/final-plan-compliance-build.txt && node dist/cli.js doctor --json > .omo/evidence/final-plan-compliance-doctor.json && node -e "const j=require(\"./.omo/evidence/final-plan-compliance-doctor.json\"); if (j.config?.analysis?.codegraph?.enabled !== false) process.exit(1)" && (npm ls tiny-chu @opencode-ai/plugin > .omo/evidence/final-plan-compliance-npm-ls.txt 2>&1; test "$?" -ne 0) && ! rg -n "\"tiny-chu\"|\"@opencode-ai/plugin\"|writeFileSync\\([^)]*(codex|opencode|\\.config)" package.json src > .omo/evidence/final-plan-compliance-forbidden.txt'`. PASS if build succeeds, doctor shows CodeGraph disabled by default, core package lacks Tiny-Chu/OpenCode dependencies, and no source path writes Codex/opencode global config.

- [ ] F2. Code quality review
  Run exact command: `omo sparkshell --shell 'npm run typecheck > .omo/evidence/final-typecheck.txt && npm run test > .omo/evidence/final-test.txt && npm run lint > .omo/evidence/final-lint.txt && npm run build > .omo/evidence/final-build.txt && ! rg -n "as any|@ts-ignore|@ts-expect-error|TODO:|FIXME:" src tests > .omo/evidence/final-code-quality-forbidden.txt'`. PASS if all scripts exit 0 and no forbidden TypeScript suppressions or unfinished markers appear.

- [ ] F3. Real manual CLI QA
  Run exact command: `omo sparkshell --shell 'rm -rf .tinker tests/tmp/final-cli-qa && mkdir -p tests/tmp/final-cli-qa && node dist/cli.js doctor --json > .omo/evidence/final-cli-doctor.json && node dist/cli.js analyze --no-codegraph --project tests/fixtures/basic-ts > .omo/evidence/final-cli-analyze-builtin.txt && node dist/cli.js codegraph status --json --project . > .omo/evidence/final-cli-codegraph-status.json && node dist/cli.js analyze --codegraph --project . > .omo/evidence/final-cli-analyze-codegraph.txt && node dist/cli.js plan --manifest examples/component-scaffold.json > .omo/evidence/final-cli-plan.txt && node dist/cli.js preview --manifest .tinker/template-manifest.json > .omo/evidence/final-cli-preview.txt && (node dist/cli.js apply > .omo/evidence/final-cli-apply-blocked.txt 2>&1; test "$?" -ne 0) && PREVIEW_ID=$(node -e "const fs=require(\"fs\"); const files=fs.readdirSync(\".tinker/previews\").filter(f=>f.endsWith(\".json\")).sort(); console.log(files.at(-1).replace(/\\\\.json$/,\"\"))") && node dist/cli.js apply --preview "$PREVIEW_ID" > .omo/evidence/final-cli-apply-success.txt && test -d .tinker/generated'`. PASS if every command succeeds except intentionally blocked apply, which must exit nonzero, and preview apply creates `.tinker/generated`.

- [ ] F4. Scope fidelity
  Run exact command: `omo sparkshell --shell '! rg -n "HKUST|KnowComp|llm.generate|OpenAI|Anthropic|model.*generate|business template|production-ready business" src README.md package.json > .omo/evidence/final-scope-forbidden.txt && test ! -d .codegraph && rg -n "enabled.*false|codegraph.*false|No Tiny-Chu core dependency|No model-generated final source files" .omo/plans/tinker-gen-codegraph-integration.md > .omo/evidence/final-scope-plan-guards.txt'`. PASS if forbidden integrations/claims are absent, the real repo has no `.codegraph/`, and the plan guardrails remain present.

## Commit strategy

- Do not commit automatically unless the user explicitly authorizes commits during execution.
- Keep changes staged by logical unit and present draft Conventional Commit messages.
- If commits are authorized, use one commit per wave:
  - `chore(cli): scaffold tinker toolchain`
  - `feat(analysis): add optional codegraph provider`
  - `feat(generate): add safe manifest preview apply`
  - `feat(integration): add optional opencode shim`
  - `docs: document codegraph workflow`
- Include footer if a final commit is made: `Plan: .omo/plans/tinker-gen-codegraph-integration.md`.

## Success criteria

- `tinker` CLI exists and builds from source.
- CodeGraph is off by default.
- Built-in analysis works without CodeGraph.
- CodeGraph status and setup commands are explicit and safe.
- `analyze --codegraph` never initializes CodeGraph automatically.
- Missing/uninitialized CodeGraph produces diagnostics and safe fallback unless `--require-codegraph` is set.
- `.tinker/inventory.json`, `.tinker/analysis-manifest.json`, and `.tinker/diagnostics.json` are schema-valid.
- Template manifest is schema-valid and creates deterministic preview actions.
- `apply` is blocked without a preview and safe with a fresh preview.
- No Tiny-Chu dependency is present in the core CLI.
- All tests, typecheck, lint, build, and real CLI QA pass with evidence files.
