import type { Rule } from '../../types.js';
import { traverse, getLocation, findAll } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

/**
 * Detects likely infinite loops:
 *   while (true) { ... } without a break or return
 *   for (;;) { ... } without a break or return
 *   for loops with no termination condition
 */

function hasExitStatement(body: ASTNode): boolean {
  const exits = findAll(body, 'BreakStatement');
  if (exits.length > 0) return true;

  const returns = findAll(body, 'ReturnStatement');
  if (returns.length > 0) return true;

  const throws = findAll(body, 'ThrowStatement');
  if (throws.length > 0) return true;

  return false;
}

function isLiteralTrue(node: ASTNode | null | undefined): boolean {
  if (!node) return false;
  return node.type === 'Literal' && node.value === true;
}

const rule: Rule = {
  meta: {
    id: 'reliability/infinite-loop',
    name: 'Potential Infinite Loop',
    category: 'reliability',
    severity: 'high',
    confidence: 'medium',
    description: 'Detects while(true) and for(;;) loops without reachable exit conditions.',
    rationale:
      'Infinite loops without an exit condition hang server processes, exhaust CPU, ' +
      'and cause denial of service. They are commonly introduced by AI-generated code ' +
      'that models polling or retry logic incorrectly.',
    docsUrl: 'https://clean-slop.dev/docs/rules/reliability/infinite-loop',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      WhileStatement(node: ASTNode) {
        const test = node.test as ASTNode | undefined;
        if (!isLiteralTrue(test)) return;

        const body = node.body as ASTNode | undefined;
        if (!body) return;

        if (!hasExitStatement(body)) {
          context.report({
            message: 'while(true) loop with no break, return, or throw detected.',
            explanation:
              'This while(true) loop has no reachable exit statement (break, return, or throw). ' +
              'It will run indefinitely, blocking the event loop or hanging a thread.',
            impact:
              'An infinite loop blocks the Node.js event loop, rendering the server completely ' +
              'unresponsive. This is an exploitable denial-of-service condition.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Add an explicit exit condition or convert to a recursive function with a base case. ' +
                'For polling, use setInterval() instead of an infinite loop.',
            },
          });
        }
      },

      ForStatement(node: ASTNode) {
        // for(;;) - no test expression
        const test = node.test as ASTNode | undefined | null;
        if (test !== null && test !== undefined) return;

        const body = node.body as ASTNode | undefined;
        if (!body) return;

        if (!hasExitStatement(body)) {
          context.report({
            message: 'for(;;) loop with no break, return, or throw detected.',
            explanation:
              'This for(;;) loop has no termination condition and no exit statement. ' +
              'It will run indefinitely.',
            impact: 'Blocks the Node.js event loop and causes complete server unresponsiveness.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Add a break condition or convert to a while loop with an explicit termination check.',
            },
          });
        }
      },
    });
  },
};

export default rule;
