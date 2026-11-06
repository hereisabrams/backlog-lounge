import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { currentUser, signInWithGoogle } from "@/lib/auth";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (await currentUser()) throw redirect({ to: "/room", replace: true });
  },
  component: AuthPage,
});

function AuthPage() {
  const [isWaiting, setIsWaiting] = useState(false);
  const navigate = useNavigate();
  useDocumentTitle("Sign in — Backlog Lounge", "Sign in to your retro game living room.");

  const signIn = async () => {
    setIsWaiting(true);
    try {
      await signInWithGoogle();
      navigate({ to: "/room", replace: true });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        console.error("Google sign-in failed", error);
        toast.error("Sign-in didn't go through. Try again.");
      }
    } finally {
      setIsWaiting(false);
    }
  };

  return (
    <div className="room-wall flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-wood-dark bg-card p-7 shadow-chunky">
        <Link to="/" className="font-display text-3xl text-primary">
          Backlog Lounge
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to the couch.</p>
        <button
          type="button"
          onClick={signIn}
          disabled={isWaiting}
          className="mt-6 flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-[#747775] bg-white px-3 text-sm font-medium text-[#1F1F1F] transition-opacity hover:bg-[#f8f8f8] disabled:opacity-60"
        >
          <GoogleMark />
          {isWaiting ? "Waiting for Google…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}
