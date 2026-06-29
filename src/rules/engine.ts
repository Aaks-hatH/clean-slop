import type {
  Issue,
  ParsedFile,
  ResolvedConfig,
  Rule,
  RuleCategory,
  RuleContext,
  RuleSeverityOverride,
  Severity,
} from '../types.js';
import { DOCS_BASE_URL } from '../utils/constants.js';
import { extractSnippet } from '../parsers/source-parser.js';

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();

  register(rule: Rule): void {
    if (this.rules.has(rule.meta.id)) {
      throw new Error(`Rule "${rule.meta.id}" is already registered.`);
    }
    this.rules.set(rule.meta.id, rule);
  }

  registerAll(rules: Rule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  getRule(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getRulesByCategory(category: RuleCategory): Rule[] {
    return this.getRules().filter((r) => r.meta.category === category);
  }

  runOnFile(parsedFile: ParsedFile, config: ResolvedConfig): Issue[] {
    const issues: Issue[] = [];

    for (const rule of this.rules.values()) {
      // Check category is enabled
      if (!config.categories[rule.meta.category]) continue;

      // Check rule-level override
      const ruleConfig = config.rules[rule.meta.id];
      const severityOverride = this.resolveSeverityOverride(ruleConfig);
      if (severityOverride === 'off') continue;

      const effectiveSeverity = severityOverride ?? rule.meta.severity;

      const ruleIssues: Issue[] = [];

      const context: RuleContext = {
        filePath: parsedFile.filePath,
        source: parsedFile.source,
        ast: parsedFile.ast,
        config,
        report(partial) {
          const snippet =
            partial.snippet ??
            extractSnippet(parsedFile.source, partial.location.line);

          ruleIssues.push({
            ruleId: rule.meta.id,
            ruleName: rule.meta.name,
            category: rule.meta.category,
            severity: effectiveSeverity,
            confidence: rule.meta.confidence,
            docsUrl: rule.meta.docsUrl ?? `${DOCS_BASE_URL}/rules/${rule.meta.id}`,
            snippet,
            ...partial,
          });
        },
      };

      try {
        rule.create(context);
      } catch {
        // Rule execution errors should not crash the scan
      }

      issues.push(...ruleIssues);
    }

    return issues;
  }

  private resolveSeverityOverride(
    ruleConfig: ResolvedConfig['rules'][string] | undefined,
  ): Severity | 'off' | null {
    if (ruleConfig === undefined) return null;

    if (typeof ruleConfig === 'string') {
      return ruleConfig as RuleSeverityOverride;
    }

    if (typeof ruleConfig === 'object' && ruleConfig !== null) {
      if ('severity' in ruleConfig && ruleConfig.severity) {
        return ruleConfig.severity as RuleSeverityOverride;
      }
    }

    return null;
  }
}
