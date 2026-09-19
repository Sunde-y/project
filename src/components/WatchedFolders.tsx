import { useCallback, useEffect, useState } from "react";
import { FolderPlus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getDesktop } from "@/lib/desktop";

export function WatchedFolders() {
  const api = getDesktop();
  const [folders, setFolders] = useState<{ path: string; added_at: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!api) return;
    setFolders(await api.folders.list());
  }, [api]);

  useEffect(() => {
    void refresh();
    if (!api) return;
    return api.on("scan:progress", (p) => {
      const { done, total } = p as { done: number; total: number };
      setProgress(done >= total ? null : `Scanning ${done}/${total} files…`);
    });
  }, [api, refresh]);

  if (!api) {
    return (
      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Music folders</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Folder watching, embedded tag reading and the local library database run in the desktop
          build of Sonora. Launch the packaged app to select folders on your disk.
        </p>
      </section>
    );
  }

  const pick = async () => {
    setBusy(true);
    try {
      const picked = await api.folders.pick();
      if (picked.length) toast.success(`Added ${picked.length} folder(s)`);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Music folders</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void api.folders.rescan()}>
            <RefreshCw className="mr-1.5 size-4" /> Rescan
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void pick()}>
            <FolderPlus className="mr-1.5 size-4" /> Add folder
          </Button>
        </div>
      </div>
      {progress && <p className="mt-2 text-xs text-muted-foreground">{progress}</p>}
      <ul className="mt-3 space-y-2">
        {folders.length === 0 && (
          <li className="text-sm text-muted-foreground">No folders watched yet.</li>
        )}
        {folders.map((f) => (
          <li key={f.path} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
            <span className="truncate text-sm">{f.path}</span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Stop watching ${f.path}`}
              onClick={async () => {
                await api.folders.remove(f.path);
                await refresh();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
