"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { dayInZone, zoneCookie } from "@/lib/diary";

export function DiaryClock({ day }: { day: string }) {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = zoneCookie + "=" + encodeURIComponent(zone) + "; Path=/; SameSite=Lax; Max-Age=31536000" + secure;
    let refreshing = false;
    function checkDay() {
      if (!refreshing && dayInZone(zone) !== day) {
        refreshing = true;
        router.refresh();
      }
    }
    checkDay();
    const timer = window.setInterval(checkDay, 30000);
    window.addEventListener("focus", checkDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkDay);
    };
  }, [day, router]);

  return null;
}
