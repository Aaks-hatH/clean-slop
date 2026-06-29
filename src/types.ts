/**
 * Core types for the clean-slop production readiness engine.
 */

// ---------------------------------------------------------------------------
// Severity and Confidence
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'certain' | 'high' | 'medium' | 'low';
export type RuleCategory =
  | 'ai-slop'
  | 'security'
  | 'reliability'
  | 'maintainability'
  | 'production-readiness';

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export interface Location {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export interface IssueFix {
  description: string;
  code?: string;
}

export interface Issue {
  /** Rule identifier that produced this issue, e.g. "security/sql-injection" */
  ruleId: string;
  /** Human-readable rule name */
  ruleName: string;
  /** Category the rule belongs to */
  category: RuleCategory;
  /** Severity of the issue */
  severity: Severity;
  /** Confidence that this is a real issue */
  confidence: Confidence;
  /** Short summary of what was found */
  message: string;
  /** Detailed explanation of the issue */
  explanation: string;
  /** Why this matters in production */
  impact: string;
  /** Location in source */
  location: Location;
  /** Extracted source snippet */
  snippet?: string;
  /** Suggested fix */
  fix?: IssueFix;
  /** URL to extended documentation */
  docsUrl?: string;
  /** Additional metadata from the rule */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export interface CategoryScore {
  category: RuleCategory;
  score: number; // 0-100
  issueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface ScanScore {
  overall: number; // 0-100
  categories: CategoryScore[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  productionReady: boolean;
}

// ---------------------------------------------------------------------------
// Scan results
// ---------------------------------------------------------------------------

export interface FileResult {
  file: string;
  issues: Issue[];
  parseError?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface ScanResult {
  /** Absolute path of the scanned project root */
  root: string;
  /** ISO timestamp of the scan */
  timestamp: string;
  /** clean-slop version */
  version: string;
  /** Files that were scanned */
  files: FileResult[];
  /** All issues aggregated */
  issues: Issue[];
  /** Scores per category and overall */
  score: ScanScore;
  /** Duration in milliseconds */
  durationMs: number;
  /** Configuration used for this scan */
  config: ResolvedConfig;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface RuleMeta {
  id: string;
  name: string;
  category: RuleCategory;
  severity: Severity;
  confidence: Confidence;
  description: string;
  rationale: string;
  docsUrl: string;
  fixable: boolean;
  frameworks?: string[];
}

export interface RuleContext {
  filePath: string;
  source: string;
  ast: unknown;
  config: ResolvedConfig;
  report(issue: Omit<Issue, 'ruleId' | 'ruleName' | 'category' | 'severity' | 'confidence' | 'docsUrl'>): void;
}

export interface Rule {
  meta: RuleMeta;
  create(context: RuleContext): void;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type RuleSeverityOverride = Severity | 'off';

export interface RuleConfig {
  severity?: RuleSeverityOverride;
  options?: Record<string, unknown>;
}

export interface UserConfig {
  /** Glob patterns of files to include (default: all JS/TS files) */
  include?: string[];
  /** Glob patterns of files to exclude */
  exclude?: string[];
  /** Rule category toggles */
  categories?: Record<RuleCategory, boolean>;
  /** Per-rule overrides */
  rules?: Record<string, RuleSeverityOverride | RuleConfig>;
  /** Threshold below which the process exits non-zero */
  failThreshold?: number;
  /** Maximum issues of each severity before failing */
  maxIssues?: Partial<Record<Severity, number>>;
  /** Plugins to load */
  plugins?: string[];
  /** Output reporter */
  reporter?: 'text' | 'json' | 'html' | 'markdown' | 'sarif';
  /** Output file for reports */
  output?: string;
  /** Whether to enable verbose output */
  verbose?: boolean;
  /** Ignore patterns (in addition to .gitignore) */
  ignorePatterns?: string[];
  /** TypeScript project file */
  tsConfigPath?: string;
}

export type ResolvedConfig = Required<Omit<UserConfig, 'output' | 'tsConfigPath'>> & {
  output: string | null;
  tsConfigPath: string | null;
  root: string;
  version: string;
};

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

export interface Plugin {
  name: string;
  version: string;
  rules: Rule[];
}

// ---------------------------------------------------------------------------
// Reporters
// ---------------------------------------------------------------------------

export interface Reporter {
  name: string;
  generate(result: ScanResult): string;
}

// ---------------------------------------------------------------------------
// Parser output
// ---------------------------------------------------------------------------

export type Language = 'javascript' | 'typescript' | 'jsx' | 'tsx';

export interface ParsedFile {
  filePath: string;
  source: string;
  ast: unknown;
  language: Language;
}
