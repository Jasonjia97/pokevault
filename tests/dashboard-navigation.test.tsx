import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  activateDashboardNavigation,
  DashboardNavigationButton,
} from "../client/DashboardNavigationButton";

describe("Dashboard navigation", () => {
  it("renders a clearly labeled link to the Dashboard route", () => {
    const markup = renderToStaticMarkup(
      <DashboardNavigationButton onNavigate={() => {}} />,
    );

    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain('aria-label="Go to Dashboard"');
    expect(markup).toContain('class="dashboard-nav-button"');
    expect(markup).toContain(">Dashboard</a>");
  });

  it("uses the app's navigation callback when activated", () => {
    let prevented = false;
    let destination = "";
    activateDashboardNavigation(
      { preventDefault: () => { prevented = true; } },
      (path) => { destination = path; },
    );

    expect(prevented).toBe(true);
    expect(destination).toBe("/dashboard");
  });
});
