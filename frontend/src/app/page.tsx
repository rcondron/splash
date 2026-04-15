"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import {
  Anchor,
  ArrowRight,
  BarChart3,
  FileText,
  Globe2,
  MessageSquare,
  Shield,
  Ship,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Ship,
    title: "Voyage Management",
    description:
      "Track every voyage from fixture to completion with real-time status updates and milestone tracking.",
  },
  {
    icon: MessageSquare,
    title: "Negotiation Hub",
    description:
      "Centralize all charter party negotiations in threaded conversations with full audit trails.",
  },
  {
    icon: FileText,
    title: "Smart Recaps",
    description:
      "Auto-generate fixture recaps from negotiation threads with AI-powered term extraction.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Monitor fleet performance, deal flow, and market trends with real-time analytics.",
  },
  {
    icon: Shield,
    title: "Compliance & Audit",
    description:
      "Complete audit trail for every action with exportable logs for regulatory compliance.",
  },
  {
    icon: Zap,
    title: "AI-Powered Insights",
    description:
      "Extract key terms, summarize conversations, and flag risks automatically with AI assistance.",
  },
];

const stats = [
  { value: "500+", label: "Voyages Managed" },
  { value: "50+", label: "Shipping Companies" },
  { value: "98%", label: "Accuracy Rate" },
  { value: "24/7", label: "Real-time Tracking" },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated && token) {
      router.replace("/dashboard");
    }
  }, [mounted, isAuthenticated, token, router]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && token) return null;

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
        {/* Light global tint so sections can use transparency consistently */}
        <div className="absolute inset-0 bg-slate-950/20" aria-hidden />
      </div>

      <div className="relative z-10">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
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
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#stats" className="text-sm text-slate-400 hover:text-white transition-colors">
              Results
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-white/5"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button className="bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 shadow-lg shadow-cyan-500/25">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — stronger overlay for headline legibility */}
      <section className="relative overflow-hidden pt-32 pb-32 md:pt-44 md:pb-40">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950/55"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-transparent to-blue-950/25" aria-hidden />
        {/* Gradient orbs (subtle, on top of scrim) */}
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
              One intelligent platform to manage voyage negotiations, track
              charter party terms, generate recaps, and close deals faster.
            </p>
          </div>
        </div>
      </section>

      {/* Stats — medium scrim, glass card */}
      <section
        id="stats"
        className="relative border-y border-white/5 bg-slate-950/50 py-10 text-slate-100 backdrop-blur-md md:py-12"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-2xl border border-white/15 bg-slate-900/35 p-8 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features — lighter scrim so video shows through more */}
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

      {/* How it works — deeper scrim */}
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
              From fixture to{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                recap in minutes
              </span>
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create a Voyage",
                description:
                  "Set up your voyage with vessel details, cargo specs, and laycan dates. Invite counterparties to negotiate.",
              },
              {
                step: "02",
                title: "Negotiate Terms",
                description:
                  "Use threaded conversations to negotiate charter party terms. AI extracts and tracks key clauses automatically.",
              },
              {
                step: "03",
                title: "Generate Recap",
                description:
                  "Once terms are agreed, generate a fixture recap with one click. Export as PDF or share directly.",
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

      {/* CTA — balanced mid transparency */}
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
            Join leading shipowners, charterers, and brokers already using
            SPLASH to close deals faster and smarter.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/auth/login">
              <Button
                size="lg"
                className="h-13 px-10 text-base bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 shadow-xl shadow-cyan-500/25 border-0"
              >
                Sign In
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — strongest scrim for small text */}
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
              <a href="#features" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                How It Works
              </a>
              <Link href="/auth/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                Sign In
              </Link>
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
