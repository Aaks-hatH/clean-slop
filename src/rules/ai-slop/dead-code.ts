import type { Rule } from '../../types.js';
import { findAll, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const rule: Rule = {
  meta: {
    id: 'ai-slop/dead-code',
    name: 'Dead Code After Return',
    category: 'ai-slop',
    severity: 'medium',
    confidence: 'certain',
    description:
      'Detects unreachable code that follows a return, throw, break, or continue statement.',
    rationale:
      'Dead code after early exits is a common artifact of AI code generation. It indicates ' +
      'that the generator added logic without tracking control flow, producing code that never executes.',
    docsUrl: 'https://clean-slop.dev/docs/rules/ai-slop/dead-code',
    fixable: true,
  },

  create(context) {
    const terminatingTypes = new Set([
      'ReturnStatement',
      'ThrowStatement',
      'BreakStatement',
      'ContinueStatement',
    ]);

    // Find all block statements
    const blocks = findAll(context.ast, 'BlockStatement');

    for (const block of blocks) {
      const statements = (block as ASTNode & { body?: ASTNode[] }).body ?? [];

      for (let i = 0; i < statements.length - 1; i++) {
        const stmt = statements[i];
        if (!stmt) continue;

        if (terminatingTypes.has(stmt.type)) {
          const nextStmt = statements[i + 1];
          if (!nextStmt) continue;

          // Don't flag the closing statement of an else chain
          if (nextStmt.type === 'IfStatement') continue;

          context.report({
            message: `Unreachable code after ${stmt.type}.`,
            explanation:
              `The statement at this line is unreachable because a ${stmt.type} on the previous line ` +
              'will always exit this block before this code can execute.',
            impact:
              'Dead code bloats the bundle, misleads maintainers, and indicates logic errors. ' +
              'Code that was intended to run but is unreachable represents a latent bug.',
            location: getLocation(nextStmt, context.filePath),
            fix: {
              description:
                'Remove the unreachable code. If it was intended to run, move it before the terminating statement.',
            },
          });

          // Only report the first occurrence per block to avoid noise
          break;
        }
      }
    }
  },
};

export default rule;
