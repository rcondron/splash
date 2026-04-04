"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Anchor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { CompanyType, User } from "@/types";

interface RegisterResponse {
  access_token: string;
  user: User;
}

const companyTypeLabels: Record<CompanyType, string> = {
  [CompanyType.SHIPOWNER]: "Ship Owner",
  [CompanyType.CHARTERER]: "Charterer",
  [CompanyType.BROKER]: "Broker",
  [CompanyType.OPERATOR]: "Operator",
};

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companyType: "" as CompanyType | "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validate = () => {
    if (!form.firstName.trim()) return "First name is required";
    if (!form.lastName.trim()) return "Last name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email address";
    if (!form.password) return "Password is required";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.companyName.trim()) return "Company name is required";
    if (!form.companyType) return "Company type is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<RegisterResponse>("/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        companyType: form.companyType,
      });
      login(res.user, res.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "h-11 border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500";

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <Anchor className="h-6 w-6 text-white" />
            </div>
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
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <Anchor className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">SPLASH</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white">Create your account</h2>
            <p className="mt-2 text-blue-300">
              Set up your company and admin profile
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-blue-200">
                  First Name
                </label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className={inputClasses}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-blue-200">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className={inputClasses}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-blue-200">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClasses}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-blue-200">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className={inputClasses}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-blue-200">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  className={inputClasses}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium text-blue-200">
                Company Name
              </label>
              <Input
                id="companyName"
                placeholder="Acme Shipping Ltd."
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className={inputClasses}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-200">Company Type</label>
              <Select
                value={form.companyType}
                onValueChange={(v) => update("companyType", v)}
                disabled={loading}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Select your company type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CompanyType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {companyTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-blue-300">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
