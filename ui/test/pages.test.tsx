import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import createWrapper from "@cloudscape-design/components/test-utils/dom";
import { OverviewPage } from "../src/pages/Overview";
import { ToolsPage } from "../src/pages/Tools";
import { fakeFrank, getStatusTool } from "./fakeFrank";

describe("Overview", () => {
  it("shows get_status and a healthy connection", async () => {
    const frank = fakeFrank();
    render(<OverviewPage frank={frank} />);

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
    expect(screen.getByText("7 s")).toBeInTheDocument();
    expect(frank.callTool).toHaveBeenCalledWith("get_status", {});
  });

  it("shows why when Frank cannot be reached", async () => {
    const frank = fakeFrank();
    frank.callTool.mockRejectedValueOnce(new Error("Failed to fetch"));
    render(<OverviewPage frank={frank} />);

    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
  });
});

describe("Tools", () => {
  const listTool = {
    name: "list_things",
    description: "Lists things.",
    inputSchema: {
      type: "object",
      required: ["kind"],
      properties: { kind: { type: "string", description: "Which kind." } },
    },
  };

  it("lists every tool Frank reports", async () => {
    const { container } = render(<ToolsPage frank={fakeFrank([getStatusTool, listTool])} />);
    await screen.findByText("list_things");
    const rows = createWrapper(container).findTable()!.findRows();
    expect(rows).toHaveLength(2);
  });

  it("builds a form from the selected tool's schema and shows the result", async () => {
    const frank = fakeFrank([getStatusTool, listTool]);
    const { container } = render(<ToolsPage frank={frank} />);
    await screen.findByText("list_things");
    const w = createWrapper(container);

    w.findTable()!.findRowSelectionArea(2)!.click();
    await screen.findByText("Which kind.");
    w.findInput()!.setInputValue("widgets");
    await userEvent.click(screen.getByRole("button", { name: "Call tool" }));

    await waitFor(() => expect(frank.callTool).toHaveBeenCalledWith("list_things", { kind: "widgets" }));
    const result = await screen.findByTestId("tool-result");
    expect(within(result).getByText(/called list_things/)).toBeInTheDocument();
  });

  it("shows a tool error in a flashbar", async () => {
    const frank = fakeFrank();
    frank.callTool.mockResolvedValueOnce({ isError: true, result: "The thing is unavailable." });
    const { container } = render(<ToolsPage frank={frank} />);
    await screen.findByText("get_status");

    createWrapper(container).findTable()!.findRowSelectionArea(1)!.click();
    await userEvent.click(await screen.findByRole("button", { name: "Call tool" }));

    expect(await screen.findByText("The thing is unavailable.")).toBeInTheDocument();
    expect(screen.queryByTestId("tool-result")).toBeNull();
  });
});
