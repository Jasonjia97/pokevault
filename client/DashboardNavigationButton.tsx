export function activateDashboardNavigation(
  event: { preventDefault: () => void },
  onNavigate: (path: string) => void,
): void {
  event.preventDefault();
  onNavigate("/dashboard");
}

export function DashboardNavigationButton({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  return (
    <a
      className="dashboard-nav-button"
      href="/dashboard"
      aria-label="Go to Dashboard"
      onClick={(event) => activateDashboardNavigation(event, onNavigate)}
    >
      Dashboard
    </a>
  );
}
