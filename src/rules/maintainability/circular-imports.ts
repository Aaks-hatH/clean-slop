import type { Rule } from '../../types.js';
import { findAll } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';
import path from 'path';

/**
 * Single-file circular import detection.
 *
 * Full circular import detection requires a multi-file graph analysis phase.
 * This rule performs single-file analysis: it flags when a file imports from
 * a path that also appears as an export target (barrel imports that re-export
 * the importer), which is a common source of circular dependencies.
 */

const rule: Rule = {
  meta: {
    id: 'maintainability/circular-imports',
    name: 'Potential Circular Import',
    category: 'maintainability',
    severity: 'medium',
    confidence: 'low',
    description:
      'Identifies import patterns that commonly cause circular dependency cycles.',
    rationale:
      'Circular imports cause initialization order issues, undefined module exports at ' +
      'runtime, and confusing bugs that differ between bundlers. They are a sign of ' +
      'poor module boundary design.',
    docsUrl: 'https://clean-slop.dev/docs/rules/maintainability/circular-imports',
    fixable: false,
  },

  create(context) {
    const dir = path.dirname(context.filePath);
    const base = path.basename(context.filePath, path.extname(context.filePath));

    // Find all import declarations
    const imports = findAll(context.ast, 'ImportDeclaration');

    for (const imp of imports) {
      const src = imp.source as ASTNode | undefined;
      if (!src || src.type !== 'Literal') continue;

      const importPath = String(src.value);
      if (!importPath.startsWith('.')) continue;

      // Resolve the imported path
      const resolved = path.resolve(dir, importPath);
      const resolvedBase = path.basename(resolved);

      // Flag index imports from the same directory (classic barrel self-import)
      if (
        resolvedBase === 'index' &&
        path.dirname(resolved) === dir &&
        base !== 'index'
      ) {
        context.report({
          message: `Import from "${importPath}" may create a circular dependency.`,
          explanation:
            `This file imports from "${importPath}", which is the index barrel of the same directory. ` +
            'If the index file re-exports this module, a circular dependency exists.',
          impact:
            'Circular dependencies can cause modules to initialize with undefined exports, ' +
            'leading to hard-to-debug runtime errors that only appear in specific import orders.',
          location: {
            file: context.filePath,
            line: imp.loc?.start.line ?? 1,
            column: imp.loc?.start.column ?? 0,
          },
          fix: {
            description:
              'Import directly from the source module rather than through the barrel index. ' +
              "Instead of `import { foo } from './index'`, use `import { foo } from './foo'`.",
          },
        });
      }
    }
  },
};

export default rule;
