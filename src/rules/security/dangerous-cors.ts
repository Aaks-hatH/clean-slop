import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

function getPropertyValue(props: ASTNode[], keyName: string): ASTNode | undefined {
  for (const prop of props) {
    if (prop.type !== 'Property') continue;
    const key = prop.key as ASTNode | undefined;
    const keyStr =
      key?.type === 'Identifier'
        ? String(key.name)
        : key?.type === 'Literal'
          ? String(key.value)
          : null;

    if (keyStr === keyName) {
      return prop.value as ASTNode | undefined;
    }
  }
  return undefined;
}

function getLiteralString(node: ASTNode | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function getLiteralBool(node: ASTNode | undefined): boolean | null {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'boolean') return node.value;
  return null;
}

const rule: Rule = {
  meta: {
    id: 'security/dangerous-cors',
    name: 'Dangerous CORS / Cookie Configuration',
    category: 'security',
    severity: 'high',
    confidence: 'high',
    description:
      'Detects wildcard CORS origins, insecure cookie settings, and overly permissive configurations.',
    rationale:
      'CORS misconfiguration and insecure cookie attributes are among the most common ' +
      'security mistakes in Node.js backends. They enable CSRF, session hijacking, and ' +
      'cross-origin data leakage.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/dangerous-cors',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        const callee = node.callee as ASTNode | undefined;
        if (!callee) return;

        // cors({ origin: '*' }) or cors({ origin: true })
        const isCorsCall =
          (callee.type === 'Identifier' && String(callee.name) === 'cors') ||
          (callee.type === 'MemberExpression' &&
            String((callee.property as ASTNode).name) === 'cors');

        if (isCorsCall) {
          const args = (node.arguments as ASTNode[] | undefined) ?? [];
          const configArg = args[0] as ASTNode | undefined;

          if (!configArg || configArg.type !== 'ObjectExpression') return;

          const props = (configArg.properties as ASTNode[] | undefined) ?? [];
          const originNode = getPropertyValue(props, 'origin');

          if (!originNode) return;

          const originStr = getLiteralString(originNode);
          const originBool = getLiteralBool(originNode);

          if (originStr === '*' || originBool === true) {
            context.report({
              message: `CORS configured with permissive origin: ${JSON.stringify(originStr ?? originBool)}.`,
              explanation:
                'Setting CORS origin to "*" or true allows any website to make cross-origin ' +
                'requests to this API. When combined with cookies or Authorization headers, ' +
                'this enables cross-site request forgery (CSRF) attacks.',
              impact:
                'Malicious websites can make authenticated requests on behalf of logged-in users, ' +
                'read sensitive API responses, and exfiltrate data.',
              location: getLocation(originNode, context.filePath),
              fix: {
                description:
                  'Specify an explicit allowlist of trusted origins. Use an environment variable ' +
                  'to configure origins per deployment environment.',
                code: "cors({\n  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],\n  credentials: true,\n})",
              },
            });
          }
        }
      },

      ObjectExpression(node: ASTNode) {
        const props = (node.properties as ASTNode[] | undefined) ?? [];

        // Check for httpOnly: false on cookies
        const httpOnlyNode = getPropertyValue(props, 'httpOnly');
        if (httpOnlyNode && getLiteralBool(httpOnlyNode) === false) {
          context.report({
            message: 'Cookie configured with httpOnly: false.',
            explanation:
              'Setting httpOnly: false makes cookies accessible to JavaScript via document.cookie. ' +
              'This allows cross-site scripting (XSS) attacks to steal session cookies.',
            impact:
              'A single XSS vulnerability in your application can lead to session hijacking ' +
              'for all users if cookies are not protected with httpOnly.',
            location: getLocation(httpOnlyNode, context.filePath),
            fix: {
              description:
                'Set httpOnly: true for all session and authentication cookies. ' +
                'Never set httpOnly: false unless the cookie is explicitly intended for JavaScript access.',
            },
          });
        }

        // Check for secure: false on cookies
        const secureNode = getPropertyValue(props, 'secure');
        if (secureNode && getLiteralBool(secureNode) === false) {
          context.report({
            message: 'Cookie configured with secure: false.',
            explanation:
              'Setting secure: false allows cookies to be transmitted over unencrypted HTTP connections. ' +
              'This exposes session tokens to network interception.',
            impact:
              'Cookies sent over HTTP can be captured by network observers, enabling session hijacking ' +
              'and man-in-the-middle attacks.',
            location: getLocation(secureNode, context.filePath),
            fix: {
              description:
                'Set secure: true for all session and authentication cookies. ' +
                'Use a conditional based on NODE_ENV only in local development.',
              code: "secure: process.env.NODE_ENV === 'production'",
            },
          });
        }

        // Check for sameSite: 'none' without secure
        const sameSiteNode = getPropertyValue(props, 'sameSite');
        if (sameSiteNode && getLiteralString(sameSiteNode)?.toLowerCase() === 'none') {
          const secureValue = getPropertyValue(props, 'secure');
          if (!secureValue || getLiteralBool(secureValue) !== true) {
            context.report({
              message: "Cookie has sameSite: 'none' without secure: true.",
              explanation:
                "sameSite: 'none' is required for cross-site cookies but is only valid when " +
                'combined with secure: true. Without it, the cookie is rejected by modern browsers.',
              impact:
                'Cross-origin requests will fail in production because the browser will reject ' +
                'the cookie. This may also enable CSRF if the application is served over HTTP.',
              location: getLocation(sameSiteNode, context.filePath),
              fix: {
                description:
                  "Add secure: true when using sameSite: 'none'. Cross-site cookies require HTTPS.",
              },
            });
          }
        }
      },
    });
  },
};

export default rule;
