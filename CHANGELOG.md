# Changelog

All notable changes to clean-slop are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## [1.0.0] - 2024-01-01

### Added

- Initial release
- CLI commands: scan, check, watch, report, doctor, init
- 22 built-in rules across 5 categories
- AI Slop rules: empty-catch, todo-implementation, giant-function, excessive-nesting, fake-validation, high-complexity, dead-code
- Security rules: unsafe-eval, hardcoded-secrets, sql-injection, command-injection, path-traversal, prototype-pollution, weak-crypto, dangerous-cors
- Reliability rules: unhandled-promise, missing-await, infinite-loop
- Maintainability rules: giant-file, circular-imports
- Production Readiness rules: no-console-log, no-localhost-urls
- Reporters: text, JSON, HTML, Markdown, SARIF 2.1.0
- Configuration via cosmiconfig (clean-slop.config.js, .clean-slop.json, package.json field)
- Plugin architecture for custom rules
- Public JavaScript/TypeScript API
- GitHub Actions workflows for CI and npm publishing
- SARIF integration with GitHub Code Scanning

[Unreleased]: https://github.com/clean-slop/clean-slop/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/clean-slop/clean-slop/releases/tag/v1.0.0
