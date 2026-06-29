import path from 'path';
import type { Issue, ScanResult, Severity } from '../types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function severityColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    case 'low': return '#2563eb';
    case 'info': return '#6b7280';
  }
}

function scoreColor(score: number): string {
  if (score >= 90) return '#16a34a';
  if (score >= 70) return '#d97706';
  return '#dc2626';
}

function renderIssueCard(issue: Issue, root: string): string {
  const relPath = path.relative(root, issue.location.file).replace(/\\/g, '/');
  const color = severityColor(issue.severity);

  return `
    <div class="issue-card" data-severity="${issue.severity}" data-category="${issue.category}">
      <div class="issue-header">
        <span class="severity-badge" style="background:${color}">${issue.severity.toUpperCase()}</span>
        <span class="issue-rule">${escapeHtml(issue.ruleId)}</span>
        <span class="issue-confidence">${escapeHtml(issue.confidence)} confidence</span>
      </div>
      <div class="issue-message">${escapeHtml(issue.message)}</div>
      <div class="issue-location">${escapeHtml(relPath)}:${issue.location.line}</div>
      <div class="issue-explanation">${escapeHtml(issue.explanation)}</div>
      ${issue.impact ? `<div class="issue-impact"><strong>Impact:</strong> ${escapeHtml(issue.impact)}</div>` : ''}
      ${issue.snippet ? `<pre class="issue-snippet"><code>${escapeHtml(issue.snippet)}</code></pre>` : ''}
      ${issue.fix ? `
        <div class="issue-fix">
          <strong>Fix:</strong> ${escapeHtml(issue.fix.description)}
          ${issue.fix.code ? `<pre class="fix-code"><code>${escapeHtml(issue.fix.code)}</code></pre>` : ''}
        </div>
      ` : ''}
      ${issue.docsUrl ? `<a class="docs-link" href="${escapeHtml(issue.docsUrl)}" target="_blank" rel="noopener">Documentation</a>` : ''}
    </div>`;
}

