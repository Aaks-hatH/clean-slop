import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const DANGEROUS_CHILD_PROCESS = new Set([
  'exec',
  'execSync',
  'spawn',
  'spawnSync',
  'execFile',
  'execFileSync',
]);

function looksLikeChildProcessCall(node: ASTNode): boolean {
  const callee = node.callee as ASTNode | undefined;
  if (!callee) return false;

  if (callee.type === 'MemberExpression') {
    const prop = callee.property as ASTNode | undefined;
    if (prop?.type === 'Identifier') {
      return DANGEROUS_CHILD_PROCESS.has(String(prop.name));
    }
  }

  if (callee.type === 'Identifier') {
    return DANGEROUS_CHILD_PROCESS.has(String(callee.name));
  }

  return false;
}

function firstArgIsDynamic(node: ASTNode): boolean {
  const args = (node.arguments as ASTNode[] | undefined) ?? [];
  const first = args[0] as ASTNode | undefined;
  if (!first) return false;

  // Static strings are generally safe (though not always)
  if (first.type === 'Literal') return false;

  // Template literals with expressions are dangerous
  if (first.type === 'TemplateLiteral') {
    const expressions = (first.expressions as ASTNode[] | undefined) ?? [];
    return expressions.length > 0;
  }

  // Any other expression (variable, concatenation, function call) is suspicious
  return true;
}

const rule: Rule = {
  meta: {
    id: 'security/command-injection',
    name: 'Command Injection',
    category: 'security',
    severity: 'critical',
    confidence: 'high',
    description:
      'Detects child_process calls that build shell commands from variables, enabling command injection.',
    rationale:
      'Passing user-controlled data to exec(), spawn(), or similar APIs allows an attacker ' +
      'to inject shell metacharacters that execute arbitrary system commands.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/command-injection',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        if (!looksLikeChildProcessCall(node)) return;
        if (!firstArgIsDynamic(node)) return;

        const callee = node.callee as ASTNode;
        const prop = (
          callee.type === 'MemberExpression'
            ? (callee.property as ASTNode).name
            : (callee as ASTNode).name
        ) as string;

        context.report({
          message: `Possible command injection: dynamic argument passed to child_process.${prop}().`,
          explanation:
            `The first argument to ${prop}() appears to be dynamically constructed. ` +
            'If any part of this argument derives from external input, an attacker can inject ' +
            'shell metacharacters (e.g. ; rm -rf /) to execute arbitrary commands on the server.',
          impact:
            'Command injection on a server results in full system compromise: data theft, ' +
            'ransomware deployment, lateral movement, and persistent access.',
          location: getLocation(node, context.filePath),
          fix: {
            description:
              'Use execFile() or spawn() with an argument array instead of exec() with a shell string. ' +
              'Never pass user input to a shell command. Validate and whitelist all inputs.',
            code: "// Dangerous:\n// exec(`ls ${userInput}`)\n\n// Safe:\nimport { execFile } from 'child_process';\nexecFile('ls', [sanitizedPath], callback);",
          },
        });
      },
    });
  },
};

export default rule;
