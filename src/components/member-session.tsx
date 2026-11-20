"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setCommunityOwner } from "@/lib/community-store";
import { resetCommunityViewer } from "@/lib/community-remote-store";
import { setPersonalPlanOwner } from "@/lib/personal-plan-store";
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
  const owner = useRef<string | null | undefined>(undefined);
  const switchOwner = useCallback((id: string | null | undefined) => {
    if (owner.current === id) return;
    owner.current = id;
    setCommunityOwner(id);
    setPersonalPlanOwner(id);
    resetCommunityViewer();
  }, []);
  const channel = useRef<BroadcastChannel | null>(null);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const accept = useCallback((session: MemberSession, clearDraft = false) => {
    current.current = session;
    switchOwner(session.user?.id ?? null);
    applyMemberProfile(session.user?.id ?? null, session.profile, { clearDraft });
    setState({ ...session, loaded: true, error: null });
  }, [switchOwner]);
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
    const sessionChanged = (announced: unknown) => {
      if (announced !== owner.current) {
        switchOwner(undefined);
        current.current = { user: null, profile: null };
        setState({ ...current.current, loaded: false, error: null });
      }
      void refresh();
    };
    const fromStorage = (event: StorageEvent) => {
      if (event.key === SOCIAL_SESSION_EVENT) sessionChanged(event.newValue || null);
    };
    window.addEventListener("storage", fromStorage);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(SOCIAL_SESSION_EVENT);
      channel.current.onmessage = event => sessionChanged(event?.data);
    }
    return () => {
      invalidate();
      window.removeEventListener("storage", fromStorage);
      window.removeEventListener(SOCIAL_SESSION_EVENT, refreshVisible);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      channel.current?.close(); channel.current = null;
    };
  }, [refresh, invalidate, switchOwner]);
  function announce(id: string | null) {
    channel.current?.postMessage(id);
    try { window.localStorage.setItem(SOCIAL_SESSION_EVENT, id ?? ""); } catch { /* Focus also rechecks the session. */ }
  }
  const authenticate: SessionContext["authenticate"] = async (mode, input) => {
    revision.current++;
    const session = await socialRequest<MemberSession>(mode, { method: "POST", body: JSON.stringify(input) });
    revision.current++; accept(session); announce(session.user?.id ?? null);
    return session;
  };
  const logout = async () => {
    revision.current++;
    await socialRequest("logout", { method: "POST", body: "{}" }, current.current.user?.id);
    revision.current++; accept({ user: null, profile: null }); announce(null);
  };
  const saveProfile = async (profile: MemberProfile | null) => {
    const user = current.current.user;
    if (!user) throw new Error("unauthorized");
    revision.current++;
    const result = await socialRequest<{ profile: MemberProfile | null }>("profile", { method: "PUT", body: JSON.stringify({ profile }) }, user.id);
    if (current.current.user?.id !== user.id) throw new Error("session_changed");
    revision.current++; accept({ user, profile: result.profile }, true); announce(user.id);
  };
  return <MemberContext.Provider value={{ ...state, refresh, authenticate, logout, saveProfile }}>{children}</MemberContext.Provider>;
}

export function useMemberSession() {
  const session = useContext(MemberContext);
  if (!session) throw new Error("MemberSessionProvider is missing");
  return session;
}
