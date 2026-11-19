import { useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InnovationMedia } from "@/lib/api-types";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export function MediaGallery({ images, title }: { images: InnovationMedia[]; title: string }) {
  const { t } = usePrefs();
  const [active, setActive] = useState<number | null>(null);
  if (images.length === 0) return null;
  const current = active === null ? null : images[active];
  const go = (direction: number) => {
    if (active === null) return;
    setActive((active + direction + images.length) % images.length);
  };

  return (
    <section aria-labelledby="media-gallery-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="media-gallery-title"
          className="flex items-center gap-2 text-xl font-bold text-foreground"
        >
          <Images className="size-5 text-gold" /> {t("media.gallery.title")}
        </h2>
        <span className="text-sm text-muted-foreground">
          {images.length} {t("media.gallery.counter")}
        </span>
      </div>
      <div className={cn("mt-4 grid gap-3", images.length > 1 && "sm:grid-cols-2 lg:grid-cols-4")}>
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "group relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted text-left shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              images.length > 1 &&
                index === 0 &&
                "sm:col-span-2 sm:row-span-2 sm:aspect-[4/3] lg:aspect-auto",
            )}
            aria-label={`${t("media.gallery.open")}: ${image.originalFilename}`}
          >
            <img
              src={image.thumbnailUrl ?? image.url}
              alt={`${title} – ${index + 1}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/80 to-transparent p-3 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {image.originalFilename}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-hidden border-navy bg-navy p-0 text-navy-foreground">
          <DialogTitle className="sr-only">{title} gallery</DialogTitle>
          <DialogDescription className="sr-only">
            Expanded innovation image gallery.
          </DialogDescription>
          {current && (
            <div className="relative">
              <img
                src={current.url}
                alt={`${title} – ${active! + 1}`}
                className="max-h-[82vh] w-full object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-navy to-transparent px-4 pb-4 pt-12 text-sm">
                <span className="truncate text-navy-foreground/85">{current.originalFilename}</span>
                <span className="shrink-0 text-navy-foreground/70">
                  {active! + 1} / {images.length}
                </span>
              </div>
              {images.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="onNavy"
                    size="icon"
                    onClick={() => go(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full"
                    aria-label="Previous image"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="onNavy"
                    size="icon"
                    onClick={() => go(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full"
                    aria-label="Next image"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
