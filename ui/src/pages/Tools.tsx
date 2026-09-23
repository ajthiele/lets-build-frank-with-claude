import { useEffect, useState } from "react";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Flashbar, { type FlashbarProps } from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { SchemaForm } from "../components/SchemaForm";
import type { Frank, ToolCallOutcome, ToolInfo } from "../mcp";

export function ToolsPage({ frank }: { frank: Frank }) {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ToolInfo | undefined>();
  const [calling, setCalling] = useState(false);
  const [outcome, setOutcome] = useState<ToolCallOutcome | undefined>();
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  function showError(header: string, err: unknown) {
    setFlash([
      {
        type: "error",
        header,
        content: err instanceof Error ? err.message : String(err),
        dismissible: true,
        onDismiss: () => setFlash([]),
        id: "error",
      },
    ]);
  }

  useEffect(() => {
    frank
      .listTools()
      .then(setTools)
      .catch((err) => showError("Could not list Frank's tools", err))
      .finally(() => setLoading(false));
  }, [frank]);

  async function call(args: Record<string, unknown>) {
    if (!selected) return;
    setCalling(true);
    setFlash([]);
    setOutcome(undefined);
    try {
      const result = await frank.callTool(selected.name, args);
      setOutcome(result);
      if (result.isError) showError(`${selected.name} returned an error`, String(result.result));
    } catch (err) {
      showError(`Could not call ${selected.name}`, err);
    } finally {
      setCalling(false);
    }
  }

  return (
    <ContentLayout header={<Header variant="h1">Tools</Header>} notifications={<Flashbar items={flash} />}>
      <SpaceBetween size="l">
        <Table
          header={<Header counter={loading ? undefined : `(${tools.length})`}>Frank's tools</Header>}
          loading={loading}
          loadingText="Asking Frank what he can do"
          items={tools}
          trackBy="name"
          selectionType="single"
          selectedItems={selected ? [selected] : []}
          onSelectionChange={({ detail }) => {
            setSelected(detail.selectedItems[0]);
            setOutcome(undefined);
            setFlash([]);
          }}
          ariaLabels={{
            selectionGroupLabel: "Tools",
            itemSelectionLabel: (_, item) => item.name,
            allItemsSelectionLabel: () => "All tools",
          }}
          columnDefinitions={[
            { id: "name", header: "Name", cell: (t) => <Box variant="code">{t.name}</Box> },
            { id: "description", header: "Description", cell: (t) => t.description ?? "" },
          ]}
          empty={<Box textAlign="center">Frank has no tools.</Box>}
        />

        {selected && (
          <Container header={<Header variant="h2" description={selected.description}>{selected.name}</Header>}>
            {/* key resets the form when a different tool is selected */}
            <SchemaForm key={selected.name} schema={selected.inputSchema} submitting={calling} onSubmit={call} />
          </Container>
        )}

        {outcome && !outcome.isError && (
          <Container header={<Header variant="h2">Result</Header>}>
            <div data-testid="tool-result">
              <Box variant="pre">{JSON.stringify(outcome.result, null, 2)}</Box>
            </div>
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
