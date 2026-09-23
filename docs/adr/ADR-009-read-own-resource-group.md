# ADR-009: Let Frank read what is running in his own resource group

**Status:** Proposed — **supersedes the `DefaultAzureCredential` clause of
ADR-010**: at runtime Frank uses `EnvironmentCredential`, the same credential
without the fallback chain
**Date:** 2026-09

## Context

The class ends by asking Frank *"what's running in your resource group?"*, a
live fact no model holds in its weights. ADR-010 already hands the container a
credential and `AZURE_RESOURCE_GROUP`. What is missing is what he may read and
return.

That credential holds **Contributor**, so it can also call ARM actions that
return secrets. And `/mcp` is anonymous: rejecting ADR-007 accepted exposure of
*"an inventory"*, nothing more. Since ADR-010, the group is shared by the whole
class.

## Decision

- **Two tools**, built with `defineTool()`:
  - `list_resources`: each resource's name, type and location, counted by
    type in the summary.
  - `list_container_apps`: each app's name, FQDN, running state, image and
    last-modified time.
- **Both list the whole class**, not only Frank's app, and every field is
  inventory: FQDNs are in the public job summary, the registry name is not
  secret (ADR-010), and the tag is a public commit. Any other field is
  ADR-007's revisit trigger.
- **Scope comes from the environment only**: `AZURE_SUBSCRIPTION_ID` and
  `AZURE_RESOURCE_GROUP`, read at boot. No tool takes a scope parameter.
- **Only `server/src/azure.ts` calls Azure**, with `EnvironmentCredential`, so
  it cannot fall back to a laptop's `az login`.
- **Reads only, through an allow-list.** List and get operations, never ARM
  actions such as `listSecrets` or `listKeys`. Output is built field by field,
  never from the raw ARM object.
- **Fail closed.** Without the scope variables, Frank still boots and the Azure
  tools return `isError`. `azure.ts` throws only its own plain messages, never
  Azure's. Calls time out after 10 s.
- **Tests fake `azure.ts`** (CI has no credential) and prove fixture secrets
  never reach any output, errors included.

## Consequences

- **The read-only rule lives in code review, not IAM.** The credential could read
  every classmate's secrets; only `azure.ts` stops it.
- **One anonymous call returns the class roster**, since app names are GitHub
  handles.
- Rejected: a Reader-only runtime credential (IAM would enforce the rule, but
  it is another instructor-made object); filtering to Frank's own app (hides the class's
  work, which ADR-010 counts as an upside); raw ARM JSON (leaks configuration).
