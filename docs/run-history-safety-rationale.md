# Run History Safety Rationale

## Why the conservative stop behavior remains

This repository still treats missing safe run-history baselines as a stop condition.
If the action cannot prove which successful run belongs to the current workflow, it
must not guess. A false baseline can hide commits that still need issues, which is
worse than stopping and asking for human inspection.

## Known false-stop causes

The current implementation keeps the conservative stop policy because several
failure modes can make run-history lookup unsafe:

- Workflow identity mismatch: a workflow name is editable, so matching by name can
  select the wrong history. The lookup now uses the workflow path derived from
  `GITHUB_WORKFLOW_REF` instead.
- Incomplete run-history lookup: the latest successful run may exist beyond the
  first API page, so a single-page lookup can stop too early.
- GitHub API empty-array or partial-response anomalies: the API can report more
  completed runs than it actually returns in a page, which makes the history scan
  incomplete and therefore unsafe to trust.

## Prior incident that informed this design

A prior empty-array incident showed that GitHub can sometimes return no runs even
when the reported totals implied that more history should have been available.
That incident is why this logic treats incomplete run-history responses as unsafe
instead of silently relaxing the baseline.

## Why fallback relaxation is deferred

Fallback relaxation is intentionally deferred in this task. Relaxing the stop
policy would require stronger evidence that the fallback cannot skip commits or
misidentify workflow history. Until that evidence exists, the safer behavior is:

1. Match the current workflow by path, not by editable name.
2. Scan paginated run history until the relevant successful run is found or the
   history is exhausted.
3. Stop with an explicit reason when no safe successful-run history can be proven.
