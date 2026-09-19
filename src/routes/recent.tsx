import { createFileRoute } from "@tanstack/react-router";

import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { useMusic } from "@/lib/music-store";

export const Route = createFileRoute("/recent")({
  head: () => ({
    meta: [
      { title: "Recently Played — Sonora" },
      { name: "description", content: "Your listening history, with one-tap resume." },
      { property: "og:title", content: "Recently Played — Sonora" },
      { property: "og:description", content: "Jump back into what you were listening to." },
    ],
  }),
  component: RecentPage,
});

function RecentPage() {
  const m = useMusic();
  const tracks = m.recent
    .map((r) => m.library.find((t) => t.id === r.id))
    .filter(Boolean) as ReturnType<typeof useMusic>["library"];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recently played</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tracks.length} tracks in history</p>
        </div>
        <Button variant="secondary" onClick={m.clearHistory} disabled={!m.recent.length}>
          Clear history
        </Button>
      </div>
      <div className="mt-5">
        <TrackList tracks={tracks} emptyLabel="Play something and it'll show up here." />
      </div>
    </div>
  );
}
