import { useCallback, useEffect, useState } from "react";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import type { Frank } from "../mcp";

interface Status {
  summary: string;
  version: string;
  uptimeSeconds: number;
  greeting: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; status: Status }
  | { kind: "error"; message: string };

export function OverviewPage({ frank }: { frank: Frank }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const outcome = await frank.callTool("get_status", {});
      if (outcome.isError) {
        setState({ kind: "error", message: String(outcome.result) });
      } else {
        setState({ kind: "ok", status: outcome.result as Status });
      }
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Could not reach Frank." });
    }
  }, [frank]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = state.kind === "ok" ? state.status : undefined;

  return (
    <ContentLayout header={<Header variant="h1">Overview</Header>}>
      <Container
        header={
          <Header
            variant="h2"
            actions={
              <Button iconName="refresh" onClick={() => void load()} loading={state.kind === "loading"}>
                Refresh
              </Button>
            }
            description={status?.summary}
          >
            Status
          </Header>
        }
      >
        <KeyValuePairs
          columns={4}
          items={[
            {
              label: "Connection",
              value:
                state.kind === "loading" ? (
                  <StatusIndicator type="loading">Connecting</StatusIndicator>
                ) : state.kind === "ok" ? (
                  <StatusIndicator type="success">Connected</StatusIndicator>
                ) : (
                  <StatusIndicator type="error">{state.message}</StatusIndicator>
                ),
            },
            { label: "Version", value: status?.version ?? "-" },
            { label: "Uptime", value: status ? `${status.uptimeSeconds} s` : "-" },
            { label: "Greeting", value: status ? <Box>{status.greeting}</Box> : "-" },
          ]}
        />
      </Container>
    </ContentLayout>
  );
}
