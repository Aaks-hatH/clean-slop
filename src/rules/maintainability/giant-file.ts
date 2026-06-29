import type { Rule } from '../../types.js';

const MAX_LINES = 400;
const EXTREME_LINES = 1000;

const rule: Rule = {
  meta: {
    id: 'maintainability/giant-file',
    name: 'Giant File',
    category: 'maintainability',
    severity: 'medium',
    confidence: 'certain',
    description: `Detects source files exceeding ${MAX_LINES} lines.`,
    rationale:
      'Large files concentrate unrelated logic, creating merge conflicts, slow code review, ' +
      'and unclear ownership. They are a common artifact of AI code generation that did not ' +
      'decompose responsibilities into modules.',
    docsUrl: 'https://clean-slop.dev/docs/rules/maintainability/giant-file',
    fixable: false,
  },

  create(context) {
    const lineCount = context.source.split('\n').length;

    if (lineCount <= MAX_LINES) return;

    const isExtreme = lineCount > EXTREME_LINES;

    context.report({
      message: `File is ${lineCount} lines long (limit: ${MAX_LINES}).`,
      explanation:
        `This file contains ${lineCount} lines. Files this large violate the single-responsibility ` +
        'principle and make it difficult for contributors to understand the module boundaries.',
      impact: isExtreme
        ? 'Extremely large files cause slow IDE performance, painful code reviews, and high ' +
          'cognitive load. They are effectively unmaintainable.'
        : 'Large files slow code review and increase the chance that related changes land in ' +
          'the wrong file, leading to tangled responsibility.',
      location: {
        file: context.filePath,
        line: 1,
        column: 0,
      },
      fix: {
        description:
          'Split the file into focused modules. ' +
          'Group related functions into a dedicated file. ' +
          'A file should do one thing and export a cohesive set of related functionality.',
      },
      metadata: { lineCount },
    });
  },
};

export default rule;
