import { Link, useRouter } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cog,
  Disc3,
  Download,
  Heart,
  Home,
  ListMusic,
  Library,
  Moon,
  Search,
  Sun,
  Upload,
} from "lucide-react";
import { useRef, type ReactNode } from "react";
import { toast } from "sonner";

import { useMusic } from "@/lib/music-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerBar } from "@/components/PlayerBar";

const NAV = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/recent", label: "Recently Played", icon: Clock3 },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/settings", label: "Settings", icon: Cog },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { settings, updateSettings, importFiles, library } = useMusic();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const count = await importFiles(files);
    toast[count ? "success" : "error"](
      count ? `Imported ${count} track${count === 1 ? "" : "s"}` : "No supported audio files found",
    );
  };

  return (
    <div
      className="flex h-dvh flex-col bg-background"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void onFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <aside className="hidden w-60 shrink-0 flex-col gap-2 rounded-2xl bg-sidebar p-3 md:flex">
          <Link to="/" className="mb-3 flex items-center gap-2 px-2 py-1">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Disc3 className="size-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight">Sonora</span>
          </Link>

          <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => (
              <Link
                key={to}
                to={to}
                className="nav-item"
                activeOptions={{ exact: "exact" in rest ? rest.exact : false }}
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-xl bg-sidebar-accent p-3 text-sm">
            <p className="font-medium">{library.length} tracks</p>
            <p className="mt-0.5 text-xs text-muted-foreground">in your local library</p>
            <Button size="sm" className="mt-3 w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" aria-hidden />
              Import music
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <header className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 shadow-[var(--shadow-soft)]">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go back"
              onClick={() => router.history.back()}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go forward"
              onClick={() => router.history.forward()}
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>

            <form
              className="relative mx-2 max-w-md flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get("q");
                void router.navigate({ to: "/search", search: { q: String(q ?? "") } });
              }}
            >
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                placeholder="Search songs, albums, artists…"
                aria-label="Search music"
                className="rounded-xl border-transparent bg-surface-2 pl-9"
              />
            </form>

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Switch to ${settings.theme === "dark" ? "light" : "dark"} mode`}
              onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
            >
              {settings.theme === "dark" ? (
                <Sun className="size-5" aria-hidden />
              ) : (
                <Moon className="size-5" aria-hidden />
              )}
            </Button>
            <span
              className="ml-1 flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
              aria-label="Your profile"
            >
              YO
            </span>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-surface p-5 shadow-[var(--shadow-soft)] md:p-7">
            {children}
          </main>
        </div>
      </div>

      <PlayerBar />

      <input
        ref={fileRef}
        type="file"
        accept=".mp3,.flac,.wav,.aac,.ogg,.oga,.m4a,audio/*"
        multiple
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore directory picking
        webkitdirectory=""
        className="sr-only"
        onChange={(e) => void onFiles(e.target.files)}
      />
    </div>
  );
}
