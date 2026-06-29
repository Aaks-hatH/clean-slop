import type { Rule } from '../../types.js';
import type { ASTNode } from '../../utils/ast.js';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'API Key',
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/i,
    description: 'hardcoded API key',
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/,
    description: 'AWS access key ID',
  },
  {
    name: 'AWS Secret',
    pattern: /aws[_-]?secret[_-]?(?:access[_-]?)?key\s*[:=]\s*['"][^'"]{20,}['"]/i,
    description: 'AWS secret access key',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
    description: 'PEM private key',
  },
  {
    name: 'Password',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    description: 'hardcoded password',
  },
  {
    name: 'JWT Secret',
    pattern: /(?:jwt[_-]?secret|token[_-]?secret)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    description: 'hardcoded JWT signing secret',
  },
  {
    name: 'Database URL',
    pattern: /(?:mongo(?:db)?|postgres(?:ql)?|mysql|redis):\/\/[^:'"]+:[^@'"]+@/i,
    description: 'database connection string with credentials',
  },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|token)\s*[:=]\s*['"][a-zA-Z0-9+/=_-]{20,}['"]/i,
    description: 'hardcoded secret or token',
  },
  {
    name: 'GitHub Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    description: 'GitHub personal access token',
  },
  {
    name: 'Stripe Key',
    pattern: /(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{24,}/,
    description: 'Stripe API key',
  },
];

// Strings that indicate the value is a placeholder, not a real secret
const PLACEHOLDER_PATTERNS = [
  /^(?:your[-_]?)?(?:api[-_]?)?(?:key|secret|token|password)$/i,
  /^<.+>$/,
  /^xxx/i,
  /^placeholder/i,
  /^\*+$/,
  /^test$/i,
  /^example$/i,
  /^change[-_]?me/i,
  /process\.env\./,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

const rule: Rule = {
  meta: {
    id: 'security/hardcoded-secrets',
    name: 'Hardcoded Secrets',
    category: 'security',
    severity: 'critical',
    confidence: 'high',
    description: 'Detects API keys, passwords, tokens, and secrets hardcoded in source files.',
    rationale:
      'Hardcoded credentials are one of the most common causes of security breaches. ' +
      'When code is committed to version control, credentials are permanently exposed ' +
      'in history even if removed later.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/hardcoded-secrets',
    fixable: false,
  },

  create(context) {
    const lines = context.source.split('\n');

    lines.forEach((line, index) => {
      for (const { name, pattern, description } of SECRET_PATTERNS) {
        if (!pattern.test(line)) continue;

        // Try to extract the value portion and check if it is a placeholder
        const valueMatch = line.match(/[:=]\s*['"]([^'"]+)['"]/);
        if (valueMatch && valueMatch[1] && isPlaceholder(valueMatch[1])) continue;

        context.report({
          message: `Possible hardcoded ${name} detected.`,
          explanation:
            `A potential ${description} was found hardcoded in source. ` +
            'Credentials in source files are committed to version control and accessible to anyone ' +
            'with repository access, including in private repositories through history and forks.',
          impact:
            'Exposed credentials can be used to access cloud infrastructure, databases, and third-party services. ' +
            'Even after removal, they remain in git history. Rotation is required immediately.',
          location: {
            file: context.filePath,
            line: index + 1,
            column: 0,
          },
          fix: {
            description:
              'Remove the credential from source. Store secrets in environment variables (process.env.SECRET_NAME) ' +
              'or a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler). ' +
              'Rotate the exposed credential immediately.',
            code: "const apiKey = process.env.API_KEY;\nif (!apiKey) throw new Error('API_KEY environment variable is required.');",
          },
        });

        // One report per line is enough
        break;
      }
    });

    // Also check string literals in the AST for patterns that line-scanning might miss
    traverse(context.ast, {
      Literal(node: ASTNode) {
        if (typeof node.value !== 'string') return;
        const val: string = node.value;

        if (val.length < 20) return;
        if (isPlaceholder(val)) return;

        for (const { name, pattern, description } of SECRET_PATTERNS) {
          if (pattern.test(val)) {
            context.report({
              message: `String literal appears to be a hardcoded ${name}.`,
              explanation:
                `The string "${val.slice(0, 8)}..." matches a pattern for a ${description}. ` +
                'Hardcoding credentials in string literals exposes them in source control.',
              impact:
                'Immediate rotation of the credential is required. All historical commits ' +
                'containing this value must be treated as compromised.',
              location: getLocation(node, context.filePath),
              fix: {
                description:
                  'Replace with an environment variable reference: process.env.SECRET_NAME',
              },
            });
            break;
          }
        }
      },
    });

    function traverse(ast: unknown, visitor: Record<string, (n: ASTNode) => void>): void {
      if (!ast || typeof ast !== 'object') return;
      const node = ast as ASTNode;
      if (typeof node.type === 'string') {
        visitor[node.type]?.(node);
      }
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) traverse(item, visitor);
        } else if (child && typeof child === 'object' && 'type' in (child as object)) {
          traverse(child, visitor);
        }
      }
    }

    function getLocation(node: ASTNode, filePath: string) {
      return {
        file: filePath,
        line: node.loc?.start.line ?? 1,
        column: node.loc?.start.column ?? 0,
      };
    }
  },
};

export default rule;
