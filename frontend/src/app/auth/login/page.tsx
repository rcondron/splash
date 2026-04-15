"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { matrixApi } from "@/lib/api";
import {
  SPOOF_AUTH_TOKEN,
  SPOOF_LOGIN_PASSWORD,
  SPOOF_LOGIN_USERNAME,
} from "@/lib/spoof";
import { User, UserRole, CompanyType } from "@/types";

const MATRIX_HOMESERVER = "100.25.66.46";

interface MatrixLoginResponse {
  access_token: string;
  device_id: string;
  user_id: string;
  home_server: string;
}

interface MatrixWhoamiResponse {
  user_id: string;
  device_id?: string;
}

function matrixUserToSplashUser(
  userId: string,
  whoami: MatrixWhoamiResponse,
): User {
  const localpart = userId.replace(/^@/, "").split(":")[0];
  const nameParts = localpart.split(/[._-]/);
  const firstName =
    nameParts[0]?.charAt(0).toUpperCase() + (nameParts[0]?.slice(1) ?? "");
  const lastName = nameParts[1]
    ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
    : "";

  return {
    id: whoami.user_id,
    email: `${localpart}@${MATRIX_HOMESERVER}`,
    firstName: firstName || localpart,
    lastName,
    role: UserRole.ADMIN,
    avatarUrl: null,
    phone: null,
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

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!username.trim()) return "Username is required";
    if (!password) return "Password is required";
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
      /* Offline demo: no Matrix / Quint requests */
      if (
        username.trim().toLowerCase() === SPOOF_LOGIN_USERNAME &&
        password === SPOOF_LOGIN_PASSWORD
      ) {
        const spoofUser: User = {
          id: "@spoof:splash.local",
          email: "spoof@splash.local",
          firstName: "Demo",
          lastName: "User",
          role: UserRole.ADMIN,
          avatarUrl: null,
          phone: null,
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          companyId: "spoof",
          company: {
            id: "spoof",
            name: "Offline demo",
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
        login(spoofUser, SPOOF_AUTH_TOKEN, "@spoof:splash.local");
        router.push("/dashboard");
        return;
      }

      const matrixUser = username.includes(":")
        ? username.startsWith("@")
          ? username
          : `@${username}`
        : `@${username}:${MATRIX_HOMESERVER}`;

      const res = await matrixApi.post<MatrixLoginResponse>(
        "/client/v3/login",
        {
          type: "m.login.password",
          identifier: {
            type: "m.id.user",
            user: matrixUser,
          },
          password,
          initial_device_display_name: "SPLASH Web Client",
        },
      );

      const whoami = await matrixApi.get<MatrixWhoamiResponse>(
        "/client/r0/account/whoami",
        {
          headers: { Authorization: `Bearer ${res.access_token}` },
        },
      );

      const user = matrixUserToSplashUser(res.user_id, whoami);
      login(user, res.access_token, res.user_id);
      router.push("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      if (msg.includes("M_FORBIDDEN") || msg.includes("Invalid username")) {
        setError("Invalid username or password.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

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
            Maritime Chartering,
            <br />
            Streamlined.
          </h1>
          <p className="text-lg text-blue-200 max-w-md">
            Manage voyage negotiations, track charter party terms, and generate
            recaps -- all from one intelligent platform.
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

          <div>
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="mt-2 text-blue-300">
              Sign in with your Quint account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-sm font-medium text-blue-200"
              >
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="e.g. johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-slate-500">
                Your Matrix username (without @user:server).{" "}
                <span className="text-amber-400/90">
                  Dev offline login: username{" "}
                  <code className="rounded bg-slate-800/80 px-1">spoof</code>{" "}
                  / password{" "}
                  <code className="rounded bg-slate-800/80 px-1">spoof</code>
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-blue-200"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-blue-300">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
            >
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
