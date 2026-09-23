import { useEffect, useState } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import type { Frank } from "./mcp";
import { OverviewPage } from "./pages/Overview";
import { ToolsPage } from "./pages/Tools";

type Page = "overview" | "tools";

// Hash routing: two pages don't need a router, and Frank's server needs no
// catch-all route to support deep links.
function pageFromHash(hash: string): Page {
  return hash === "#/tools" ? "tools" : "overview";
}

export function App({ frank }: { frank: Frank }) {
  const [page, setPage] = useState<Page>(() => pageFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <AppLayout
      navigation={
        <SideNavigation
          header={{ text: "Frank", href: "#/overview" }}
          activeHref={`#/${page}`}
          items={[
            { type: "link", text: "Overview", href: "#/overview" },
            { type: "link", text: "Tools", href: "#/tools" },
          ]}
        />
      }
      toolsHide
      content={page === "tools" ? <ToolsPage frank={frank} /> : <OverviewPage frank={frank} />}
    />
  );
}
