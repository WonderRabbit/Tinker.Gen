#!/usr/bin/env node
import { Command } from "commander";
import { registerAnalyze } from "./commands/analyze.js";
import { registerApply } from "./commands/apply.js";
import { registerCodeGraph } from "./commands/codegraph.js";
import { registerDoctor } from "./commands/doctor.js";
import { registerGenerate } from "./commands/generate.js";
import { registerIntegration } from "./commands/integration.js";
import { registerPlan } from "./commands/plan.js";
import { registerPreview } from "./commands/preview.js";
import { registerSchema } from "./commands/schema.js";
import { errorMessage } from "./core/errors.js";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("tinker")
    .description("Tinker.Gen analysis and safe generation CLI")
    .version("0.1.0");
  program.showHelpAfterError();

  registerDoctor(program);
  registerSchema(program);
  registerAnalyze(program);
  registerCodeGraph(program);
  registerPlan(program);
  registerGenerate(program);
  registerPreview(program);
  registerApply(program);
  registerIntegration(program);

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildProgram()
    .parseAsync(process.argv)
    .catch((error: unknown) => {
      process.stderr.write(`${errorMessage(error)}\n`);
      process.exitCode = 1;
    });
}
