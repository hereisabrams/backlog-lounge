import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { currentUser } from "@/lib/auth";
import { DEFAULT_CURRENCY } from "@/lib/games";
import { CurrencyContext, useAccountSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user) throw redirect({ to: "/auth" });

    return { user };
  },
  component: SignedInLayout,
});

function SignedInLayout() {
  const { data } = useAccountSettings();

  return (
    <CurrencyContext.Provider value={data?.currency ?? DEFAULT_CURRENCY}>
      <Outlet />
    </CurrencyContext.Provider>
  );
}
