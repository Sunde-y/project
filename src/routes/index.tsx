import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Play, Sparkles } from "lucide-react";

import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMusic } from "@/lib/music-store";
import { coverArtGroupUrl, musicBrainz } from "@/lib/musicbrainz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sonora — Your local music, beautifully organised" },
      {
        name: "description",
        content:
          "Play your local music collection with MusicBrainz metadata, playlists, favorites and a full-featured player.",
      },
      { property: "og:title", content: "Sonora — Your local music, beautifully organised" },
      {
        property: "og:description",
        content: "A soft, minimal music player for your own collection.",
      },
    ],
  }),
  component: Home,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Home() {
  const m = useMusic();
  const recent = m.recent
    .map((r) => m.library.find((t) => t.id === r.id))
    .filter(Boolean)
    .slice(0, 8) as ReturnType<typeof useMusic>["library"];

  const trending = useQuery({
    queryKey: ["trending-releases"],
    queryFn: () => musicBrainz.searchReleases("date:[2023 TO 2026] AND status:official", 12),
    staleTime: 1000 * 60 * 30,
  });

  const artists = useQuery({
    queryKey: ["popular-artists"],
    queryFn: () => musicBrainz.searchArtists("tag:pop OR tag:electronic", 10),
    staleTime: 1000 * 60 * 30,
  });

  const continueTrack = m.library.find((t) => t.id === m.position.trackId);

  return (
    <div>
      <div className="hero-gradient flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Sparkles className="size-4" aria-hidden /> Good to see you
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {m.library.length ? "Pick up where you left off" : "Bring your music in"}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {m.library.length
              ? `${m.library.length} tracks ready to play. Metadata is enriched from MusicBrainz.`
              : "Import a folder from the sidebar (or drop files anywhere) to build your library."}
          </p>
        </div>
        {continueTrack && (
          <Button size="lg" onClick={() => m.playTrack(continueTrack, m.library)}>
            <Play className="size-4" aria-hidden />
            Continue “{continueTrack.title}”
          </Button>
        )}
      </div>

      <Section title="Recently played">
        <TrackList tracks={recent} emptyLabel="Your listening history will appear here." />
      </Section>

      <Section title="Trending albums">
        {trending.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : trending.isError ? (
          <p className="text-sm text-muted-foreground">
            Couldn't reach MusicBrainz right now. Your local library still works offline.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {trending.data?.slice(0, 12).map((r) => (
              <article key={r.id} className="group surface-card overflow-hidden p-2 transition-transform hover:-translate-y-1">
                <img
                  src={coverArtGroupUrl(r.id)}
                  alt={`${r.title} cover art`}
                  loading="lazy"
                  className="aspect-square w-full rounded-xl bg-surface-2 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
                <p className="mt-2 truncate px-1 text-sm font-medium">{r.title}</p>
                <p className="mb-1 truncate px-1 text-xs text-muted-foreground">
                  {r.artist}
                  {r.year ? ` · ${r.year}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Popular artists">
        <div className="flex flex-wrap gap-3">
          {artists.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-44 rounded-2xl" />)
            : artists.data?.map((a) => (
                <div key={a.id} className="surface-card flex items-center gap-3 px-4 py-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {a.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.area ?? a.type ?? "Artist"}</p>
                  </div>
                </div>
              ))}
        </div>
      </Section>

      <Section title="Your library">
        <TrackList
          tracks={m.library.slice(0, 10)}
          emptyLabel="No local tracks yet — import a folder to get started."
        />
        {m.library.length > 10 && (
          <Link to="/library" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            View all {m.library.length} tracks
          </Link>
        )}
      </Section>
    </div>
  );
}
