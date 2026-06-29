import type { Rule } from '../../types.js';
import { traverse, getLocation, cyclomaticComplexity, isFunctionNode } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const COMPLEXITY_THRESHOLD = 10;
const COMPLEXITY_HIGH = 20;

const rule: Rule = {
  meta: {
    id: 'ai-slop/high-complexity',
    name: 'High Cyclomatic Complexity',
    category: 'ai-slop',
    severity: 'medium',
    confidence: 'certain',
    description: `Detects functions with cyclomatic complexity exceeding ${COMPLEXITY_THRESHOLD}.`,
    rationale:
      'High complexity is a reliable indicator of AI-generated code that concatenated ' +
      'multiple responsibilities into a single function. Complex functions are difficult to test ' +
      'and almost impossible to reason about correctly.',
    docsUrl: 'https://clean-slop.dev/docs/rules/ai-slop/high-complexity',
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

      const complexity = cyclomaticComplexity(node);
      if (complexity <= COMPLEXITY_THRESHOLD) return;

      const idNode = node.id as ASTNode | undefined;
      const name = idNode ? String(idNode.name) : '<anonymous>';
      const isHigh = complexity >= COMPLEXITY_HIGH;

      context.report({
        message: `Function "${name}" has cyclomatic complexity of ${complexity} (limit: ${COMPLEXITY_THRESHOLD}).`,
        explanation:
          `Cyclomatic complexity measures the number of independent paths through code. ` +
          `A complexity of ${complexity} means this function has at least ${complexity} independent ` +
          'execution paths that all need to be understood and tested.',
        impact:
          isHigh
            ? 'Extreme complexity. This function cannot be reliably tested or maintained. ' +
              'Defects introduced here will be very difficult to locate.'
            : 'High complexity makes this function difficult to test thoroughly. ' +
              'Each untested path is a potential production defect.',
        location: getLocation(node, context.filePath),
        fix: {
          description:
            'Extract independent logic branches into well-named helper functions. ' +
            'Aim for functions with complexity under 5. Consider strategy or command patterns ' +
            'for functions that switch on a type discriminant.',
        },
        metadata: { complexity },
      });
    }
  },
};

export default rule;
