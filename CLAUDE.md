# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The classroom repo for a one-day course. It builds **Frank**: an MCP server plus a Cloudscape web console, shipped as **one container** to Azure Container Apps by `.github/workflows/deploy.yml`.

`server/` and `ui/` start empty on purpose. They are built from the ADRs in `docs/adr/`. **Read the relevant ADR before writing code, and cite ADRs by number.** When an ADR and the code disagree, the ADR wins, or a new ADR supersedes it.

## Commands

Each of `server/` and `ui/` is a self-contained npm package (Node 22+) with the same scripts:

```bash
npm ci
npm run dev      # local dev
npm test         # tests
npm run build    # production build (server -> dist/, ui -> dist/)
```

The full image is built from the **repo root**, because it needs both `server/` and `ui/`:

```bash
docker build -t frank . && docker run -p 3000:3000 frank
curl localhost:3000/healthz
```

Both packages use Vitest. To run one file or one test, from inside `server/` or `ui/`:

```bash
npx vitest run test/get-status.test.ts
npx vitest run -t "rejects an unknown field"
```

Run Frank locally with `npm run dev` in `server/`. Run the console with `npm run dev` in `ui/`, which proxies `/mcp` to `localhost:3000`. To connect Claude Code to a local Frank, use `claude mcp add --transport http frank-local http://localhost:3000/mcp`.

## Architecture (the contract the code must meet)

- **Stack (ADR-001):** TypeScript, Express, and the official `@modelcontextprotocol/sdk` over Streamable HTTP. Do not hand-roll any protocol code. All config comes from environment variables, and no config files contain values.
- **One origin (ADR-006):** Express serves the console at `/`, MCP at `POST /mcp`, and a 200 at `GET /healthz`. The UI calls `/mcp` **relatively**, so there is no `VITE_FRANK_URL` and no CORS.
- **Port:** `PORT`, default `3000`. This must match three places: the Dockerfile, the `--target-port 3000` in `deploy.yml`, and the default in the server's `config.ts`.
- **Console is optional:** Frank must deploy and serve MCP before `ui/` exists. The Dockerfile handles an empty `ui/`. The server resolves the console as `<package root>/public` (`/app/public` in the image) and says so at `/` when it is absent.
- **Tools (ADR-002):**
  - One module per tool in `server/src/tools/`, built with `defineTool()` from `define.ts` and registered in `server/src/tools/index.ts`. `defineTool()` enforces the naming, descriptions, strict input and `summary` output. `server/test/conventions.test.ts` checks every registered tool through a real MCP client.
  - Names are `verb_noun`, and the verb comes **only** from `get` / `list` / `search` / `summarize`.
  - Inputs use zod schemas that reject unknown fields, and every parameter has a description.
  - Output is JSON with a top-level `summary` string plus typed fields. Errors return `isError: true` with a plain message and never a stack trace.
  - The first tool is `get_status`.
- **Read-only rule (ADR-002):** no tool may mutate Azure, GitHub, or the filesystem beyond temp space. A write capability requires a new ADR. Do not just add a `create_*` / `delete_*` / `run_*` tool.
- **Console (ADR-003):** React 18, Vite, and Cloudscape components only, with no second component library and no custom CSS beyond layout glue. It has two pages. *Overview* shows `get_status`. *Tools* lists the MCP-discovered tools and renders a form from each tool's input schema. The UI holds no secrets.
- **Azure reads (ADR-009, written in class):** at runtime Frank gets `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, and `AZURE_RESOURCE_GROUP`, and uses them through `DefaultAzureCredential` (ADR-010). The resource group is read from the environment at boot, and tools deliberately take **no parameter** for it.

## Pipeline behaviour (deploy.yml)

- **PRs** run `build-server` / `build-ui` (`npm ci && npm test && npm run build`). Each job is a no-op until that package's `package-lock.json` is committed. **Commit the lockfile.** The Dockerfile also needs `server/package-lock.json`.
- **Pushes to `main` deploy.** The only test gate on main is the Docker build, which runs `npm test` in both stages. A red suite means no deploy.
- The container app is named `frank-<github owner>`. The registry and environment are discovered from `rg-frank-class`. Students set no secrets or variables: the credential is fetched from `CREDENTIAL_URL` (ADR-010), and a fork-level `AZURE_CREDENTIALS` secret overrides it.
- Deploying uses `az acr build` followed by `az containerapp create`/`update`. Do **not** switch to `az containerapp up --source`, which crashes on some azure-cli builds.

## ADR process (ADR-000)

- Use `/adr <title>` to scaffold a new ADR. It takes the next number and follows `docs/adr/template.md` (Context → Decision → Consequences, one page, roughly 290–375 words).
- Update the ADR table in **both** `docs/adr/README.md` and `README.md`.
- Run every new or changed ADR past the `adr-reviewer` agent. Leave it uncommitted, because acceptance is a human's call.
- Accepted ADRs are immutable. Supersede them with a new ADR, naming the exact clauses it replaces. The only permitted edit to an old ADR is its Status line.
- Rejected ADRs are kept. ADR-007 (MCP auth) is Rejected on purpose, so do not implement it.

## Repo-provided agents

The agents in `.claude/agents/` are read-only reviewers. Invoke them by name when you need them to run reliably:

- `tool-conventions`: after changing anything in `server/src/tools/`.
- `secret-scanner`: before committing or opening a PR.
- `adr-reviewer`: for any ADR.

## Security constraints

- Never commit credentials or put them in `CLAUDE.md`, ADRs, skills, or test fixtures. This includes the decoded classroom credential.
- The committed `CREDENTIAL_URL` and the resource names in `deploy.yml` are intentionally public (ADR-010).
- Pushing to `main` deploys to Azure. Work on branches and open PRs.
