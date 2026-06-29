import fs from 'fs/promises';
import path from 'path';
import type { ScanResult } from '../types.js';
import { generateTextReport } from './text-reporter.js';
import { generateJsonReport } from './json-reporter.js';
import { generateMarkdownReport } from './markdown-reporter.js';
import { generateSarifReport } from './sarif-reporter.js';
import { generateHtmlReport } from './html-reporter.js';

export type ReporterName = 'text' | 'json' | 'html' | 'markdown' | 'sarif';

export function generate(
  result: ScanResult,
  reporter: ReporterName = 'text',
): string {
  switch (reporter) {
    case 'json':
      return generateJsonReport(result);
    case 'html':
      return generateHtmlReport(result);
    case 'markdown':
      return generateMarkdownReport(result);
    case 'sarif':
      return generateSarifReport(result);
    case 'text':
    default:
      return generateTextReport(result);
  }
}

export async function writeReport(
  content: string,
  outputPath: string,
): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, content, 'utf-8');
}
