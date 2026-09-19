import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMusic, type Track } from "@/lib/music-store";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Sonora" },
      { name: "description", content: "Browse your local music by artist, album, genre and year." },
      { property: "og:title", content: "Library — Sonora" },
      { property: "og:description", content: "Every track you own, sorted the way you like." },
    ],
  }),
  component: LibraryPage,
});

type SortKey = "alpha" | "added" | "duration" | "plays" | "recent";

function groupBy(tracks: Track[], key: (t: Track) => string) {
  const map = new Map<string, Track[]>();
  for (const t of tracks) {
    const k = key(t) || "Unknown";
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function LibraryPage() {
  const m = useMusic();
  const [sort, setSort] = useState<SortKey>("added");
  const [editing, setEditing] = useState<Track | null>(null);

  const sorted = useMemo(() => {
    const list = [...m.library];
    switch (sort) {
      case "alpha":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case "duration":
        return list.sort((a, b) => b.duration - a.duration);
      case "plays":
        return list.sort((a, b) => b.playCount - a.playCount);
      case "recent":
        return list.sort(
          (a, b) =>
            (m.recent.find((r) => r.id === b.id)?.at ?? 0) - (m.recent.find((r) => r.id === a.id)?.at ?? 0),
        );
      default:
        return list.sort((a, b) => b.addedAt - a.addedAt);
    }
  }, [m.library, m.recent, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {m.library.length} tracks · MP3, FLAC, WAV, AAC, OGG and M4A supported
          </p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-52 rounded-xl" aria-label="Sort tracks">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="added">Date added</SelectItem>
            <SelectItem value="alpha">Alphabetical</SelectItem>
            <SelectItem value="duration">Duration</SelectItem>
            <SelectItem value="plays">Most played</SelectItem>
            <SelectItem value="recent">Recently played</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="songs" className="mt-5">
        <TabsList className="rounded-xl">
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="genres">Genres</TabsTrigger>
          <TabsTrigger value="years">Years</TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="mt-5">
          <TrackList tracks={sorted} emptyLabel="Import a folder from the sidebar to fill your library." />
          {sorted.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sorted.slice(0, 12).map((t) => (
                <Button key={t.id} variant="outline" size="sm" onClick={() => setEditing(t)}>
                  <Pencil className="size-3.5" aria-hidden />
                  Edit “{t.title}”
                </Button>
              ))}
            </div>
          )}
        </TabsContent>

        {(
          [
            ["artists", (t: Track) => t.artist],
            ["albums", (t: Track) => t.album],
            ["genres", (t: Track) => t.genre ?? "Unclassified"],
            ["years", (t: Track) => t.year ?? "Unknown year"],
          ] as const
        ).map(([value, key]) => (
          <TabsContent key={value} value={value} className="mt-5 space-y-6">
            {groupBy(m.library, key).map(([name, tracks]) => (
              <section key={name}>
                <h2 className="mb-2 text-sm font-semibold">
                  {name} <span className="text-muted-foreground">({tracks.length})</span>
                </h2>
                <TrackList tracks={tracks} />
              </section>
            ))}
            {m.library.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing imported yet.</p>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit metadata</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                m.updateTrack(editing.id, {
                  title: String(fd.get("title")),
                  artist: String(fd.get("artist")),
                  album: String(fd.get("album")),
                  genre: String(fd.get("genre")),
                  year: String(fd.get("year")),
                });
                toast.success("Metadata updated");
                setEditing(null);
              }}
            >
              {(
                [
                  ["title", "Title", editing.title],
                  ["artist", "Artist", editing.artist],
                  ["album", "Album", editing.album],
                  ["genre", "Genre", editing.genre ?? ""],
                  ["year", "Year", editing.year ?? ""],
                ] as const
              ).map(([name, label, val]) => (
                <div key={name} className="space-y-1.5">
                  <Label htmlFor={name}>{label}</Label>
                  <Input id={name} name={name} defaultValue={val} />
                </div>
              ))}
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
