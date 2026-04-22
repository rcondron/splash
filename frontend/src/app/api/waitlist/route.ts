import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const WAITLIST_FILE = path.join(process.cwd(), "waitlist.json");
const STARTING_POSITION = 283;

interface WaitlistEntry {
  email: string;
  phone: string;
  position: number;
  joinedAt: string;
}

async function getWaitlist(): Promise<WaitlistEntry[]> {
  try {
    const data = await fs.readFile(WAITLIST_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveWaitlist(entries: WaitlistEntry[]) {
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!email || !phone) {
      return NextResponse.json(
        { error: "Email and phone number are required." },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!PHONE_RE.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid phone number." },
        { status: 400 }
      );
    }

    const waitlist = await getWaitlist();

    const existing = waitlist.find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        {
          message: "You're already on the waitlist!",
          position: existing.position,
          alreadyExists: true,
        },
        { status: 200 }
      );
    }

    const position = STARTING_POSITION + waitlist.length + 1;
    const newEntry: WaitlistEntry = {
      email,
      phone,
      position,
      joinedAt: new Date().toISOString(),
    };

    waitlist.push(newEntry);
    await saveWaitlist(waitlist);

    return NextResponse.json(
      { message: "Welcome to the waitlist!", position },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
