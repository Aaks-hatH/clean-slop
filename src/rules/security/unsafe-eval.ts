import type { Rule } from '../../types.js';
import { traverse, getLocation, getCalleeName } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const DANGEROUS_EVAL_APIS = new Set([
  'eval',
  'Function',
  'execScript',
]);

const rule: Rule = {
  meta: {
    id: 'security/unsafe-eval',
    name: 'Unsafe eval / Function Constructor',
    category: 'security',
    severity: 'critical',
    confidence: 'high',
    description: 'Detects use of eval() and the Function constructor, which execute arbitrary code.',
    rationale:
      'eval() and new Function() execute strings as JavaScript code. When any part of the ' +
      'string comes from user input or external data, this is a code injection vulnerability.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/unsafe-eval',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        const name = getCalleeName(node);
        if (name && DANGEROUS_EVAL_APIS.has(name)) {
          context.report({
            message: `Unsafe use of ${name}().`,
            explanation:
              `${name}() evaluates its argument as JavaScript code at runtime. ` +
              'If any part of the evaluated string is derived from external data, ' +
              'an attacker can inject and execute arbitrary code.',
            impact:
              'Code injection via eval is one of the highest-severity vulnerabilities in web applications. ' +
              'It allows complete application compromise, data exfiltration, and remote code execution.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Replace eval() with explicit logic. ' +
                'If you need to parse JSON, use JSON.parse(). ' +
                'If you need dynamic behavior, use a lookup table or strategy pattern.',
            },
          });
        }
      },

      NewExpression(node: ASTNode) {
        const callee = node.callee as ASTNode | undefined;
        if (callee?.type === 'Identifier' && callee.name === 'Function') {
          context.report({
            message: 'Unsafe use of new Function() constructor.',
            explanation:
              'new Function() constructs and executes JavaScript from a string at runtime. ' +
              'This is functionally equivalent to eval() and shares the same injection risks.',
            impact:
              'Allows arbitrary code execution if the string argument contains any external data. ' +
              'Bypasses Content Security Policy directives and static analysis.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Eliminate the dynamic code construction. ' +
                'Use explicit functions, closures, or a sandboxed evaluation library (e.g., vm2) ' +
                'if dynamic execution is genuinely required.',
            },
          });
        }
      },
    });
  },
};

export default rule;
