import { parse } from '@typescript-eslint/typescript-estree';
import fs from 'fs/promises';
import path from 'path';
import type { Language, ParsedFile } from '../types.js';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

function detectLanguage(filePath: string): Language {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'tsx';
    case '.jsx':
      return 'jsx';
    default:
      return 'javascript';
  }
}

function isTypeScriptLike(language: Language): boolean {
  return language === 'typescript' || language === 'tsx';
}

export async function parseFile(filePath: string): Promise<ParsedFile> {
  const source = await fs.readFile(filePath, 'utf-8');
  return parseSource(filePath, source);
}

export function parseSource(filePath: string, source: string): ParsedFile {
  const language = detectLanguage(filePath);

  try {
    const ast = parse(source, {
      jsx: language === 'jsx' || language === 'tsx',
      tsx: language === 'tsx',
      loc: true,
      range: true,
      comment: true,
      tokens: false,
      errorOnUnknownASTType: false,
      allowInvalidAST: true,
      suppressDeprecatedPropertyWarnings: true,
    });

    return { filePath, source, ast, language };
  } catch (err) {
    // Try again without TypeScript-specific syntax for JS files
    if (!isTypeScriptLike(language)) {
      try {
        const ast = parse(source, {
          jsx: language === 'jsx',
          loc: true,
          range: true,
          comment: true,
          tokens: false,
          errorOnUnknownASTType: false,
          allowInvalidAST: true,
          suppressDeprecatedPropertyWarnings: true,
        });
        return { filePath, source, ast, language };
      } catch {
        // Fall through to the original error
      }
    }

    const message =
      err instanceof Error
        ? err.message
        : 'Unknown parse error';

    throw new ParseError(
      `Failed to parse ${filePath}: ${message}`,
      filePath,
      err,
    );
  }
}

export function extractSnippet(
  source: string,
  line: number,
  contextLines = 2,
): string {
  const lines = source.split('\n');
  const start = Math.max(0, line - 1 - contextLines);
  const end = Math.min(lines.length, line + contextLines);

  return lines
    .slice(start, end)
    .map((l, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === line ? '>' : ' ';
      return `${marker} ${String(lineNum).padStart(4, ' ')} | ${l}`;
    })
    .join('\n');
}
