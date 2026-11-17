"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { applyMemberProfile } from "@/lib/home-store";
import type { MemberProfile } from "@/lib/member-profile.mjs";
import { SOCIAL_SESSION_EVENT, socialErrorCode, socialRequest, type SocialUser } from "@/lib/social-client";

export type { MemberProfile } from "@/lib/member-profile.mjs";
export type MemberSession = { user: SocialUser | null; profile: MemberProfile | null };
type SessionContext = MemberSession & {
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  authenticate: (mode: "login" | "register", input: { username: string; password: string; displayName?: string }) => Promise<MemberSession>;
  logout: () => Promise<void>;
  saveProfile: (profile: MemberProfile | null) => Promise<void>;
};
const MemberContext = createContext<SessionContext | null>(null);

export function MemberSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ loaded: boolean; error: string | null } & MemberSession>({ loaded: false, error: null, user: null, profile: null });
  const current = useRef<MemberSession>({ user: null, profile: null });
  const revision = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const accept = useCallback((session: MemberSession, clearDraft = false) => {
    current.current = session;
    applyMemberProfile(session.user?.id ?? null, session.profile, { clearDraft });
    setState({ ...session, loaded: true, error: null });
  }, []);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    try {
      const session = await socialRequest<MemberSession>("session");
      if (request === revision.current) accept(session);
    } catch (error) {
      if (request === revision.current) setState(previous => ({ ...previous, loaded: true, error: socialErrorCode(error) }));
    }
  }, [accept]);
  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState !== "hidden") void refresh(); };
    refreshVisible();
    window.addEventListener(SOCIAL_SESSION_EVENT, refreshVisible);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(SOCIAL_SESSION_EVENT);
      channel.current.onmessage = () => { void refresh(); };
    }
    return () => {
      invalidate();
      window.removeEventListener(SOCIAL_SESSION_EVENT, refreshVisible);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      channel.current?.close(); channel.current = null;
    };
  }, [refresh, invalidate]);
  const authenticate: SessionContext["authenticate"] = async (mode, input) => {
    revision.current++;
    const session = await socialRequest<MemberSession>(mode, { method: "POST", body: JSON.stringify(input) });
    revision.current++; accept(session); channel.current?.postMessage("changed");
    return session;
  };
  const logout = async () => {
    revision.current++;
    await socialRequest("logout", { method: "POST", body: "{}" }, current.current.user?.id);
    revision.current++; accept({ user: null, profile: null }); channel.current?.postMessage("changed");
  };
  const saveProfile = async (profile: MemberProfile | null) => {
    const user = current.current.user;
    if (!user) throw new Error("unauthorized");
    revision.current++;
    const result = await socialRequest<{ profile: MemberProfile | null }>("profile", { method: "PUT", body: JSON.stringify({ profile }) }, user.id);
    if (current.current.user?.id !== user.id) throw new Error("session_changed");
    revision.current++; accept({ user, profile: result.profile }, true); channel.current?.postMessage("changed");
  };
  return <MemberContext.Provider value={{ ...state, refresh, authenticate, logout, saveProfile }}>{children}</MemberContext.Provider>;
}

export function useMemberSession() {
  const session = useContext(MemberContext);
  if (!session) throw new Error("MemberSessionProvider is missing");
  return session;
}
