"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { quintApi } from "@/lib/api";
import { User, UserRole, CompanyType } from "@/types";

interface SessionResponse {
  success: boolean;
  sessionId: string;
}

interface CodeSentResponse {
  success: boolean;
  sent: boolean;
}

interface VerifyResponse {
  success: boolean;
  verified: boolean;
  existingUser: boolean;
  user_id: string;
  access_token: string;
  device_id: string;
}

function phoneToSplashUser(userId: string, phone: string): User {
  const localpart = userId.replace(/^@/, "").split(":")[0];
  return {
    id: userId,
    email: "",
    firstName: localpart,
    lastName: "",
    role: UserRole.ADMIN,
    avatarUrl: null,
    phone,
    isActive: true,
    lastLoginAt: new Date().toISOString(),
    companyId: "quint",
    company: {
      id: "quint",
      name: "ONYX",
      type: CompanyType.OPERATOR,
      domain: null,
      logoUrl: null,
      address: null,
      phone: null,
      website: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const PIN_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleaned = phone.replace(/[\s()-]/g, "");
    if (!cleaned || cleaned.length < 7) {
      setError("Enter a valid phone number (include country code, e.g. +1...)");
      return;
    }
    const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

    setLoading(true);
    try {
      const session = await quintApi.post<SessionResponse>(
        "/v1/verification/session",
        { phoneNumber: normalized },
      );

      if (!session.sessionId) {
        setError("Failed to start verification. Try again.");
        return;
      }

      setSessionId(session.sessionId);

      await quintApi.post<CodeSentResponse>(
        `/v1/verification/session/${session.sessionId}/code`,
      );

      setStep("pin");
      setResendCooldown(60);
      setTimeout(() => pinRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not send code. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitPin = async (digits: string[]) => {
    const code = digits.join("");
    if (code.length !== PIN_LENGTH) return;

    setLoading(true);
    setError("");
    try {
      const res = await quintApi.post<VerifyResponse>(
        `/v1/verification/session/${sessionId}/code/check`,
        { code },
      );

      if (!res.verified || !res.access_token) {
        setError("Verification failed. Check the code and try again.");
        return;
      }

      const cleaned = phone.replace(/[\s()-]/g, "");
      const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
      const user = phoneToSplashUser(res.user_id, normalized);
      login(user, res.access_token, res.user_id);
      router.push("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (idx: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...pin];
    if (value.length > 1) {
      const chars = value.slice(0, PIN_LENGTH).split("");
      chars.forEach((ch, i) => {
        if (idx + i < PIN_LENGTH) next[idx + i] = ch;
      });
      setPin(next);
      const focusIdx = Math.min(idx + chars.length, PIN_LENGTH - 1);
      pinRefs.current[focusIdx]?.focus();
      if (next.every((d) => d !== "")) submitPin(next);
      return;
    }
    next[idx] = value;
    setPin(next);
    if (value && idx < PIN_LENGTH - 1) pinRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "")) submitPin(next);
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !sessionId) return;
    setError("");
    try {
      await quintApi.post<CodeSentResponse>(
        `/v1/verification/session/${sessionId}/code`,
      );
      setResendCooldown(60);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not resend code.";
      setError(msg);
    }
  };

  const goBackToPhone = () => {
    setStep("phone");
    setPin(Array(PIN_LENGTH).fill(""));
    setError("");
    setSessionId("");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label="SPLASH home"
          >
            <Image
              src="/logo.webp"
              alt=""
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold tracking-tight">SPLASH</span>
          </Link>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Maritime Chartering,
            <br />
            Streamlined.
          </h1>
          <p className="text-lg text-blue-200 max-w-md">
            Manage voyage negotiations, track charter party terms, and generate
            recaps &mdash; all from one intelligent platform.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-blue-300">Voyages Managed</div>
            </div>
            <div>
              <div className="text-3xl font-bold">98%</div>
              <div className="text-sm text-blue-300">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-blue-300">Real-time Tracking</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-blue-400">
          &copy; 2026 SPLASH Maritime Platform. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <Link
            href="/"
            className="flex items-center gap-3 lg:hidden rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label="SPLASH home"
          >
            <Image
              src="/logo.webp"
              alt=""
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold tracking-tight text-white">
              SPLASH
            </span>
          </Link>

          {step === "phone" ? (
            <>
              <div>
                <h2 className="text-3xl font-bold text-white">Welcome</h2>
                <p className="mt-2 text-blue-300">
                  Enter your phone number to sign in or create an account
                </p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="text-sm font-medium text-blue-200"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 555 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 pl-10 border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Include your country code (e.g. +1 for US).
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div>
                <button
                  onClick={goBackToPhone}
                  className="mb-4 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change number
                </button>
                <h2 className="text-3xl font-bold text-white">
                  Enter verification code
                </h2>
                <p className="mt-2 text-blue-300">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-white">{phone}</span>
                </p>
              </div>

              <div className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  {pin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { pinRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={PIN_LENGTH}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      disabled={loading}
                      className="h-14 w-12 rounded-lg border border-slate-700 bg-slate-800/50 text-center text-xl font-bold text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition-all disabled:opacity-50"
                    />
                  ))}
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </div>
                )}

                <div className="text-center">
                  <p className="text-sm text-slate-400">
                    Didn&apos;t receive the code?{" "}
                    {resendCooldown > 0 ? (
                      <span className="text-slate-500">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        onClick={handleResend}
                        className="font-medium text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
