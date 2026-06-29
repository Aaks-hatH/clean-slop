import path from 'path';
import type { Issue, ScanResult, Severity } from '../types.js';
import {
  BOLD,
  CYAN,
  DIM,
  GRAY,
  GREEN,
  RED,
  RESET,
  SEVERITY_COLORS,
  YELLOW,
} from '../utils/constants.js';

function pad(str: string, width: number): string {
  return str.padEnd(width);
}

function formatSeverity(severity: Severity): string {
  const color = SEVERITY_COLORS[severity] ?? '';
  const label = severity.toUpperCase().padEnd(8);
  return `${color}${label}${RESET}`;
}

function formatScore(score: number): string {
  if (score >= 90) return `${GREEN}${score}${RESET}`;
  if (score >= 70) return `${YELLOW}${score}${RESET}`;
  return `${RED}${score}${RESET}`;
}

function formatGrade(grade: string): string {
  if (grade === 'A') return `${GREEN}${grade}${RESET}`;
  if (grade === 'B') return `${GREEN}${grade}${RESET}`;
  if (grade === 'C') return `${YELLOW}${grade}${RESET}`;
  if (grade === 'D') return `${YELLOW}${grade}${RESET}`;
  return `${RED}${grade}${RESET}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatRelativePath(root: string, filePath: string): string {
  return path.relative(root, filePath);
}

function renderSeparator(char = '-', width = 80): string {
  return GRAY + char.repeat(width) + RESET;
}

function renderIssue(issue: Issue, root: string, verbose: boolean): string {
  const lines: string[] = [];

  const relPath = formatRelativePath(root, issue.location.file);
  const loc = `${relPath}:${issue.location.line}:${issue.location.column}`;

  lines.push(
    `  ${formatSeverity(issue.severity)} ${BOLD}${issue.message}${RESET}`,
  );
  lines.push(`  ${DIM}${loc}${RESET}  ${GRAY}[${issue.ruleId}]${RESET}`);

  if (verbose) {
    lines.push('');
    lines.push(`  ${DIM}${issue.explanation}${RESET}`);

    if (issue.impact) {
      lines.push('');
      lines.push(`  ${YELLOW}Impact:${RESET} ${issue.impact}`);
    }

    if (issue.snippet) {
      lines.push('');
      lines.push(
        issue.snippet
          .split('\n')
          .map((l) => `  ${GRAY}${l}${RESET}`)
          .join('\n'),
      );
    }

    if (issue.fix) {
      lines.push('');
      lines.push(`  ${CYAN}Fix:${RESET} ${issue.fix.description}`);
      if (issue.fix.code) {
        lines.push('');
        lines.push(
          issue.fix.code
            .split('\n')
            .map((l) => `    ${DIM}${l}${RESET}`)
            .join('\n'),
        );
      }
    }

    if (issue.docsUrl) {
      lines.push('');
      lines.push(`  ${DIM}${issue.docsUrl}${RESET}`);
    }
  }

  return lines.join('\n');
}

export function generateTextReport(result: ScanResult): string {
  const { score, issues, files, durationMs, config, root, version } = result;
  const verbose = config.verbose;
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(`${BOLD}clean-slop v${version}${RESET}  ${DIM}Production Readiness Engine${RESET}`);
  lines.push(renderSeparator('=', 80));
  lines.push('');

  // Files grouped by file path
  const fileGroups = new Map<string, Issue[]>();
  for (const issue of issues) {
    const key = issue.location.file;
    if (!fileGroups.has(key)) fileGroups.set(key, []);
    fileGroups.get(key)!.push(issue);
  }

  if (issues.length === 0) {
    lines.push(`${GREEN}No issues found.${RESET}`);
  } else {
    for (const [filePath, fileIssues] of fileGroups) {
      const relPath = formatRelativePath(root, filePath);
      lines.push(`${BOLD}${relPath}${RESET}`);
      lines.push(renderSeparator('-', 80));

      for (const issue of fileIssues) {
        lines.push(renderIssue(issue, root, verbose));
        lines.push('');
      }
    }
  }

  // Score card
  lines.push(renderSeparator('=', 80));
  lines.push(`${BOLD}Score Card${RESET}`);
  lines.push(renderSeparator('-', 80));

  for (const cat of score.categories) {
    const label = pad(cat.category, 24);
    const catScore = formatScore(cat.score);
    const counts = DIM +
      (cat.criticalCount > 0 ? `  ${cat.criticalCount} critical` : '') +
      (cat.highCount > 0 ? `  ${cat.highCount} high` : '') +
      (cat.mediumCount > 0 ? `  ${cat.mediumCount} medium` : '') +
      (cat.lowCount > 0 ? `  ${cat.lowCount} low` : '') +
      RESET;
    lines.push(`  ${label} ${catScore}/100${counts}`);
  }

  lines.push('');
  lines.push(
    `  ${pad('Overall Score', 24)} ${formatScore(score.overall)}/100   Grade: ${formatGrade(score.grade)}`,
  );
  lines.push('');

  // Summary
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;

  lines.push(renderSeparator('-', 80));
  lines.push(
    `  ${issues.length} issue${issues.length !== 1 ? 's' : ''} found across ${files.filter((f) => !f.skipped && !f.parseError).length} files` +
      `  (${formatDuration(durationMs)})`,
  );

  if (criticalCount > 0) lines.push(`  ${RED}${criticalCount} critical${RESET}`);
  if (highCount > 0) lines.push(`  ${YELLOW}${highCount} high${RESET}`);
  if (mediumCount > 0) lines.push(`  ${YELLOW}${mediumCount} medium${RESET}`);
  if (lowCount > 0) lines.push(`  ${DIM}${lowCount} low${RESET}`);

  lines.push('');

  if (score.productionReady) {
    lines.push(`  ${GREEN}PRODUCTION READY${RESET}  Score above threshold (${config.failThreshold})`);
  } else {
    lines.push(
      `  ${RED}NOT PRODUCTION READY${RESET}  Score ${score.overall} below threshold (${config.failThreshold})`,
    );
  }

  lines.push('');

  const parseErrors = files.filter((f) => f.parseError);
  if (parseErrors.length > 0) {
    lines.push(`${YELLOW}Parse errors in ${parseErrors.length} file(s):${RESET}`);
    for (const f of parseErrors) {
      lines.push(`  ${DIM}${f.file}: ${f.parseError}${RESET}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
