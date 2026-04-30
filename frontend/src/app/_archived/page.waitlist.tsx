"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import {
  Anchor,
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe2,
  Lightbulb,
  MessageSquare,
  Kanban,
  Ship,
  Zap,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "Real-Time Chartering Chat",
    description:
      "Negotiate charter party terms in real-time messaging rooms with file sharing, read receipts, and instant notifications.",
  },
  {
    icon: Kanban,
    title: "Fixture Pipeline",
    description:
      "Manage your deals from lead to close with a visual kanban board and filterable table view across every stage.",
  },
  {
    icon: Zap,
    title: "AI Fixture Detection",
    description:
      "AI monitors your negotiations and automatically drafts fixtures when it detects a deal taking shape, complete with extracted terms.",
  },
  {
    icon: FileText,
    title: "Smart Recaps & Charter Parties",
    description:
      "Generate fixture recaps and charter party documents directly from accepted terms and chat context with one click.",
  },
  {
    icon: Lightbulb,
    title: "Deal Copilot",
    description:
      "Get AI-powered insights on every deal — surface gaps, ambiguities, and risks, with suggested messages you can send straight to the chat.",
  },
  {
    icon: Ship,
    title: "AI Issue Detection",
    description:
      "Automatically detect and flag potential issues in your fixtures. Review, resolve, or dismiss with full context from the negotiation.",
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    position: number;
    message: string;
    alreadyExists?: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  function validateEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validatePhone(v: string) {
    return /^\+?[\d\s\-().]{7,20}$/.test(v);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail || !trimmedPhone) {
      setError("Email and phone number are required.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, phone: trimmedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
      if (!data.alreadyExists) {
        setEmail("");
        setPhone("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      {/* Full-page video background (fixed so it fills the viewport while scrolling) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <video
          className="absolute inset-0 h-full min-h-full w-full min-w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        >
          <source src="/media/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-slate-950/20" aria-hidden />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <a href="#" className="flex items-center gap-3">
              <Image
                src="/logo.webp"
                alt="SPLASH"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                SPLASH
              </span>
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                How It Works
              </a>
            </div>
            <div className="flex items-center gap-3">
              <a href="#waitlist">
                <Button className="bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 shadow-lg shadow-cyan-500/25">
                  Join Waitlist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </nav>

        {/* Hero with Waitlist Form */}
        <section className="relative overflow-hidden pt-32 pb-32 md:pt-44 md:pb-40">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950/55"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-transparent to-blue-950/25"
            aria-hidden
          />
          <div className="pointer-events-none absolute top-20 left-1/4 z-[1] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[128px]" />
          <div className="pointer-events-none absolute top-40 right-1/4 z-[1] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[128px]" />

          <div className="relative z-10 mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300">
                <Globe2 className="h-3.5 w-3.5" />
                Built for maritime professionals
              </div>

              <div className="mb-8">
                <Image
                  src="/logo.webp"
                  alt="SPLASH Maritime Platform"
                  width={120}
                  height={120}
                  className="mx-auto rounded-2xl shadow-2xl shadow-cyan-500/20 ring-1 ring-white/10"
                  priority
                />
              </div>

              <h1 className="max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl">
                Maritime Chartering,{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">
                  Streamlined
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg text-slate-400 md:text-xl leading-relaxed">
                One intelligent platform to negotiate charter parties, extract
                fixture terms with AI, and generate recaps — all from the
                conversation.
              </p>

              {/* Waitlist Form */}
              <div
                id="waitlist"
                className="mt-12 w-full max-w-lg scroll-mt-24"
              >
                {result ? (
                  <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-8 backdrop-blur-xl shadow-2xl shadow-cyan-500/10">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-500/30">
                        <CheckCircle2 className="h-8 w-8 text-cyan-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">
                        {result.alreadyExists
                          ? "You're already on the list!"
                          : "You're on the list!"}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users className="h-4 w-4" />
                        <span>Your position in line:</span>
                      </div>
                      <div className="text-6xl font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">
                        #{result.position}
                      </div>
                      <p className="text-sm text-slate-400 mt-2">
                        We&apos;ll notify you when it&apos;s your turn. Stay
                        tuned!
                      </p>
                      {result.alreadyExists && (
                        <button
                          onClick={() => setResult(null)}
                          className="mt-2 text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
                        >
                          Use a different email
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 backdrop-blur-xl shadow-2xl"
                  >
                    <div className="mb-6 text-center">
                      <h3 className="text-xl font-semibold text-white">
                        Join the Waitlist
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Be first in line when we launch
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-1.5 block text-sm font-medium text-slate-300"
                        >
                          Email Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="phone"
                          className="mb-1.5 block text-sm font-medium text-slate-300"
                        >
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          required
                          pattern="\+?[\d\s\-().]{7,20}"
                          title="Enter a valid phone number (e.g. +1 555 000-0000)"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25"
                        />
                      </div>

                      {error && (
                        <p className="text-sm text-red-400 text-center">
                          {error}
                        </p>
                      )}

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 text-base bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 shadow-xl shadow-cyan-500/25 border-0 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            Join the Waitlist
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="relative bg-slate-900/35 py-24 backdrop-blur-sm md:py-32"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300 mb-4">
                <Anchor className="h-3.5 w-3.5" />
                Features
              </div>
              <h2 className="text-3xl font-bold text-white md:text-5xl">
                Everything you need to{" "}
                <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  close deals faster
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
                Purpose-built tools for the maritime chartering workflow, from
                first offer to signed charter party.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl border border-white/10 bg-slate-950/40 p-8 backdrop-blur-md transition-all hover:border-cyan-500/30 hover:bg-slate-950/55 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 ring-1 ring-cyan-500/20 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="relative border-y border-white/5 bg-slate-950/60 py-24 backdrop-blur-md md:py-32"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[128px]" />
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300 mb-4">
                <Ship className="h-3.5 w-3.5" />
                How It Works
              </div>
              <h2 className="text-3xl font-bold text-white md:text-5xl">
                From negotiation to{" "}
                <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                  recap in minutes
                </span>
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Start a Negotiation",
                  description:
                    "Open a chat with any counterparty by phone number. Share files, discuss terms, and negotiate in real time.",
                },
                {
                  step: "02",
                  title: "AI Extracts the Deal",
                  description:
                    "As you negotiate, AI detects fixtures forming in the conversation and drafts them automatically with extracted terms.",
                },
                {
                  step: "03",
                  title: "Generate Recap",
                  description:
                    "Review AI-extracted terms, accept or adjust, then generate a fixture recap and charter party document in one click.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-white/10 bg-slate-950/35 p-8 backdrop-blur-sm"
                >
                  <div className="mb-4 text-5xl font-bold bg-gradient-to-b from-cyan-400/40 to-transparent bg-clip-text text-transparent">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                  <ChevronRight className="absolute top-8 right-8 h-5 w-5 text-slate-700 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA - Join Waitlist */}
        <section className="relative bg-slate-900/45 py-24 backdrop-blur-sm md:py-32">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/40" />
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <Image
              src="/logo.webp"
              alt="SPLASH"
              width={64}
              height={64}
              className="mx-auto mb-8 rounded-xl shadow-lg shadow-cyan-500/20 ring-1 ring-white/10"
            />
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Ready to modernize your
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">
                chartering workflow?
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
              Join shipowners, charterers, and brokers on the waitlist for
              SPLASH.
            </p>
            <div className="mt-10 flex justify-center">
              <a href="#waitlist">
                <Button
                  size="lg"
                  className="h-13 px-10 text-base bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 shadow-xl shadow-cyan-500/25 border-0"
                >
                  Join the Waitlist
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-slate-950/80 py-12 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.webp"
                  alt="SPLASH"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-sm font-semibold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  SPLASH
                </span>
              </div>
              <div className="flex items-center gap-8">
                <a
                  href="#features"
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#waitlist"
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Join Waitlist
                </a>
              </div>
              <p className="text-sm text-slate-600">
                &copy; {new Date().getFullYear()} SPLASH Maritime Platform
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
