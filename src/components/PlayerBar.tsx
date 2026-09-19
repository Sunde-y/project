import {
  Heart,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatTime, useMusic } from "@/lib/music-store";

export function PlayerBar() {
  const m = useMusic();
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const track = m.current;
  const isFav = track ? m.favorites.includes(track.id) : false;

  return (
    <div className="border-t border-border bg-surface px-3 py-2.5 md:px-5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
            {track?.cover ? (
              <img src={track.cover} alt="" className="size-full object-cover" />
            ) : (
              <ListMusic className="size-5 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{track?.title ?? "Nothing playing"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {track?.artist ?? "Import your music to get started"}
            </p>
          </div>
          {track && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              onClick={() => m.toggleFavorite(track.id)}
            >
              <Heart className={cn("size-4", isFav && "fill-primary text-primary")} aria-hidden />
            </Button>
          )}
        </div>

        <div className="flex max-w-2xl flex-[2] flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Shuffle"
              aria-pressed={m.shuffle}
              onClick={m.toggleShuffle}
            >
              <Shuffle className={cn("size-4", m.shuffle && "text-primary")} aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Previous track" onClick={m.prev}>
              <SkipBack className="size-5" aria-hidden />
            </Button>
            <Button
              size="icon"
              aria-label={m.isPlaying ? "Pause" : "Play"}
              className="size-11 rounded-full transition-transform hover:scale-105"
              onClick={m.toggle}
            >
              {m.isPlaying ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next track" onClick={m.next}>
              <SkipForward className="size-5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Repeat: ${m.repeat}`}
              onClick={m.cycleRepeat}
            >
              {m.repeat === "one" ? (
                <Repeat1 className="size-4 text-primary" aria-hidden />
              ) : (
                <Repeat className={cn("size-4", m.repeat === "all" && "text-primary")} aria-hidden />
              )}
            </Button>
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
              {formatTime(m.progress)}
            </span>
            <Slider
              aria-label="Seek"
              value={[m.progress]}
              max={m.duration || track?.duration || 1}
              step={1}
              onValueChange={([v]) => m.seek(v)}
              className="flex-1"
            />
            <span className="w-10 text-[11px] tabular-nums text-muted-foreground">
              {formatTime(m.duration || track?.duration || 0)}
            </span>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-1 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Lyrics"
            aria-pressed={lyricsOpen}
            onClick={() => setLyricsOpen((v) => !v)}
          >
            <Mic2 className={cn("size-4", lyricsOpen && "text-primary")} aria-hidden />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open queue">
                <ListMusic className="size-4" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-96 flex-col">
              <SheetHeader>
                <SheetTitle>Queue</SheetTitle>
              </SheetHeader>
              <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
                {m.queue.length === 0 && (
                  <p className="text-sm text-muted-foreground">The queue is empty.</p>
                )}
                {m.queue.map((t, i) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      m.moveInQueue(Number(e.dataTransfer.getData("text/plain")), i);
                    }}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-surface-2",
                      t.id === track?.id && "bg-accent text-accent-foreground",
                    )}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => m.playTrack(t, m.queue)}
                    >
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${t.title} from queue`}
                      onClick={() => m.removeFromQueue(t.id)}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
              {m.queue.length > 0 && (
                <div className="border-t border-border p-4">
                  <Button variant="secondary" className="w-full" onClick={m.clearQueue}>
                    Clear queue
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            aria-label={m.muted ? "Unmute" : "Mute"}
            onClick={m.toggleMute}
          >
            {m.muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
          </Button>
          <Slider
            aria-label="Volume"
            className="w-28"
            value={[m.muted ? 0 : m.volume * 100]}
            max={100}
            onValueChange={([v]) => m.setVolume(v / 100)}
          />
        </div>
      </div>

      {lyricsOpen && (
        <div className="mt-2 rounded-xl bg-surface-2 p-4 text-sm text-muted-foreground">
          Lyrics aren't available for this track. MusicBrainz doesn't distribute lyrics — a lyrics
          provider can be plugged into the metadata layer later.
        </div>
      )}
    </div>
  );
}
