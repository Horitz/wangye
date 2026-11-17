"use client";

import { useEffect, useRef, useState } from "react";
import { hubContentDefault, type HubContent } from "@/data/hub-content";

export function useHubContent() {
  const [document, setDocument] = useState(hubContentDefault);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    const request = ++revision.current;
    async function load() {
      try {
        const response = await fetch("/api/hub", { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const result = await response.json();
        if (active && request === revision.current) setDocument(result.document ?? hubContentDefault);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);
  async function save(next: HubContent) {
    const response = await fetch("/api/hub", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    if (!response.ok) throw new Error(response.status === 401 ? "unauthorized" : "save");
    const result = await response.json();
    revision.current++;
    setDocument(result.document);
    setError(false);
  }
  return { document, loading, error, save };
}
