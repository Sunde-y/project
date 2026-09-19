import { createFileRoute } from "@tanstack/react-router";

import { TrackList } from "@/components/TrackList";
import { useMusic } from "@/lib/music-store";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites — Sonora" },
      { name: "description", content: "Your favorite songs, albums and artists in one place." },
      { property: "og:title", content: "Favorites — Sonora" },
      { property: "og:description", content: "Everything you loved, one tap away." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const m = useMusic();
  const songs = m.library.filter((t) => m.favorites.includes(t.id));
  const albums = [...new Set(songs.map((t) => t.album))];
  const artists = [...new Set(songs.map((t) => t.artist))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Favorites</h1>
        <p className="mt-1 text-sm text-muted-foreground">{songs.length} favorited songs</p>
      </div>

      <TrackList tracks={songs} emptyLabel="Tap the heart on any track to save it here." />

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Albums</h2>
        <div className="flex flex-wrap gap-2">
          {albums.length === 0 && <p className="text-sm text-muted-foreground">No albums yet.</p>}
          {albums.map((a) => (
            <span key={a} className="surface-card px-4 py-2 text-sm">
              {a}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Artists</h2>
        <div className="flex flex-wrap gap-2">
          {artists.length === 0 && <p className="text-sm text-muted-foreground">No artists yet.</p>}
          {artists.map((a) => (
            <span key={a} className="surface-card px-4 py-2 text-sm">
              {a}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
