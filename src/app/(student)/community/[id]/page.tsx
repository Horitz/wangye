import type { Metadata } from "next";
import { CommunityDetail } from "@/components/community-detail";
import "@/app/community.css";

export const metadata: Metadata = { title: "社区笔记 · StudentPath" };

export default async function CommunityDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityDetail key={id} id={id} />;
}
