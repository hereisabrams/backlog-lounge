import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { currentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user) throw redirect({ to: "/auth" });

    return { user };
  },
  component: Outlet,
});
