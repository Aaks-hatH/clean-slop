import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const rule: Rule = {
  meta: {
    id: 'ai-slop/empty-catch',
    name: 'Empty Catch Block',
    category: 'ai-slop',
    severity: 'high',
    confidence: 'certain',
    description: 'Detects catch blocks that silently swallow errors.',
    rationale:
      'Empty catch blocks are a hallmark of AI-generated code that handles the error path ' +
      'syntactically but not semantically. They hide failures, making bugs invisible in production.',
    docsUrl: 'https://clean-slop.dev/docs/rules/ai-slop/empty-catch',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CatchClause(node: ASTNode) {
        const body = node.body as ASTNode | undefined;
        if (!body) return;

        const bodyNode = body as ASTNode & { body?: unknown[] };
        const statements = bodyNode.body ?? [];

        // A catch is empty if it has zero statements or only comments
        const hasStatements = statements.some((stmt: unknown) => {
          const s = stmt as ASTNode;
          // Allow if there is at least one non-comment statement
          return s.type !== 'EmptyStatement';
        });

        if (!hasStatements) {
          context.report({
            message: 'Catch block is empty and silently swallows errors.',
            explanation:
              'This catch block catches exceptions but does nothing with them. ' +
              'Errors are silently discarded, making it impossible to detect or diagnose failures.',
            impact:
              'Silent error swallowing causes mysterious failures in production. ' +
              'Debugging becomes extremely difficult because the exception trail disappears.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'At minimum, log the error. Consider re-throwing if the caller should know about the failure.',
              code: 'catch (err) {\n  console.error("Unexpected error:", err);\n  // or: throw err;\n}',
            },
          });
        }
      },
    });
  },
};

export default rule;
