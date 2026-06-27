import { Outlet } from "react-router-dom";

// Mobile-first shell. Each route sets its own max width so the scorecard can
// break out to full width in landscape while setup stays a phone column.
export function AppLayout() {
  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <Outlet />
    </div>
  );
}
