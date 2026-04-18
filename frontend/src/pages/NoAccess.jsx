import React from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/store";

export default function NoAccess() {
  const { user } = useAuth();
  return (
    <div className="p-10 flex items-center justify-center min-h-[70vh]">
      <div className="ch-card p-10 max-w-md text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 mb-4">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-display font-medium">You don't have access to this page</h2>
        <p className="text-sm text-ink-tertiary mt-2">
          Your role (<span className="text-ink">{user?.role}</span>) doesn't include this permission.
          Ask your workspace owner to update your access.
        </p>
      </div>
    </div>
  );
}
