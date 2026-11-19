import { ExternalLink, PlayCircle } from "lucide-react";
import type { InnovationMedia } from "@/lib/api-types";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

function VideoPlayer({
  video,
  label,
  prominent = false,
}: {
  video: InnovationMedia;
  label: string;
  prominent?: boolean;
}) {
  const { t } = usePrefs();
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-2xl border bg-navy text-navy-foreground shadow-card",
        prominent && "shadow-lift",
      )}
    >
      <video
        controls
        preload="none"
        playsInline
        poster={video.thumbnailUrl ?? "/images/video-placeholder.svg"}
        className="aspect-video w-full bg-navy"
        aria-label={label}
      >
        <source src={video.url} type={video.mimeType} />
        <span className="block p-4 text-sm">
          {t("media.videos.unsupported")}{" "}
          <a href={video.url} className="underline" target="_blank" rel="noreferrer">
            {t("media.videos.open")}
          </a>
        </span>
      </video>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-navy-foreground/70">
        <span className="inline-flex items-center gap-1.5">
          <PlayCircle className="size-3.5 text-gold" /> {label}
        </span>
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-navy-foreground"
        >
          <ExternalLink className="size-3.5" /> {t("media.videos.open")}
        </a>
      </figcaption>
    </figure>
  );
}

export function InnovationVideoSection({ videos }: { videos: InnovationMedia[] }) {
  const { t } = usePrefs();
  const firstVideo = videos[0];
  if (!firstVideo) return null;
  const pitch = videos.find((video) => video.designation === "pitch") ?? firstVideo;
  const demonstrations = videos.filter((video) => video.id !== pitch.id);

  return (
    <>
      <section aria-labelledby="pitch-video-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <PlayCircle className="size-4" /> {t("media.videos.pitchTitle")}
            </p>
            <h2 id="pitch-video-title" className="mt-1 text-xl font-bold text-foreground">
              {t("media.videos.pitchTitle")}
            </h2>
            {pitch.originalFilename && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {pitch.originalFilename}
              </p>
            )}
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("media.videos.pitchHelp")}
            </p>
          </div>
          <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[0.7rem] font-semibold text-accent-foreground">
            {t("media.videos.primary")}
          </span>
        </div>
        <div className="mt-4">
          <VideoPlayer video={pitch} label={t("media.videos.pitchTitle")} prominent />
        </div>
      </section>

      {demonstrations.length > 0 && (
        <section aria-labelledby="demo-video-title">
          <h2 id="demo-video-title" className="text-xl font-bold text-foreground">
            {t("media.videos.demoTitle")}
          </h2>
          <div className={cn("mt-4 grid gap-4", demonstrations.length > 1 && "md:grid-cols-2")}>
            {demonstrations.map((video) => (
              <VideoPlayer key={video.id} video={video} label={t("media.videos.demo")} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
