"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="SPLASH"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold tracking-tight">SPLASH</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Start Managing
            <br />
            Your Fleet Today.
          </h1>
          <p className="text-lg text-blue-200 max-w-md">
            Create your company account and invite your team. Get started with
            AI-powered voyage management in minutes.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "AI-powered term extraction from emails",
              "Real-time voyage negotiation tracking",
              "Automated recap and contract generation",
              "Complete audit trail for compliance",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-blue-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-blue-400">
          &copy; 2026 SPLASH Maritime Platform. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image
              src="/logo.webp"
              alt="SPLASH"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold tracking-tight text-white">
              SPLASH
            </span>
          </div>

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
              <Shield className="h-8 w-8 text-blue-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white">Request Access</h2>
              <p className="mt-3 text-blue-300 leading-relaxed">
                SPLASH accounts are provisioned by your organization&apos;s
                administrator through the Quint platform. Contact your team lead
                or ONYX admin to get your credentials.
              </p>
            </div>

            <div className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-5 text-left space-y-3">
              <p className="text-sm font-medium text-white">
                To get started, you&apos;ll need:
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  A Matrix username and password from your admin
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  Network access to the Quint homeserver
                </li>
              </ul>
            </div>

            <Link href="/auth/login" className="w-full">
              <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
