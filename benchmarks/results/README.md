# Results

Original live delegation demonstrations and performance runs are pending. This directory stores reproducible evidence as the team completes it. Save each measured record as `<harness>/<task-id>-<run-id>.md` and use the same identifiers in the paired table in [test.md](../../test.md).

Keep raw transcripts and provider logs in restricted local storage. Share only evidence you have permission to disclose. Review exports for API keys, account or repository identifiers, usernames, absolute paths, private code, and incidental model context. Replace sensitive fields with stable redactions that preserve attribution across the paired runs. Confirm the redacted patch and evidence still support the stated result.

## Run record template

```markdown
# <harness> / <task ID> / <run ID>

- Date and time zone:
- Condition (A, B, C, D, or capability check):
- Run order and paired run ID:
- Starting repository commit and fixture tree:
- Skill revision / installation scope / observed activation:
- Harness version, surface, plan, OS, and Node version:
- Supervisor requested ID, actual ID, provider, and reasoning effort:
- Worker profiles, requested IDs and effort:
- Actual worker IDs/providers and attribution evidence:
- Permission policy and tool or extension configuration:
- Outcome (success, failure, or invalid) and reason:
- Acceptance and regression checks and raw verifier output:
- Wall-clock duration and time ceiling:
- Worker count, escalations, failed attempts, retries, and constraint violations:
- Frontier input, cached input, output, and reasoning tokens:
- Worker input, cached input, output, and reasoning tokens:
- Actual API charges (currency, source, attribution):
- Subscription quota consumption (unit and source):
- API-equivalent cost (currency, prices, source URL and date, coverage):
- Sanitized patch, transcript, and telemetry references:
- Limitations, fallbacks, and other observations:
```
