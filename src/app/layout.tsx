import type { Metadata } from "next";
import { MemberSessionProvider } from "@/components/member-session";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-sc";
import "@fontsource/zcool-kuaile/400.css";
import "@fontsource/rubik-dirt/400.css";
import "@fontsource/lxgw-wenkai-tc/400.css";
import "@fontsource/neucha/400.css";
import "./globals.css";
import "./glass-controls.css";
import "./content-tags.css";
import "./locale-layout.css";

export const metadata: Metadata = {
  title: "StudentPath — 每一步，都更清楚",
  description: "为在俄罗斯的留学生整理办事指南、官方来源和下一步行动。Навигатор иностранного студента.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning><body><MemberSessionProvider>{children}</MemberSessionProvider></body></html>;
}
