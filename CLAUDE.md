# jira-bug-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-10

## Active Technologies
- TypeScript 5.x (strict mode, `noUncheckedIndexedAccess: true`) + WXT 0.19.0 (build/extension framework), no new dependencies required (002-har-export)
- `chrome.storage.session` for network buffer (per-tab), `chrome.storage.local` for settings (002-har-export)

- TypeScript 5.x (strict mode) + WXT, @webext-core/fake-browser (testing) (001-jira-bug-capture)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (strict mode): Follow standard conventions

## Recent Changes
- 002-har-export: Added TypeScript 5.x (strict mode, `noUncheckedIndexedAccess: true`) + WXT 0.19.0 (build/extension framework), no new dependencies required

- 001-jira-bug-capture: Added TypeScript 5.x (strict mode) + WXT, @webext-core/fake-browser (testing)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
