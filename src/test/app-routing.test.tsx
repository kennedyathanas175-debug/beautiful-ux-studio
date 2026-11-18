import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders need an API that
// the unit test run does not start, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each([
    "/explore",
    "/innovators",
    "/innovators/neema-mushi",
    "/institutions",
    "/opportunities",
    "/auth",
    "/reset-password",
    "/dashboard",
    "/dashboard/innovations",
    "/dashboard/innovations/new",
    "/dashboard/saved",
    "/dashboard/requests",
    "/dashboard/applications",
    "/dashboard/notifications",
    "/dashboard/profile",
    "/moderation",
  ])("matches the %s page", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(path);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
