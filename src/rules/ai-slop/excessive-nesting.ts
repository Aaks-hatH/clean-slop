import type { Rule } from '../../types.js';
import { traverse, getLocation, maxNestingDepth, isFunctionNode } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const MAX_DEPTH = 4;

const rule: Rule = {
  meta: {
    id: 'ai-slop/excessive-nesting',
    name: 'Excessive Nesting',
    category: 'ai-slop',
    severity: 'medium',
    confidence: 'certain',
    description: `Detects functions with control-flow nesting deeper than ${MAX_DEPTH} levels.`,
    rationale:
      'Deeply nested code is a strong sign of AI-generated logic that was not refactored. ' +
      'Early returns, guard clauses, and extracted helper functions eliminate deep nesting.',
    docsUrl: 'https://clean-slop.dev/docs/rules/ai-slop/excessive-nesting',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    });

    function checkFunction(node: ASTNode): void {
      if (!isFunctionNode(node)) return;

      const depth = maxNestingDepth(node.body as unknown, 0);
      if (depth <= MAX_DEPTH) return;

      const idNode = node.id as ASTNode | undefined;
      const name = idNode ? String(idNode.name) : '<anonymous>';

      context.report({
        message: `Function "${name}" has nesting depth of ${depth} (limit: ${MAX_DEPTH}).`,
        explanation:
          `This function contains ${depth} levels of nested blocks. ` +
          'Each additional level of nesting makes logic exponentially harder to follow.',
        impact:
          'Deeply nested code is error-prone, difficult to test, and nearly impossible to review. ' +
          'Bugs introduced in deep nesting often escape code review.',
        location: getLocation(node, context.filePath),
        fix: {
          description:
            'Use early returns to flatten nesting. Extract deeply-nested logic into named helper functions. ' +
            'Consider inversion of conditions to reduce if/else chains.',
        },
        metadata: { depth },
      });
    }
  },
};

export default rule;
