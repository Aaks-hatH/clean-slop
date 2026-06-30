import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

/**
 * Detects patterns that may allow prototype pollution:
 *   obj[userInput] = value           // bracket assignment with variable key
 *   Object.assign(target, userInput) // merging untrusted object
 *   _.merge(target, userInput)       // lodash merge with untrusted object
 */

const MERGE_FUNCTIONS = new Set([
  'Object.assign',
  '_.merge',
  '_.extend',
  '_.defaultsDeep',
  'merge',
  'deepMerge',
  'deepExtend',
]);

function getFullCalleeName(node: ASTNode): string | null {
  const callee = node.callee as ASTNode | undefined;
  if (!callee) return null;

  if (callee.type === 'Identifier') return String(callee.name);

  if (callee.type === 'MemberExpression') {
    const obj = callee.object as ASTNode | undefined;
    const prop = callee.property as ASTNode | undefined;

    if (obj?.type === 'Identifier' && prop?.type === 'Identifier') {
      return `${obj.name}.${prop.name}`;
    }
  }

  return null;
}

const rule: Rule = {
  meta: {
    id: 'security/prototype-pollution',
    name: 'Prototype Pollution',
    category: 'security',
    severity: 'high',
    confidence: 'medium',
    description: 'Detects patterns that may allow attackers to pollute Object.prototype.',
    rationale:
      'Prototype pollution allows an attacker to inject properties into Object.prototype, ' +
      'affecting all objects in the application. This can bypass security checks, cause denial ' +
      'of service, or enable remote code execution.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/prototype-pollution',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      // Detect: obj[variable] = value where variable could be __proto__
      AssignmentExpression(node: ASTNode) {
        const left = node.left as ASTNode | undefined;
        if (!left) return;

        if (left.type !== 'MemberExpression') return;
        if (!left.computed) return; // only bracket notation

        const prop = left.property as ASTNode | undefined;
        if (!prop) return;

        // Static string keys that are dangerous
        if (prop.type === 'Literal') {
          const key = String(prop.value);
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            context.report({
              message: `Assignment to dangerous property "${key}" may cause prototype pollution.`,
              explanation:
                `Assigning to obj["${key}"] can modify Object.prototype when "obj" is a ` +
                'user-controlled JSON payload or when the key is not validated.',
              impact:
                'Prototype pollution can override security checks that compare against default values, ' +
                'corrupt application state, and in some environments enable code execution.',
              location: getLocation(node, context.filePath),
              fix: {
                description:
                  'Never assign to __proto__, constructor, or prototype from external input. ' +
                  'Validate object keys against an allowlist before assignment.',
              },
            });
          }
        } else {
          // Dynamic key - report as potential issue
          context.report({
            message:
              'Dynamic bracket assignment may allow prototype pollution if key is not validated.',
            explanation:
              'Writing to obj[dynamicKey] with an unvalidated key allows an attacker to set ' +
              '__proto__ or constructor, polluting Object.prototype for all objects.',
            impact:
              'If the key comes from user-controlled input (query params, JSON body, headers), ' +
              'this is an exploitable prototype pollution vulnerability.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Validate the key against an allowlist before assignment: ' +
                'if (ALLOWED_KEYS.has(key)) obj[key] = value; ' +
                'Or use Object.create(null) for dictionary objects.',
            },
          });
        }
      },

      // Detect Object.assign(target, untrustedSource) and lodash merge
      CallExpression(node: ASTNode) {
        const name = getFullCalleeName(node);
        if (!name || !MERGE_FUNCTIONS.has(name)) return;

        const args = (node.arguments as ASTNode[] | undefined) ?? [];
        if (args.length < 2) return;

        // The second argument is the source - if it comes from a variable (not a literal), flag it
        const source = args[1] as ASTNode;
        if (source.type !== 'ObjectExpression') {
          context.report({
            message: `${name}() with a non-literal source may introduce prototype pollution.`,
            explanation:
              `${name}() recursively copies properties from the source object. ` +
              'If the source derives from user input and contains __proto__ or constructor keys, ' +
              "it will pollute the target object's prototype chain.",
            impact:
              'All objects in the application share Object.prototype. Polluting it can ' +
              'override security-relevant default values and cause widespread application misbehavior.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                `Sanitize the source before passing it to ${name}(). ` +
                'Use a library like defu or structuredClone with property filtering, ' +
                'or validate the source against a schema before merging.',
            },
          });
        }
      },
    });
  },
};

export default rule;
