import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX|TEMP|TEMPORARY|PLACEHOLDER|NOT IMPLEMENTED|NOT_IMPLEMENTED)\b/i;
const THROW_NOT_IMPLEMENTED = /not.?implemented|to.?do|todo/i;

const rule: Rule = {
  meta: {
    id: 'ai-slop/todo-implementation',
    name: 'TODO / Placeholder Implementation',
    category: 'ai-slop',
    severity: 'high',
    confidence: 'high',
    description: 'Detects TODO comments, placeholder implementations, and unfinished code.',
    rationale:
      'AI code generators frequently produce functions with TODO bodies, placeholder returns, ' +
      'or throw new Error("Not implemented"). These skeletons look complete but break at runtime.',
    docsUrl: 'https://clean-slop.dev/docs/rules/ai-slop/todo-implementation',
    fixable: false,
  },

  create(context) {
    // Scan comments embedded in the AST
    const astWithComments = context.ast as { comments?: ASTNode[] };
    const comments: ASTNode[] = astWithComments.comments ?? [];

    for (const comment of comments) {
      const value = (comment.value as string | undefined) ?? '';
      if (TODO_PATTERN.test(value)) {
        context.report({
          message: `${comment.type === 'Line' ? '//' : '/*'} comment contains TODO/FIXME marker.`,
          explanation:
            'This comment indicates unfinished work. In production builds, TODO markers ' +
            'represent missing functionality that was never implemented.',
          impact:
            'Incomplete implementations cause runtime failures, data corruption, or silent no-ops ' +
            'when the unfinished code path is reached.',
          location: getLocation(comment, context.filePath),
          fix: {
            description: 'Implement the described functionality or create a tracked issue and remove the inline marker.',
          },
        });
      }
    }

    // Detect `throw new Error("Not implemented")` patterns
    traverse(context.ast, {
      ThrowStatement(node: ASTNode) {
        const argument = node.argument as ASTNode | undefined;
        if (!argument) return;

        if (
          argument.type === 'NewExpression' ||
          argument.type === 'CallExpression'
        ) {
          const callee = argument.callee as ASTNode | undefined;
          if (!callee) return;

          const calleeName =
            callee.type === 'Identifier' ? (callee.name as string) : null;
          if (calleeName !== 'Error') return;

          const args = (argument.arguments as ASTNode[] | undefined) ?? [];
          if (args.length === 0) return;

          const firstArg = args[0] as ASTNode;
          const msgValue =
            firstArg.type === 'Literal' ? String(firstArg.value) : '';

          if (THROW_NOT_IMPLEMENTED.test(msgValue)) {
            context.report({
              message: `Placeholder implementation: throw new Error("${msgValue}")`,
              explanation:
                'This function throws "Not implemented" or a similar placeholder. ' +
                'It was likely auto-generated and never completed.',
              impact:
                'Calling this function in production causes an immediate unhandled exception.',
              location: getLocation(node, context.filePath),
              fix: {
                description: 'Implement the function body or remove it from the codebase.',
              },
            });
          }
        }
      },
    });
  },
};

export default rule;
