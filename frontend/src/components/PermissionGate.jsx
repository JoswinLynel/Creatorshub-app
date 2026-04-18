import React from "react";
import { useAuth } from "@/lib/store";
import { has } from "@/lib/permissions";

export const PermissionGate = ({ permission, children, fallback = null }) => {
  const { user } = useAuth();
  if (!permission || has(user, permission)) return <>{children}</>;
  return fallback;
};

export default PermissionGate;
