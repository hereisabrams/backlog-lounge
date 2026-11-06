import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/firebase";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorScreen,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        router.invalidate();
        if (!user) {
          queryClient.clear();

          return;
        }

        queryClient.invalidateQueries();
      }),
    [router, queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl text-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">No signal on this channel</h1>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Back to the couch
        </Link>
      </div>
    </div>
  );
}

function ErrorScreen({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("Route failed to load", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
