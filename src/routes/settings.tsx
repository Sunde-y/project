import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMusic } from "@/lib/music-store";
import { WatchedFolders } from "@/components/WatchedFolders";
import { clearMetadataCache, metadataCacheSize } from "@/lib/musicbrainz";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Sonora" },
      { name: "description", content: "Appearance, playback, library and metadata preferences." },
      { property: "og:title", content: "Settings — Sonora" },
      { property: "og:description", content: "Tune Sonora to the way you listen." },
    ],
  }),
  component: SettingsPage,
});

const ACCENTS = [
  { id: "green", label: "Pastel green" },
  { id: "blue", label: "Muted blue" },
  { id: "violet", label: "Soft violet" },
  { id: "amber", label: "Warm amber" },
] as const;

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const { settings, updateSettings } = useMusic();

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <WatchedFolders />

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Appearance</h2>
        <div className="divide-y divide-border">
          <Row label="Theme">
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((t) => (
                <Button
                  key={t}
                  variant={settings.theme === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSettings({ theme: t })}
                >
                  {t === "light" ? "Light" : "Dark"}
                </Button>
              ))}
            </div>
          </Row>
          <Row label="Accent color">
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  aria-label={a.label}
                  aria-pressed={settings.accent === a.id}
                  onClick={() => updateSettings({ accent: a.id })}
                  className={cn(
                    "size-8 rounded-full border-2 transition-transform hover:scale-110",
                    settings.accent === a.id ? "border-foreground" : "border-transparent",
                  )}
                  style={{
                    backgroundColor: `oklch(0.68 0.12 ${
                      a.id === "green" ? 152 : a.id === "blue" ? 250 : a.id === "violet" ? 300 : 75
                    })`,
                  }}
                />
              ))}
            </div>
          </Row>
          <Row label="Font size" hint="Scales the whole interface">
            <Slider
              aria-label="Font size"
              className="w-48"
              min={85}
              max={130}
              step={5}
              value={[settings.fontScale * 100]}
              onValueChange={([v]) => updateSettings({ fontScale: v / 100 })}
            />
          </Row>
          <Row label="High contrast" hint="Stronger borders and text contrast">
            <Switch
              checked={settings.highContrast}
              onCheckedChange={(v) => updateSettings({ highContrast: v })}
            />
          </Row>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Playback</h2>
        <div className="divide-y divide-border">
          <Row label="Default volume">
            <Slider
              aria-label="Default volume"
              className="w-48"
              value={[settings.defaultVolume * 100]}
              max={100}
              onValueChange={([v]) => updateSettings({ defaultVolume: v / 100 })}
            />
          </Row>
          <Row label="Gapless playback" hint="Preload the next track for seamless albums">
            <Switch checked={settings.gapless} onCheckedChange={(v) => updateSettings({ gapless: v })} />
          </Row>
          <Row label="Crossfade" hint="Blend the end of one track into the next">
            <Switch checked={settings.crossfade} onCheckedChange={(v) => updateSettings({ crossfade: v })} />
          </Row>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Music &amp; metadata</h2>
        <div className="divide-y divide-border">
          <Row label="Auto scan imported folders" hint="Rescan folders when new files are added">
            <Switch checked={settings.autoScan} onCheckedChange={(v) => updateSettings({ autoScan: v })} />
          </Row>
          <Row label="API timeout (seconds)" hint="MusicBrainz request timeout">
            <Input
              type="number"
              min={3}
              max={60}
              className="w-24"
              value={settings.apiTimeout}
              onChange={(e) => updateSettings({ apiTimeout: Number(e.target.value) })}
            />
          </Row>
          <Row label="Metadata cache" hint={`${metadataCacheSize()} cached responses`}>
            <Button
              variant="secondary"
              onClick={() => {
                clearMetadataCache();
                toast.success("Metadata cache cleared");
              }}
            >
              Clear cache
            </Button>
          </Row>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Metadata comes from MusicBrainz and the Cover Art Archive. Library, playlists, favorites, history
        and settings are stored on this device.
      </p>
    </div>
  );
}
