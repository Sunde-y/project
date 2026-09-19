import { Heart, ListPlus, Music2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { formatTime, useMusic, type Track } from "@/lib/music-store";
import { toast } from "sonner";

export function TrackList({ tracks, emptyLabel }: { tracks: Track[]; emptyLabel?: string }) {
  const m = useMusic();

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
        <Music2 className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{emptyLabel ?? "Nothing here yet."}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {tracks.map((t, i) => {
        const isCurrent = m.current?.id === t.id;
        const fav = m.favorites.includes(t.id);
        return (
          <ContextMenu key={t.id}>
            <ContextMenuTrigger asChild>
              <li
                className={cn(
                  "group flex items-center gap-3 bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2",
                  isCurrent && "bg-accent/60",
                )}
              >
                <span className="w-6 text-center text-xs tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Play ${t.title}`}
                  onClick={() => {
                    if (!t.url) {
                      toast.info("Metadata-only result — import the audio file to play it.");
                      return;
                    }
                    m.playTrack(t, tracks);
                  }}
                >
                  <Play className="size-4" aria-hidden />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.artist} · {t.album}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {t.source === "local" ? "Local" : t.source === "audius" ? "Audius" : "MusicBrainz"}
                </span>
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {formatTime(t.duration)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={fav ? `Unfavorite ${t.title}` : `Favorite ${t.title}`}
                  onClick={() => m.toggleFavorite(t.id)}
                >
                  <Heart className={cn("size-4", fav && "fill-primary text-primary")} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Add ${t.title} to queue`}
                  onClick={() => {
                    m.enqueue(t);
                    toast.success("Added to queue");
                  }}
                >
                  <ListPlus className="size-4" aria-hidden />
                </Button>
              </li>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => m.playTrack(t, tracks)}>Play now</ContextMenuItem>
              <ContextMenuItem onSelect={() => m.enqueue(t)}>Add to queue</ContextMenuItem>
              <ContextMenuItem onSelect={() => m.toggleFavorite(t.id)}>
                {fav ? "Remove from favorites" : "Add to favorites"}
              </ContextMenuItem>
              <ContextMenuSeparator />
              {m.playlists.length === 0 ? (
                <ContextMenuItem disabled>No playlists yet</ContextMenuItem>
              ) : (
                m.playlists.map((p) => (
                  <ContextMenuItem
                    key={p.id}
                    onSelect={() => {
                      m.addToPlaylist(p.id, t.id);
                      toast.success(`Added to ${p.name}`);
                    }}
                  >
                    Add to “{p.name}”
                  </ContextMenuItem>
                ))
              )}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </ul>
  );
}
