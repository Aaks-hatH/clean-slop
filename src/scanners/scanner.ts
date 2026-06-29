import fg from 'fast-glob';
import ignore from 'ignore';
import fs from 'fs/promises';
import path from 'path';
import isBinaryPath from 'is-binary-path';
import type {
  FileResult,
  Issue,
  ParsedFile,
  ResolvedConfig,
  RuleCategory,
  ScanResult,
} from '../types.js';
import { ParseError, parseSource } from '../parsers/source-parser.js';
import { RuleEngine } from '../rules/engine.js';
import { BUILT_IN_RULES } from '../rules/index.js';
import { computeGrade } from '../config/loader.js';
import { PACKAGE_VERSION } from '../version.js';
import { SEVERITY_ORDER } from '../utils/constants.js';

export interface ScanOptions {
  config: ResolvedConfig;
  onFile?: (filePath: string, index: number, total: number) => void;
  onIssue?: (issue: Issue) => void;
}

async function loadGitignore(root: string): Promise<ReturnType<typeof ignore>> {
  const ig = ignore();

  const gitignorePath = path.join(root, '.gitignore');
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore found; that's fine
  }

  return ig;
}

export async function discoverFiles(config: ResolvedConfig): Promise<string[]> {
  const files = await fg(config.include, {
    cwd: config.root,
    ignore: config.exclude,
    absolute: true,
    followSymbolicLinks: false,
    onlyFiles: true,
  });

  const ig = await loadGitignore(config.root);

  // Add user-specified ignore patterns
  if (config.ignorePatterns.length > 0) {
    ig.add(config.ignorePatterns);
  }

  return files.filter((f) => {
    if (isBinaryPath(f)) return false;

    const relative = path.relative(config.root, f);
    try {
      return !ig.ignores(relative);
    } catch {
      return true;
    }
  });
}

function buildEngine(config: ResolvedConfig): RuleEngine {
  const engine = new RuleEngine();
  engine.registerAll(BUILT_IN_RULES);
  return engine;
}

function computeScore(issues: Issue[], config: ResolvedConfig) {
  const categories: RuleCategory[] = [
    'ai-slop',
    'security',
    'reliability',
    'maintainability',
    'production-readiness',
  ];

  const categoryScores = categories.map((cat) => {
    const catIssues = issues.filter((i) => i.category === cat);

    // Weighted deduction per severity
    const deductions: Record<string, number> = {
      critical: 20,
      high: 10,
      medium: 4,
      low: 1,
      info: 0,
    };

    const totalDeduction = catIssues.reduce(
      (sum, i) => sum + (deductions[i.severity] ?? 0),
      0,
    );

    const raw = Math.max(0, 100 - totalDeduction);

    return {
      category: cat,
      score: raw,
      issueCount: catIssues.length,
      criticalCount: catIssues.filter((i) => i.severity === 'critical').length,
      highCount: catIssues.filter((i) => i.severity === 'high').length,
      mediumCount: catIssues.filter((i) => i.severity === 'medium').length,
      lowCount: catIssues.filter((i) => i.severity === 'low').length,
    };
  });

  const overall =
    categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length;

  const grade = computeGrade(overall);

  return {
    overall: Math.round(overall),
    categories: categoryScores,
    grade,
    productionReady: overall >= config.failThreshold && issues.filter((i) => i.severity === 'critical').length === 0,
  };
}

export async function scan(options: ScanOptions): Promise<ScanResult> {
  const { config, onFile } = options;
  const startTime = Date.now();

  const engine = buildEngine(config);

  const files = await discoverFiles(config);
  const fileResults: FileResult[] = [];
  const allIssues: Issue[] = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    if (!filePath) continue;

    onFile?.(filePath, i, files.length);

    let parsed: ParsedFile;
    let source: string;

    try {
      source = await fs.readFile(filePath, 'utf-8');

      // Skip empty files
      if (!source.trim()) {
        fileResults.push({ file: filePath, issues: [], skipped: true, skipReason: 'empty file' });
        continue;
      }

      // Skip very large files (> 2MB)
      if (source.length > 2_000_000) {
        fileResults.push({ file: filePath, issues: [], skipped: true, skipReason: 'file too large' });
        continue;
      }

      parsed = parseSource(filePath, source);
    } catch (err) {
      const parseError = err instanceof ParseError ? err.message : String(err);
      fileResults.push({ file: filePath, issues: [], parseError });
      continue;
    }

    const issues = engine.runOnFile(parsed, config);

    // Respect per-severity maxIssues cap across entire scan
    // (we track totals and stop reporting once caps are hit — deferred to reporter layer)
    const sortedIssues = issues.sort((a, b) => {
      return (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
    });

    fileResults.push({ file: filePath, issues: sortedIssues });
    allIssues.push(...sortedIssues);

    options.onIssue && sortedIssues.forEach(options.onIssue);
  }

  const score = computeScore(allIssues, config);

  return {
    root: config.root,
    timestamp: new Date().toISOString(),
    version: PACKAGE_VERSION,
    files: fileResults,
    issues: allIssues.sort(
      (a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0),
    ),
    score,
    durationMs: Date.now() - startTime,
    config,
  };
}
