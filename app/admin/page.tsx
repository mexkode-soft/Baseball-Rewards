"use client";

import {
  useEffect,
} from "react";
import {
  useRouter,
} from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const role =
      localStorage.getItem(
        "hrr-demo-role"
      );

    router.replace(
      role === "admin"
        ? "/admin/crear-campana"
        : "/admin/perfil"
    );
  }, [router]);

  return null;
}