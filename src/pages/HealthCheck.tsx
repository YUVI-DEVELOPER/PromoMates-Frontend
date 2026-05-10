import { useEffect, useState } from "react";

import { getHealth, type HealthResponse } from "../api/health";


type HealthState =
  | { status: "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };


export function HealthCheck() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    getHealth()
      .then((data) => {
        if (isMounted) {
          setHealth({ status: "success", data });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          const message =
            error instanceof Error ? error.message : "Backend health check failed.";
          setHealth({ status: "error", message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">System Health</h2>
      </div>

      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {health.status === "loading" && (
          <p className="text-sm font-medium text-slate-700">Checking backend...</p>
        )}

        {health.status === "success" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">Backend online</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-slate-600">Status</dt>
              <dd className="text-slate-950">{health.data.status}</dd>
              <dt className="font-medium text-slate-600">Service</dt>
              <dd className="text-slate-950">{health.data.service}</dd>
            </dl>
          </div>
        )}

        {health.status === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              <p className="text-sm font-semibold text-rose-700">Backend unavailable</p>
            </div>
            <p className="text-sm text-slate-700">{health.message}</p>
          </div>
        )}
      </div>
    </section>
  );
}
