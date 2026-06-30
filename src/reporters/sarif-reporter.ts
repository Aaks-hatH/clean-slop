import path from 'path';
import type { Issue, ScanResult, Severity } from '../types.js';
import { PACKAGE_VERSION } from '../version.js';

/**
 * SARIF 2.1.0 reporter
 * https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 *
 * Compatible with:
 * - GitHub Code Scanning
 * - VS Code SARIF Viewer
 * - Azure DevOps
 */

type SarifLevel = 'error' | 'warning' | 'note' | 'none';

function severityToSarifLevel(severity: Severity): SarifLevel {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'note';
    case 'info':
      return 'none';
  }
}

function toSarifSecuritySeverity(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return '9.5';
    case 'high':
      return '7.5';
    case 'medium':
      return '5.0';
    case 'low':
      return '2.5';
    case 'info':
      return '0.0';
  }
}

function fileUri(filePath: string): string {
  // Convert to file:// URI
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
}

export function generateSarifReport(result: ScanResult): string {
  const { issues, root } = result;

  // Collect unique rules
  const ruleMap = new Map<string, Issue>();
  for (const issue of issues) {
    if (!ruleMap.has(issue.ruleId)) {
      ruleMap.set(issue.ruleId, issue);
    }
  }

  const sarifRules = Array.from(ruleMap.values()).map((issue) => ({
    id: issue.ruleId,
    name: issue.ruleName.replace(/\s+/g, ''),
    shortDescription: {
      text: issue.message,
    },
    fullDescription: {
      text: issue.explanation,
    },
    help: {
      text: issue.fix?.description ?? 'See documentation for details.',
      markdown: issue.fix?.code
        ? `${issue.fix.description}\n\n\`\`\`javascript\n${issue.fix.code}\n\`\`\``
        : (issue.fix?.description ?? 'See documentation for details.'),
    },
    helpUri: issue.docsUrl ?? `https://clean-slop.dev/docs/rules/${issue.ruleId}`,
    properties: {
      tags: [issue.category],
      'security-severity': toSarifSecuritySeverity(issue.severity),
      precision: issue.confidence === 'certain' ? 'very-high' : issue.confidence,
      'problem.severity': issue.severity,
    },
  }));

  const sarifResults = issues.map((issue) => ({
    ruleId: issue.ruleId,
    level: severityToSarifLevel(issue.severity),
    message: {
      text: `${issue.message}\n\n${issue.explanation}${issue.impact ? `\n\nImpact: ${issue.impact}` : ''}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: path.relative(root, issue.location.file).replace(/\\/g, '/'),
            uriBaseId: '%SRCROOT%',
          },
          region: {
            startLine: issue.location.line,
            startColumn: issue.location.column + 1,
            endLine: issue.location.endLine ?? issue.location.line,
            endColumn: (issue.location.endColumn ?? issue.location.column) + 1,
          },
        },
      },
    ],
    partialFingerprints: {
      primaryLocationLineHash: Buffer.from(
        `${issue.ruleId}:${issue.location.file}:${issue.location.line}`,
      ).toString('base64'),
    },
    properties: {
      confidence: issue.confidence,
      category: issue.category,
    },
  }));

  const sarif = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'clean-slop',
            version: PACKAGE_VERSION,
            informationUri: 'https://github.com/clean-slop/clean-slop',
            semanticVersion: PACKAGE_VERSION,
            rules: sarifRules,
          },
        },
        originalUriBaseIds: {
          '%SRCROOT%': {
            uri: fileUri(root) + '/',
          },
        },
        results: sarifResults,
        columnKind: 'utf16CodeUnits',
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
