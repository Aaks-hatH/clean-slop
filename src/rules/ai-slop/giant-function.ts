import type { Rule } from '../../types.js';
import { traverse, getLocation, countFunctionLines, isFunctionNode } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const MAX_LINES = 80;

const rule: Rule = {
  meta: {
    id: 'ai-slop/giant-function',
    name: 'Giant Function',
    category: 'ai-slop',
    severity: 'medium',
    confidence: 'certain',
    description: `Detects functions exceeding ${MAX_LINES} lines, a common sign of AI-generated monoliths.`,
    rationale:
      'AI code generators tend to dump entire workflows into single functions without decomposing ' +
      'them. Functions longer than 80 lines are difficult to understand, test, and maintain.',
    docsUrl: 'https://clean-slop.dev/docs/rules/ai-slop/giant-function',
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

      const lines = countFunctionLines(node);
      if (lines <= MAX_LINES) return;

      const idNode = node.id as ASTNode | undefined;
      const name = idNode ? String(idNode.name) : '<anonymous>';

      context.report({
        message: `Function "${name}" is ${lines} lines long (limit: ${MAX_LINES}).`,
        explanation:
          `This function is ${lines} lines long. Long functions are a strong indicator of ` +
          'AI-generated code that placed all logic in one place without decomposition.',
        impact:
          'Giant functions are untestable, unreadable, and violate the single-responsibility principle. ' +
          'They make bug-fixing and code review slow and error-prone.',
        location: getLocation(node, context.filePath),
        fix: {
          description:
            'Break the function into smaller, focused functions. ' +
            'Aim for functions under 40 lines that do one thing well.',
        },
        metadata: {
          lines,
        },
      });
    }
  },
};

export default rule;
