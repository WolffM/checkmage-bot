## Steps to reproduce
1. From a clean checkout, run `npm install` in `/home/runner/work/checkmage-bot/checkmage-bot`.
2. Run `npm audit --json` and inspect the `vulnerabilities` object.
3. Locate the `min-document` entry and review the advisory URL and affected range.
4. Confirm that the vulnerable package version in `package-lock.json` is `2.19.0` under `node_modules/min-document`.

## Observed
Before remediation, `npm audit --json` reported `min-document vulnerable to prototype pollution` with advisory URL `https://github.com/advisories/GHSA-rx8g-88g5-qh64` and affected range `<=2.19.0`. This is consistent with the lockfile entry that pinned `min-document` to `2.19.0`. The trace demonstrates the security finding was real and reproducible via standard package audit tooling.

## Expected
The lockfile should resolve `min-document` to a non-vulnerable version so that `npm audit --json` no longer includes the `GHSA-rx8g-88g5-qh64` finding. After the update, the `min-document` vulnerability entry should disappear while unrelated advisories may remain. This confirms that the fix is narrow, targeted, and specific to the reported issue.
