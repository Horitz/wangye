import type { Metadata } from "next";
import { CommunityPage } from "@/components/community-page";
import { isSchoolId } from "@/data/school-options";
import "@/app/community.css";

export const metadata: Metadata = { title: "留学社区 · StudentPath" };

export default async function CommunityRoute({ searchParams }: { searchParams: Promise<{ view?: string; school?: string }> }) {
  const { view, school } = await searchParams;
  const initialView = view === "saved" || view === "discussion" ? view : "discover";
  return <CommunityPage initialView={initialView} initialSchool={isSchoolId(school) ? school : undefined} />;
}
