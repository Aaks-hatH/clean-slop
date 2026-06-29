import process from 'process';
import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import { loadConfig } from '../../config/loader.js';
import { BUILT_IN_RULES } from '../../rules/index.js';
import {
  BOLD, CYAN, DIM, GREEN, RED, RESET, YELLOW,
} from '../../utils/constants.js';
import { PACKAGE_VERSION } from '../../version.js';

function check(label: string, ok: boolean, detail?: string): void {
  const icon = ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const msg = detail ? `  ${icon}  ${label}  ${DIM}${detail}${RESET}` : `  ${icon}  ${label}`;
  console.log(msg);
}

function warn(label: string, detail?: string): void {
  const msg = detail
    ? `  ${YELLOW}!${RESET}  ${label}  ${DIM}${detail}${RESET}`
    : `  ${YELLOW}!${RESET}  ${label}`;
  console.log(msg);
}

function info(label: string, detail?: string): void {
  const msg = detail
    ? `  ${CYAN}i${RESET}  ${label}  ${DIM}${detail}${RESET}`
    : `  ${CYAN}i${RESET}  ${label}`;
  console.log(msg);
}

function getNodeVersion(): string {
  return process.version;
}

function meetsNodeMinimum(): boolean {
  const [major] = process.version.replace('v', '').split('.').map(Number);
  return (major ?? 0) >= 18;
}

function getNpmVersion(): string | null {
  try {
    return execSync('npm --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

export async function runDoctor(): Promise<void> {
  const cwd = process.cwd();

  console.log(`\n${BOLD}clean-slop doctor${RESET}\n`);
  console.log(`${DIM}Diagnosing environment and configuration...${RESET}\n`);

  // --- Environment ---
  console.log(`${BOLD}Environment${RESET}`);
  const nodeVersion = getNodeVersion();
  const nodeOk = meetsNodeMinimum();
  check('Node.js version', nodeOk, `${nodeVersion} (requires >= 18)`);

  const npmVersion = getNpmVersion();
  check('npm available', npmVersion !== null, npmVersion ?? 'not found');

  info('Platform', process.platform);
  info('Architecture', process.arch);
  info('clean-slop version', PACKAGE_VERSION);
  console.log();

  // --- Configuration ---
  console.log(`${BOLD}Configuration${RESET}`);

  let config;
  try {
    config = await loadConfig(cwd);
    check('Configuration loaded', true, `root: ${config.root}`);
    info('Fail threshold', `${config.failThreshold}/100`);
    info('Reporter', config.reporter);
    info('Output', config.output ?? 'stdout');

    const enabledCategories = Object.entries(config.categories)
      .filter(([, v]) => v)
      .map(([k]) => k);
    info('Enabled categories', enabledCategories.join(', '));

    const ruleOverrides = Object.keys(config.rules).length;
    info('Rule overrides', `${ruleOverrides}`);
  } catch (err) {
    check('Configuration loaded', false, err instanceof Error ? err.message : String(err));
  }
  console.log();

  // --- Project ---
  console.log(`${BOLD}Project${RESET}`);

  const pkgPath = path.join(cwd, 'package.json');
  try {
    const raw = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    check('package.json found', true, String(pkg.name ?? '(no name)'));

    const allDeps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };

    const hasTs = 'typescript' in allDeps;
    info('TypeScript project', String(hasTs));
  } catch {
    check('package.json found', false, 'Could not read package.json');
  }

  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  try {
    await fs.access(tsconfigPath);
    check('tsconfig.json found', true);
  } catch {
    warn('tsconfig.json not found', 'TypeScript projects should include tsconfig.json');
  }

  const gitPath = path.join(cwd, '.git');
  try {
    await fs.access(gitPath);
    check('Git repository', true);
  } catch {
    warn('Not a git repository', 'clean-slop works best in a git repository');
  }

  const gitignorePath = path.join(cwd, '.gitignore');
  try {
    await fs.access(gitignorePath);
    check('.gitignore found', true);
  } catch {
    warn('.gitignore not found', 'Add a .gitignore to exclude build artifacts');
  }

  console.log();

  // --- Rules ---
  console.log(`${BOLD}Rules${RESET}`);
  info('Built-in rules loaded', `${BUILT_IN_RULES.length}`);

  const byCategory = new Map<string, number>();
  for (const rule of BUILT_IN_RULES) {
    byCategory.set(rule.meta.category, (byCategory.get(rule.meta.category) ?? 0) + 1);
  }
  for (const [cat, count] of byCategory) {
    info(`  ${cat}`, `${count} rules`);
  }

  console.log();

  // --- Summary ---
  if (!meetsNodeMinimum()) {
    console.log(
      `${RED}Node.js >= 18 is required. Please upgrade your Node.js installation.${RESET}\n`,
    );
    process.exit(1);
  }

  console.log(`${GREEN}Environment looks good.${RESET}\n`);
}
