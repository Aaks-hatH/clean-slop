import path from 'path';
import process from 'process';
import { loadConfig } from '../../config/loader.js';
import { scan } from '../../scanners/scanner.js';
import type { ScanOptions } from '../../scanners/scanner.js';
import { generate, writeReport } from '../../reporters/index.js';
import type { ReporterName } from '../../reporters/index.js';
import type { ResolvedConfig, Severity } from '../../types.js';
import {
  BOLD,
  DIM,
  GREEN,
  RED,
  RESET,
} from '../../utils/constants.js';

export interface ScanCommandOptions {
  config?: string;
  reporter?: string;
  output?: string;
  failThreshold?: string;
  maxCritical?: string;
  maxHigh?: string;
  aiSlop?: boolean;
  security?: boolean;
  reliability?: boolean;
  maintainability?: boolean;
  productionReadiness?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  ci?: boolean;
}

function clearLine(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\r\x1b[K');
  }
}

function printProgress(filePath: string, index: number, total: number): void {
  if (!process.stdout.isTTY) return;
  const pct = Math.round(((index + 1) / total) * 100);
  const short = filePath.length > 60 ? '...' + filePath.slice(-57) : filePath;
  process.stdout.write(`\r${DIM}Scanning [${pct}%] ${short}${RESET}`);
}

export async function runScan(
  directory: string | undefined,
  options: ScanCommandOptions,
): Promise<void> {
  const ci = options.ci ?? !process.stdout.isTTY;
  const cwd = directory ? path.resolve(directory) : process.cwd();

  // Load config
  const baseConfig = await loadConfig(cwd, options.config);

  // Apply CLI overrides
  const config: ResolvedConfig = {
    ...baseConfig,
    verbose: options.verbose ?? baseConfig.verbose,
    reporter: (options.reporter as ReporterName | undefined) ?? baseConfig.reporter,
    output: options.output ?? baseConfig.output,
    failThreshold: options.failThreshold
      ? parseInt(options.failThreshold, 10)
      : baseConfig.failThreshold,
    categories: {
      'ai-slop': options.aiSlop === false ? false : (baseConfig.categories['ai-slop'] ?? true),
      'security': options.security === false ? false : (baseConfig.categories['security'] ?? true),
      'reliability': options.reliability === false ? false : (baseConfig.categories['reliability'] ?? true),
      'maintainability': options.maintainability === false ? false : (baseConfig.categories['maintainability'] ?? true),
      'production-readiness': options.productionReadiness === false ? false : (baseConfig.categories['production-readiness'] ?? true),
    },
  };

  if (options.maxCritical !== undefined) {
    config.maxIssues = { ...config.maxIssues, critical: parseInt(options.maxCritical, 10) };
  }
  if (options.maxHigh !== undefined) {
    config.maxIssues = { ...config.maxIssues, high: parseInt(options.maxHigh, 10) };
  }

  if (!ci && !options.quiet) {
    console.log(`\n${BOLD}clean-slop${RESET}  ${DIM}Production Readiness Engine${RESET}`);
    console.log(`${DIM}Scanning ${cwd}${RESET}\n`);
  }

  const scanOptions: ScanOptions = { config };
  if (!options.quiet && !ci) scanOptions.onFile = printProgress;

  const result = await scan(scanOptions);

  if (!ci && !options.quiet && process.stdout.isTTY) {
    clearLine();
  }

  // Generate report
  const reporterName = config.reporter as ReporterName;
  const reportContent = generate(result, reporterName);

  if (config.output) {
    await writeReport(reportContent, config.output);
    if (!options.quiet) {
      console.log(`${GREEN}Report written to ${config.output}${RESET}`);
    }
  } else {
    process.stdout.write(reportContent);
  }

  // Determine exit code
  let shouldFail = false;

  // Score threshold
  if (result.score.overall < config.failThreshold) {
    shouldFail = true;
  }

  // maxIssues per severity
  for (const [sev, max] of Object.entries(config.maxIssues)) {
    if (max === undefined) continue;
    const count = result.issues.filter((i) => i.severity === (sev as Severity)).length;
    if (count > max) {
      shouldFail = true;
      if (!options.quiet && !ci) {
        console.error(
          `${RED}${count} ${sev} issue${count !== 1 ? 's' : ''} found (max allowed: ${max})${RESET}`,
        );
      }
    }
  }

  if (shouldFail) {
    process.exit(1);
  }
}
