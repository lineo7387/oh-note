"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Oops! Wrong email or password~");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="relative w-full max-w-md border-[3px] border-pencil bg-white p-8 shadow-sketch wobbly"
      >
        {/* Tape decoration */}
        <div
          className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-2 border-2 border-pencil bg-muted/60"
          style={{ borderRadius: "4px" }}
        />

        <h1
          className="mb-6 text-center text-4xl font-bold text-pencil"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Sign in to oh-note
        </h1>

        {error && (
          <div className="mb-4 border-2 border-accent bg-accent/10 p-3 text-accent wobbly-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-lg font-bold text-pencil">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="input-sketch w-full border-2 border-pencil bg-white px-4 py-3 text-lg text-pencil placeholder:text-pencil/40 wobbly-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-lg font-bold text-pencil">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="your secret..."
              className="input-sketch w-full border-2 border-pencil bg-white px-4 py-3 text-lg text-pencil placeholder:text-pencil/40 wobbly-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-sketch w-full border-[3px] border-pencil bg-white px-4 py-3 text-xl font-bold text-pencil shadow-sketch wobbly-md"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-lg text-pencil/70">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold text-pen-blue underline decoration-2 underline-offset-4 hover:text-accent">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
