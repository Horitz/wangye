import { redirect } from "next/navigation";

export const metadata = { title: "社区管理 · StudentPath", robots: { index: false, follow: false } };

export default function Page() { redirect("/me#account"); }
