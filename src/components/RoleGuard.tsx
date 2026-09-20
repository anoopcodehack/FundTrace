"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";

interface RoleGuardProps {
  allowedRoles: ("ADMIN" | "CREATOR" | "DONOR")[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { userRole, isLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!userRole || !allowedRoles.includes(userRole))) {
      router.replace("/");
    }
  }, [userRole, isLoading, allowedRoles, router]);

  if (isLoading) {
    return <div className="p-8 text-center text-stone-500 font-mono text-sm animate-pulse">Checking access...</div>;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-4xl font-black font-display text-stone-900 mb-4">Access Denied</h2>
        <p className="text-stone-500 max-w-md">
          You do not have the required role to view this page. Please connect an authorized wallet.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
