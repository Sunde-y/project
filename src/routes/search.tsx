import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { TrackList } from "@/components/TrackList";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMusic, type Track } from "@/lib/music-store";
import { musicBrainz } from "@/lib/musicbrainz";
import { searchAudiusTracks } from "@/lib/audius";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({
    meta: [
      { title: "Search — Sonora" },
      { name: "description", content: "Search songs, albums, artists and genres across your library and MusicBrainz." },
      { property: "og:title", content: "Search — Sonora" },
      { property: "og:description", content: "Find any song, album or artist in seconds." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const m = useMusic();
  const [scope, setScope] = useState<"all" | "local" | "favorites" | "recent">("all");

  const local = m.library.filter((t) => {
    const hay = `${t.title} ${t.artist} ${t.album} ${t.genre ?? ""}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (scope === "favorites") return m.favorites.includes(t.id);
    if (scope === "recent") return m.recent.some((r) => r.id === t.id);
    return true;
  });

  const remote = useQuery({
    queryKey: ["mb-search", q],
    queryFn: async () => {
      const [recordings, releases, artists] = await Promise.all([
        musicBrainz.searchRecordings(q, 20),
        musicBrainz.searchReleases(q, 12),
        musicBrainz.searchArtists(q, 12),
      ]);
      return { recordings, releases, artists };
    },
    enabled: q.trim().length > 1 && scope !== "local",
    staleTime: 1000 * 60 * 10,
  });

  const remoteTracks: Track[] = (remote.data?.recordings ?? []).map((r) => ({
    id: `mb-${r.id}`,
    title: r.title,
    artist: r.artist,
    album: r.album ?? "—",
    year: r.year,
    duration: r.duration ?? 0,
    addedAt: 0,
    playCount: 0,
    source: "metadata",
  }));

  // Audius — public, keyless catalog. Results are fully playable in-app
  // (streamUrl goes straight into the <audio> element), no import needed.
  const audius = useQuery({
    queryKey: ["audius-search", q],
    queryFn: () => searchAudiusTracks(q, 20),
    enabled: q.trim().length > 1 && scope !== "local",
    staleTime: 1000 * 60 * 10,
  });

  const audiusTracks: Track[] = (audius.data ?? []).map((r) => ({
    id: `audius-${r.id}`,
    title: r.title,
    artist: r.artist,
    album: "Audius",
    genre: r.genre,
    duration: r.duration,
    url: r.streamUrl,
    cover: r.artwork,
    addedAt: 0,
    playCount: 0,
    source: "audius",
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <Input
        autoFocus
        value={q}
        onChange={(e) => navigate({ to: "/search", search: { q: e.target.value }, replace: true })}
        placeholder="Songs, albums, artists, genres…"
        aria-label="Search query"
        className="mt-4 h-12 rounded-2xl bg-surface-2 text-base"
      />

      <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)} className="mt-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="all">Everything</TabsTrigger>
          <TabsTrigger value="local">Local only</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="recent">Recently added</TabsTrigger>
        </TabsList>
        <TabsContent value={scope} className="mt-5 space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              In your library
            </h2>
            <TrackList tracks={local} emptyLabel="No matching tracks in your library." />
          </section>

          {scope !== "local" && q.trim().length > 1 && (
            <>
              <section>
                <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Play now on Audius
                </h2>
                <p className="mb-3 -mt-2 text-xs text-muted-foreground">
                  Streams directly from Audius's open catalog — tap play, no download or import needed.
                </p>
                {audius.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                  </div>
                ) : audius.isError ? (
                  <p className="text-sm text-muted-foreground">Audius is unreachable right now.</p>
                ) : (
                  <TrackList tracks={audiusTracks} emptyLabel="No tracks found on Audius." />
                )}
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Songs on MusicBrainz
                </h2>
                {remote.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                  </div>
                ) : remote.isError ? (
                  <p className="text-sm text-muted-foreground">MusicBrainz is unreachable right now.</p>
                ) : (
                  <TrackList tracks={remoteTracks} emptyLabel="No recordings found." />
                )}
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Albums &amp; artists
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {remote.data?.releases.map((r) => (
                    <div key={r.id} className="surface-card px-4 py-3">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.artist}
                        {r.year ? ` · ${r.year}` : ""}
                      </p>
                    </div>
                  ))}
                  {remote.data?.artists.map((a) => (
                    <div key={a.id} className="surface-card px-4 py-3">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[a.type, a.area, ...(a.tags ?? [])].filter(Boolean).join(" · ") || "Artist"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
