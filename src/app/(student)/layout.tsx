import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import "../spatial.css";
import "../characters.css";
import "../workspace.css";
import "../workspace-ambient.css";
import "../preparation.css";
import "../surface-materials.css";
import "../essentials.css";
import "../guide-reader.css";
import "../guide-gallery.css";
import "../swipe-carousel.css";
import "../editorial.css";
import "../youth-ui.css";
import "../campus-sketch.css";
import "../content-post.css";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
