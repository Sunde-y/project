import { createFileRoute } from "@tanstack/react-router";
import { HardDriveDownload, Monitor } from "lucide-react";

import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { useMusic } from "@/lib/music-store";

const DESKTOP_INSTALLER = {
  href: "/desktop/Sonora-Setup-1.0.0.exe",
  filename: "Sonora-Setup-1.0.0.exe",
  version: "1.0.0",
  sizeLabel: "124 MB",
};

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — Sonora" },
      { name: "description", content: "Files available offline on this device." },
      { property: "og:title", content: "Downloads — Sonora" },
      { property: "og:description", content: "Everything stored locally and playable offline." },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const m = useMusic();
  const offline = m.library.filter((t) => t.source === "local");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Downloads</h1>
      <p className="mt-1 mb-5 flex items-center gap-2 text-sm text-muted-foreground">
        <HardDriveDownload className="size-4" aria-hidden />
        {offline.length} tracks are stored on this device and play without a connection.
      </p>

      <section className="surface-card mb-8 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Monitor className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold">Sonora for Windows</h2>
            <p className="text-sm text-muted-foreground">
              The desktop app with local library scanning and offline playback. Version{" "}
              {DESKTOP_INSTALLER.version} · {DESKTOP_INSTALLER.sizeLabel} installer.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <a href={DESKTOP_INSTALLER.href} download={DESKTOP_INSTALLER.filename}>
            <HardDriveDownload className="size-4" aria-hidden />
            Download for Windows
          </a>
        </Button>
      </section>

      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Offline tracks
      </h2>
      <TrackList tracks={offline} emptyLabel="Imported files appear here as offline-ready tracks." />
    </div>
  );
}
