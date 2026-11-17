import { Suspense } from "react";
import ExplorePage, { ExploreLoading } from "@/components/explore-page";
import "@/app/explore-flow.css";

export default function ExploreRoute() {
  return <Suspense fallback={<ExploreLoading />}><ExplorePage /></Suspense>;
}
