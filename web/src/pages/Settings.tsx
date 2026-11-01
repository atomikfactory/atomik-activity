import { useState } from "react";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { getApiBase, setApiBase } from "../api/client";
import { useQueryClient } from "@tanstack/react-query";

export function Settings() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const save = () => {
    setApiBase(apiUrl.trim());
    queryClient.invalidateQueries();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">Backend</div>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            API base URL
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="/api or http://localhost:3000/api"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            In dev, leave as <code>/api</code> — Vite proxies to the .NET API on
            port 3000.
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={save}>Save</Button>
            {saved && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Saved
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">About</div>
        </CardHeader>
        <CardBody className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Personal location dashboard. Reads from your local backend, no data
            ever leaves your network.
          </p>
          <p className="text-xs text-slate-400">
            Tiles © OpenStreetMap contributors, © CARTO.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
