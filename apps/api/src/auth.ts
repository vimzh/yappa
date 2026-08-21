/** Google OAuth and database-backed session helpers for the API. */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { db, sessions, users } from "@yappa/db";
import { and, eq, gt } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const sessionCookieName = "yappa_session";
const oauthStateCookieName = "yappa_oauth_state";
const sessionDurationSeconds = 60 * 60 * 24 * 30;
const stateDurationSeconds = 60 * 10;

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export type AuthUser = typeof users.$inferSelect;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "Lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function requiredConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured.");
  }

  return { clientId, clientSecret, redirectUri };
}

function matchesState(received: string, expected: string) {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export function startGoogleOAuth(context: Context) {
  const { clientId, redirectUri } = requiredConfig();
  const state = randomToken();
  setCookie(context, oauthStateCookieName, state, cookieOptions(stateDurationSeconds));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return context.redirect(url.toString());
}

export async function finishGoogleOAuth(context: Context) {
  const receivedState = context.req.query("state");
  const expectedState = getCookie(context, oauthStateCookieName);
  deleteCookie(context, oauthStateCookieName, { path: "/" });

  if (!receivedState || !expectedState || !matchesState(receivedState, expectedState)) {
    throw new Error("Google OAuth state verification failed.");
  }

  const code = context.req.query("code");
  if (!code) throw new Error("Google did not return an authorization code.");

  const { clientId, clientSecret, redirectUri } = requiredConfig();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) throw new Error("Google could not exchange the authorization code.");

  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Google did not return an access token.");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) throw new Error("Google could not load your profile.");

  const profile = (await profileResponse.json()) as GoogleProfile;
  if (!profile.sub || !profile.email || !profile.email_verified) {
    throw new Error("Google must provide a verified email address.");
  }

  const now = new Date();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.googleSubject, profile.sub))
    .limit(1);
  const user = existing
    ? {
        ...existing,
        email: profile.email,
        name: profile.name?.trim() || profile.email,
        picture: profile.picture ?? null,
        updatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        googleSubject: profile.sub,
        email: profile.email,
        name: profile.name?.trim() || profile.email,
        picture: profile.picture ?? null,
        createdAt: now,
        updatedAt: now,
      };

  if (existing) {
    await db.update(users).set(user).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values(user);
  }

  const rawToken = randomToken();
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: hash(rawToken),
    expiresAt: new Date(now.getTime() + sessionDurationSeconds * 1000),
    createdAt: now,
  });
  setCookie(context, sessionCookieName, rawToken, cookieOptions(sessionDurationSeconds));
  return user;
}

export async function getAuthUser(context: Context): Promise<AuthUser | null> {
  const token = getCookie(context, sessionCookieName);
  if (!token) return null;

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.user ?? null;
}

export async function signOut(context: Context) {
  const token = getCookie(context, sessionCookieName);
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hash(token)));
  deleteCookie(context, sessionCookieName, { path: "/" });
}
