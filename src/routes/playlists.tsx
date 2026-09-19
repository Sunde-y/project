import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ListMusic, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMusic } from "@/lib/music-store";

export const Route = createFileRoute("/playlists")({
  head: () => ({
    meta: [
      { title: "Playlists — Sonora" },
      { name: "description", content: "Create, rename and reorder playlists from your local music." },
      { property: "og:title", content: "Playlists — Sonora" },
      { property: "og:description", content: "Your own mixes, drag-and-drop ordered." },
    ],
  }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const m = useMusic();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(m.playlists[0]?.id ?? null);
  const playlist = m.playlists.find((p) => p.id === selected) ?? null;
  const tracks = (playlist?.trackIds ?? [])
    .map((id) => m.library.find((t) => t.id === id))
    .filter(Boolean) as ReturnType<typeof useMusic>["library"];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Playlists</h1>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const pl = m.createPlaylist(name.trim());
          setSelected(pl.id);
          setName("");
          toast.success("Playlist created");
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          aria-label="New playlist name"
          className="max-w-xs rounded-xl"
        />
        <Button type="submit">
          <Plus className="size-4" aria-hidden />
          Create
        </Button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <ul className="space-y-1">
          {m.playlists.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <ListMusic className="mx-auto mb-2 size-6" aria-hidden />
              No playlists yet.
            </li>
          )}
          {m.playlists.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-1 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2",
                p.id === selected && "bg-accent text-accent-foreground",
              )}
            >
              <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(p.id)}>
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.trackIds.length} tracks</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Favorite ${p.name}`}
                onClick={() => m.togglePlaylistFavorite(p.id)}
              >
                <Heart className={cn("size-4", p.favorite && "fill-primary text-primary")} aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  m.deletePlaylist(p.id);
                  if (selected === p.id) setSelected(null);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        <div>
          {playlist ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={playlist.name}
                  aria-label="Playlist name"
                  onChange={(e) => m.renamePlaylist(playlist.id, e.target.value)}
                  className="max-w-sm rounded-xl text-lg font-semibold"
                />
                <Button
                  variant="secondary"
                  disabled={!tracks.length}
                  onClick={() => m.playTrack(tracks[0], tracks)}
                >
                  Play all
                </Button>
              </div>
              <p className="mt-2 mb-3 text-xs text-muted-foreground">
                Drag rows in the queue to reorder playback; use the buttons below to reorder this playlist.
              </p>
              <div className="space-y-1">
                {tracks.map((t, i) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      m.reorderPlaylist(playlist.id, Number(e.dataTransfer.getData("text/plain")), i);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2"
                  >
                    <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                    <button className="min-w-0 flex-1 text-left" onClick={() => m.playTrack(t, tracks)}>
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${t.title} from playlist`}
                      onClick={() => m.removeFromPlaylist(playlist.id, t.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                {tracks.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Right-click any track in your library to add it here.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select or create a playlist to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