export function generateHtmlReport(result: ScanResult): string {
  const { score, issues, files, durationMs, root, version, timestamp } = result;

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;
  const scannedCount = files.filter((f) => !f.skipped && !f.parseError).length;

  const issueCards = issues.map((i) => renderIssueCard(i, root)).join('\n');

  const categoryRows = score.categories.map((cat) => {
    const color = scoreColor(cat.score);
    return `
      <tr>
        <td>${escapeHtml(cat.category)}</td>
        <td><span style="color:${color};font-weight:600">${cat.score}/100</span></td>
        <td>${cat.issueCount}</td>
        <td>${cat.criticalCount}</td>
        <td>${cat.highCount}</td>
        <td>${cat.mediumCount}</td>
        <td>${cat.lowCount}</td>
      </tr>`;
  }).join('\n');

  const durationStr = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`;
  const overallColor = scoreColor(score.overall);
  const readyBg = score.productionReady ? '#16a34a' : '#dc2626';
  const readyText = score.productionReady ? 'PRODUCTION READY' : 'NOT PRODUCTION READY';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>clean-slop Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { border-bottom: 1px solid #1e293b; padding-bottom: 2rem; margin-bottom: 2rem; }
    header h1 { font-size: 1.75rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.025em; }
    header p { color: #64748b; margin-top: 0.25rem; font-size: 0.875rem; }
    .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .score-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.25rem; }
    .score-card .label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .score-card .value { font-size: 2rem; font-weight: 700; margin-top: 0.25rem; }
    .ready-badge { display: inline-block; background: ${readyBg}; color: #fff; font-size: 0.8rem; font-weight: 600; padding: 0.35rem 0.9rem; border-radius: 9999px; margin-bottom: 2rem; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 2rem; font-size: 0.875rem; }
    th { background: #0f172a; text-align: left; padding: 0.75rem 1rem; color: #94a3b8; font-weight: 500; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #334155; }
    .filters { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .filter-btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 0.35rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.15s; }
    .filter-btn:hover, .filter-btn.active { background: #334155; color: #f1f5f9; border-color: #475569; }
    .issue-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
    .issue-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .severity-badge { font-size: 0.7rem; font-weight: 700; color: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; letter-spacing: 0.05em; }
    .issue-rule { font-family: monospace; font-size: 0.8rem; color: #64748b; }
    .issue-confidence { font-size: 0.75rem; color: #475569; margin-left: auto; }
    .issue-message { font-weight: 600; color: #f1f5f9; margin-bottom: 0.5rem; }
    .issue-location { font-family: monospace; font-size: 0.8rem; color: #64748b; margin-bottom: 0.75rem; }
    .issue-explanation { font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.75rem; }
    .issue-impact { font-size: 0.875rem; color: #fbbf24; margin-bottom: 0.75rem; }
    .issue-snippet { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 1rem; margin-bottom: 0.75rem; overflow-x: auto; }
    .issue-snippet code, .fix-code code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8rem; color: #94a3b8; white-space: pre; }
    .issue-fix { font-size: 0.875rem; color: #86efac; margin-bottom: 0.75rem; }
    .fix-code { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 1rem; margin-top: 0.5rem; overflow-x: auto; }
    .docs-link { font-size: 0.8rem; color: #60a5fa; text-decoration: none; }
    .docs-link:hover { text-decoration: underline; }
    .section-title { font-size: 1.1rem; font-weight: 600; color: #f8fafc; margin-bottom: 1rem; border-bottom: 1px solid #1e293b; padding-bottom: 0.5rem; }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
    .stat-row { display: flex; gap: 2rem; flex-wrap: wrap; color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>clean-slop Report</h1>
      <p>v${escapeHtml(version)} &nbsp;·&nbsp; ${escapeHtml(new Date(timestamp).toUTCString())} &nbsp;·&nbsp; ${escapeHtml(root)}</p>
    </header>

    <div class="score-grid">
      <div class="score-card">
        <div class="label">Overall Score</div>
        <div class="value" style="color:${overallColor}">${score.overall}<span style="font-size:1rem;color:#64748b">/100</span></div>
      </div>
      <div class="score-card">
        <div class="label">Grade</div>
        <div class="value" style="color:${overallColor}">${escapeHtml(score.grade)}</div>
      </div>
      <div class="score-card">
        <div class="label">Total Issues</div>
        <div class="value" style="color:#f1f5f9">${issues.length}</div>
      </div>
      <div class="score-card">
        <div class="label">Critical</div>
        <div class="value" style="color:#dc2626">${criticalCount}</div>
      </div>
      <div class="score-card">
        <div class="label">High</div>
        <div class="value" style="color:#ea580c">${highCount}</div>
      </div>
      <div class="score-card">
        <div class="label">Files Scanned</div>
        <div class="value" style="color:#f1f5f9">${scannedCount}</div>
      </div>
    </div>

    <div class="ready-badge">${readyText}</div>

    <div class="section-title">Category Scores</div>
    <table>
      <thead>
        <tr>
          <th>Category</th><th>Score</th><th>Total</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th>
        </tr>
      </thead>
      <tbody>${categoryRows}</tbody>
    </table>

    <div class="section-title">Issues</div>
    <div class="stat-row">
      <span>${issues.length} issue${issues.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${scannedCount} files &nbsp;·&nbsp; ${durationStr}</span>
    </div>

    <div class="filters">
      <button class="filter-btn active" onclick="filterIssues('all')">All (${issues.length})</button>
      <button class="filter-btn" onclick="filterIssues('critical')">Critical (${criticalCount})</button>
      <button class="filter-btn" onclick="filterIssues('high')">High (${highCount})</button>
      <button class="filter-btn" onclick="filterIssues('medium')">Medium (${mediumCount})</button>
      <button class="filter-btn" onclick="filterIssues('low')">Low (${lowCount})</button>
    </div>

    <div id="issues-container">
      ${issues.length === 0 ? '<div class="empty-state">No issues found.</div>' : issueCards}
    </div>
  </div>

  <script>
    function filterIssues(severity) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.querySelectorAll('.issue-card').forEach(card => {
        if (severity === 'all' || card.dataset.severity === severity) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }
  </script>
</body>
</html>`;
}
