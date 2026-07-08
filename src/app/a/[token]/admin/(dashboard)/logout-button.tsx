"use client";

import { useRouter } from "next/navigation";
import { NavActionButton } from "@/components/ui/nav-action-button";

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3H21" />
    </svg>
  );
}

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const res = await fetch("/api/admin/logout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    router.replace(typeof data.redirectTo === "string" ? data.redirectTo : "/");
    router.refresh();
  }

  return (
    <NavActionButton icon={<LogoutIcon />} onClick={handleLogout}>
      ログアウト
    </NavActionButton>
  );
}
