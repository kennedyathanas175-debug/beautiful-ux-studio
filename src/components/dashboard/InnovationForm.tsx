import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Film,
  ImagePlus,
  Images,
  Loader2,
  RefreshCw,
  Save,
  Star,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Innovation, InnovationMedia, Stage, CategoryId } from "@/lib/api-types";
import { TANZANIA_REGIONS, categories, stages } from "@/data/catalog";
import { api, ApiError, errorMessage } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { usePrefs } from "@/lib/prefs";
import {
  MAX_INNOVATION_IMAGES,
  MAX_INNOVATION_VIDEOS,
  formatBytes,
  generateVideoPoster,
  validateImageClient,
  validateVideoClient,
} from "@/lib/media";
import { useInstitutionOptions } from "@/lib/queries";

interface NewImage {
  key: string;
  file: File;
  preview: string;
}

interface NewVideo {
  key: string;
  file: File;
  preview: string;
  poster: File;
  posterPreview: string;
}

interface FormState {
  title: string;
  tagline: string;
  description: string;
  problem: string;
  solution: string;
  objectives: string;
  tech: string;
  category: CategoryId;
  stage: Stage;
  institution: string;
  region: string;
  link: string;
  status: "draft" | "published";
  teamEmails: string;
}

const emptyForm: FormState = {
  title: "",
  tagline: "",
  description: "",
  problem: "",
  solution: "",
  objectives: "",
  tech: "",
  category: "agriculture",
  stage: "concept",
  institution: "",
  region: "Dar es Salaam",
  link: "",
  status: "published",
  teamEmails: "",
};

function initialState(item?: Innovation): FormState {
  if (!item) return emptyForm;
  return {
    title: item.title,
    tagline: item.tagline,
    description: item.description,
    problem: item.problem,
    solution: item.solution,
    objectives: item.objectives.join("\n"),
    tech: item.tech.join(", "),
    category: item.category,
    stage: item.stage,
    institution: item.institution?.slug ?? "",
    region: item.region,
    link: item.link,
    status: item.status === "draft" ? "draft" : "published",
    teamEmails: "",
  };
}

function videoKeyFor(media: InnovationMedia): string {
  return `existing:${media.id}`;
}

export function InnovationForm({ item }: { item?: Innovation }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const institutions = useInstitutionOptions();
  const { t, lang } = usePrefs();
  const [form, setForm] = useState<FormState>(() => initialState(item));
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const initialMedia = item?.media ?? [];
  const [existingMedia, setExistingMedia] = useState<InnovationMedia[]>(initialMedia);
  const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [newVideos, setNewVideos] = useState<NewVideo[]>([]);
  const [primaryVideoKey, setPrimaryVideoKey] = useState<string | null>(() => {
    const videos = initialMedia.filter((media) => media.kind === "video");
    const pitch = videos.find((media) => media.designation === "pitch") ?? videos[0];
    return pitch ? videoKeyFor(pitch) : null;
  });
  const [mediaError, setMediaError] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const fieldError = (name: string) => fields[name]?.[0];
  const existingImages = existingMedia.filter(
    (media) => media.kind === "image" && !removedMediaIds.includes(media.id),
  );
  const existingVideos = existingMedia.filter(
    (media) => media.kind === "video" && !removedMediaIds.includes(media.id),
  );
  const imageCount = existingImages.length + newImages.length;
  const videoCount = existingVideos.length + newVideos.length;
  const videoKeys = [
    ...existingVideos.map(videoKeyFor),
    ...newVideos.map((video) => `new:${video.key}`),
  ];
  const effectivePrimaryKey =
    primaryVideoKey && videoKeys.includes(primaryVideoKey)
      ? primaryVideoKey
      : (videoKeys[0] ?? null);

  const pitchTips =
    lang === "sw"
      ? [
          "Wewe ni nani na unajenga nini?",
          "Tatizo unalotaka kutatua ni lipi?",
          "Suluhisho lako ni lipi?",
          "Ubunifu wako unafanyaje kazi?",
          "Uko katika hatua gani ya maendeleo?",
          "Matokeo yanayowezekana Tanzania au zaidi ni yapi?",
        ]
      : [
          "Who are you and what are you building?",
          "What problem does your innovation address?",
          "What is your proposed solution?",
          "How does the innovation work?",
          "What development stage are you at?",
          "What impact could it have in Tanzania or beyond?",
        ];

  const rememberUrl = (url: string) => {
    objectUrls.current.push(url);
    return url;
  };

  const releaseUrl = (url: string) => {
    URL.revokeObjectURL(url);
    objectUrls.current = objectUrls.current.filter((value) => value !== url);
  };

  const choosePrimaryAfterRemoval = (removedKey: string) => {
    if (primaryVideoKey !== removedKey) return;
    const remaining = videoKeys.filter((key) => key !== removedKey);
    setPrimaryVideoKey(remaining[0] ?? null);
  };

  const addImages = (files: File[]) => {
    setMediaError("");
    const available = MAX_INNOVATION_IMAGES - imageCount;
    if (available <= 0) {
      setMediaError(t("media.errors.imagesLimit"));
      return;
    }
    const accepted: NewImage[] = [];
    for (const file of files) {
      const validation = validateImageClient(file);
      if (validation) {
        setMediaError(
          `${validation.message.includes("larger") ? t("media.errors.imageSize") : t("media.errors.imageType")} (${file.name})`,
        );
        continue;
      }
      if (accepted.length >= available) {
        setMediaError(t("media.errors.imagesLimit"));
        break;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        preview: rememberUrl(URL.createObjectURL(file)),
      });
    }
    setNewImages((current) => [...current, ...accepted]);
  };

  const addVideos = async (files: File[]) => {
    setMediaError("");
    const available = MAX_INNOVATION_VIDEOS - videoCount;
    if (available <= 0) {
      setMediaError(t("media.errors.videosLimit"));
      return;
    }
    const acceptedFiles: File[] = [];
    for (const file of files) {
      const validation = validateVideoClient(file);
      if (validation) {
        setMediaError(
          `${validation.message.includes("larger") ? t("media.errors.videoSize") : t("media.errors.videoType")} (${file.name})`,
        );
        continue;
      }
      if (acceptedFiles.length >= available) {
        setMediaError(t("media.errors.videosLimit"));
        break;
      }
      acceptedFiles.push(file);
    }
    if (acceptedFiles.length === 0) return;
    setMediaBusy(true);
    try {
      const videos = await Promise.all(
        acceptedFiles.map(async (file) => {
          const poster = await generateVideoPoster(file);
          return {
            key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
            file,
            preview: rememberUrl(URL.createObjectURL(file)),
            poster,
            posterPreview: rememberUrl(URL.createObjectURL(poster)),
          };
        }),
      );
      setNewVideos((current) => [...current, ...videos]);
      if (!effectivePrimaryKey && videos[0]) setPrimaryVideoKey(`new:${videos[0].key}`);
    } finally {
      setMediaBusy(false);
    }
  };

  const removeExistingMedia = (media: InnovationMedia) => {
    setRemovedMediaIds((current) => [...current, media.id]);
    if (media.kind === "video") choosePrimaryAfterRemoval(videoKeyFor(media));
  };

  const removeNewImage = (image: NewImage) => {
    releaseUrl(image.preview);
    setNewImages((current) => current.filter((item) => item.key !== image.key));
  };

  const removeNewVideo = (video: NewVideo) => {
    releaseUrl(video.preview);
    releaseUrl(video.posterPreview);
    setNewVideos((current) => current.filter((item) => item.key !== video.key));
    choosePrimaryAfterRemoval(`new:${video.key}`);
  };

  const handleImageInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) addImages(files);
    event.target.value = "";
  };

  const handleVideoInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) void addVideos(files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length) addImages(files);
  };

  const appendMediaFields = (data: FormData) => {
    removedMediaIds.forEach((id) => data.append("removeMediaIds", String(id)));
    newImages.forEach((image) => data.append("images", image.file, image.file.name));
    newVideos.forEach((video) => {
      data.append("videos", video.file, video.file.name);
      data.append("videoPosters", video.poster, video.poster.name);
    });
    if (effectivePrimaryKey?.startsWith("existing:")) {
      data.append("primaryVideoId", effectivePrimaryKey.replace("existing:", ""));
    } else if (effectivePrimaryKey?.startsWith("new:")) {
      const key = effectivePrimaryKey.slice(4);
      const index = newVideos.findIndex((video) => video.key === key);
      if (index >= 0) data.append("primaryVideoIndex", String(index));
    }
  };

  const mediaPayload = () => {
    const payload: Record<string, unknown> = {};
    if (removedMediaIds.length) payload["removeMediaIds"] = removedMediaIds;
    if (effectivePrimaryKey?.startsWith("existing:")) {
      payload["primaryVideoId"] = Number(effectivePrimaryKey.replace("existing:", ""));
    } else if (effectivePrimaryKey?.startsWith("new:")) {
      const key = effectivePrimaryKey.slice(4);
      const index = newVideos.findIndex((video) => video.key === key);
      if (index >= 0) payload["primaryVideoIndex"] = index;
    }
    return payload;
  };

  const submit = async (event: FormEvent, status?: "draft" | "published") => {
    event.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    const targetStatus = status ?? form.status;
    const objectives = form.objectives
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const tech = form.tech
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    const teamEmails = form.teamEmails
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    const includingTeam = form.teamEmails.trim().length > 0;

    if (mediaBusy) {
      setError(t("media.uploading"));
      setBusy(false);
      return;
    }

    const basePayload = {
      title: form.title,
      tagline: form.tagline,
      description: form.description,
      problem: form.problem,
      solution: form.solution,
      objectives,
      tech,
      category: form.category,
      stage: form.stage,
      institution: form.institution || null,
      region: form.region,
      link: form.link,
      status: targetStatus,
      ...(includingTeam ? { teamEmails } : {}),
    };

    try {
      let result: Innovation;
      const needsMultipart = Boolean(image || newImages.length || newVideos.length);
      if (needsMultipart) {
        const data = new FormData();
        Object.entries(basePayload).forEach(([key, value]) => {
          if (key === "objectives" || key === "tech" || key === "teamEmails") return;
          data.append(key, value === null ? "" : String(value));
        });
        objectives.forEach((value) => data.append("objectives", value));
        tech.forEach((value) => data.append("tech", value));
        if (includingTeam) teamEmails.forEach((value) => data.append("teamEmails", value));
        if (image) data.append("image", image);
        appendMediaFields(data);
        setUploadProgress(0);
        result = await api.upload<Innovation>(
          item ? `/innovations/${item.slug}/` : "/innovations/",
          data,
          {
            method: item ? "PATCH" : "POST",
            onProgress: setUploadProgress,
          },
        );
      } else {
        const payload = { ...basePayload, ...mediaPayload() };
        result = item
          ? await api.patch<Innovation>(`/innovations/${item.slug}/`, payload)
          : await api.post<Innovation>("/innovations/", payload);
      }
      toast.success(
        targetStatus === "draft"
          ? "Draft saved"
          : item
            ? "Innovation updated"
            : "Innovation published",
      );
      await queryClient.invalidateQueries({
        predicate: (query) =>
          ["innovations", "innovation", "dashboard", "home", "innovators"].includes(
            query.queryKey[0] as string,
          ),
      });
      void navigate({ to: "/dashboard/innovations" });
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(err.message);
      } else {
        setError(errorMessage(err));
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border-l-4 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold text-foreground">The basics</h2>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-semibold text-foreground">
            Title
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              required
              maxLength={180}
              className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. ShambaSense"
            />
            {fieldError("title") && (
              <span className="mt-1 block text-xs text-destructive">{fieldError("title")}</span>
            )}
          </label>
          <label className="block text-sm font-semibold text-foreground">
            One-line summary
            <input
              value={form.tagline}
              onChange={(event) => update("tagline", event.target.value)}
              required
              maxLength={250}
              className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="What does it do, in one sentence?"
            />
            {fieldError("tagline") && (
              <span className="mt-1 block text-xs text-destructive">{fieldError("tagline")}</span>
            )}
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Description
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              required
              rows={5}
              maxLength={5000}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="Explain the innovation, how it works and who it serves."
            />
            {fieldError("description") && (
              <span className="mt-1 block text-xs text-destructive">
                {fieldError("description")}
              </span>
            )}
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-foreground">
              Category
              <select
                value={form.category}
                onChange={(event) => update("category", event.target.value as CategoryId)}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Stage
              <select
                value={form.stage}
                onChange={(event) => update("stage", event.target.value as Stage)}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage[0]!.toUpperCase() + stage.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Region
              <select
                value={form.region}
                onChange={(event) => update("region", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                {TANZANIA_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {fieldError("region") && (
                <span className="mt-1 block text-xs text-destructive">{fieldError("region")}</span>
              )}
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Institution (optional)
              <select
                value={form.institution}
                onChange={(event) => update("institution", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                <option value="">No institution</option>
                {(institutions.data?.results ?? []).map((institution) => (
                  <option key={institution.slug} value={institution.slug}>
                    {institution.short} – {institution.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold text-foreground">Problem, solution and goals</h2>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-semibold text-foreground">
            The problem
            <textarea
              value={form.problem}
              onChange={(event) => update("problem", event.target.value)}
              rows={3}
              maxLength={4000}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="What problem are you solving?"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Your solution
            <textarea
              value={form.solution}
              onChange={(event) => update("solution", event.target.value)}
              rows={3}
              maxLength={4000}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="How does your innovation solve it?"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Objectives
            <span className="ml-1 text-xs font-normal text-muted-foreground">One per line</span>
            <textarea
              value={form.objectives}
              onChange={(event) => update("objectives", event.target.value)}
              required
              rows={4}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder={"Reach 10,000 farmers by 2027\nRun a pilot in three districts"}
            />
            {fieldError("objectives") && (
              <span className="mt-1 block text-xs text-destructive">
                {fieldError("objectives")}
              </span>
            )}
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Technology & tools
            <span className="ml-1 text-xs font-normal text-muted-foreground">Comma-separated</span>
            <input
              value={form.tech}
              onChange={(event) => update("tech", event.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="IoT, Python, USSD"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Images className="size-5 text-gold" /> {t("media.title")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {t("media.help")}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Images className="size-4 text-azure" /> {t("media.images.title")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("media.images.help")}</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
              {imageCount}/{MAX_INNOVATION_IMAGES}
            </span>
          </div>

          {(existingImages.length > 0 || newImages.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {existingImages.map((media) => (
                <div
                  key={media.id}
                  className="group relative overflow-hidden rounded-xl border bg-surface"
                >
                  <img
                    src={media.thumbnailUrl ?? media.url}
                    alt={media.originalFilename}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded bg-navy/70 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-white">
                    {t("media.images.saved")}
                  </span>
                  <div className="flex items-center justify-between gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => removeExistingMedia(media)}
                      className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" /> {t("media.images.remove")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeExistingMedia(media);
                        window.requestAnimationFrame(() => imageInputRef.current?.click());
                      }}
                      className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground hover:text-azure"
                    >
                      <RefreshCw className="size-3.5" /> {t("media.images.replace")}
                    </button>
                  </div>
                </div>
              ))}
              {newImages.map((media) => (
                <div
                  key={media.key}
                  className="relative overflow-hidden rounded-xl border bg-surface"
                >
                  <img
                    src={media.preview}
                    alt={media.file.name}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded bg-gold/90 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-gold-foreground">
                    {t("media.images.new")}
                  </span>
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="max-w-[70%] truncate text-[0.68rem] text-muted-foreground">
                      {media.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(media)}
                      className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" /> {t("media.images.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${dragging ? "border-gold bg-accent" : "border-border bg-background"}`}
          >
            <UploadCloud className="size-6 text-azure" />
            <p className="mt-2 text-sm font-semibold text-foreground">{t("media.images.drop")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG, JPEG, PNG, WebP · {formatBytes(10 * 1024 * 1024)} max each
            </p>
            <input
              ref={imageInputRef}
              id="innovation-gallery-images"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={handleImageInput}
            />
            <Button type="button" variant="outline" size="sm" className="mt-3" asChild>
              <label htmlFor="innovation-gallery-images" className="cursor-pointer">
                <ImagePlus /> {t("media.images.add")}
              </label>
            </Button>
          </div>
          {mediaError && (
            <p role="alert" className="mt-2 text-xs font-medium text-destructive">
              {mediaError}
            </p>
          )}
          {fieldError("images") && (
            <p className="mt-2 text-xs text-destructive">{fieldError("images")}</p>
          )}
          <p className="mt-2 text-[0.68rem] text-muted-foreground">{t("media.images.coverNote")}</p>
        </div>

        <div className="mt-6 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Film className="size-4 text-azure" /> {t("media.videos.title")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("media.videos.help")}</p>
              <ul className="mt-2 grid gap-1 text-[0.68rem] text-muted-foreground sm:grid-cols-2">
                {pitchTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-1.5">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-gold" /> {tip}
                  </li>
                ))}
              </ul>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
              {videoCount}/{MAX_INNOVATION_VIDEOS}
            </span>
          </div>

          {(existingVideos.length > 0 || newVideos.length > 0) && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {existingVideos.map((media) => {
                const key = videoKeyFor(media);
                const isPrimary = effectivePrimaryKey === key;
                return (
                  <div key={media.id} className="overflow-hidden rounded-xl border bg-surface">
                    <video
                      controls
                      preload="metadata"
                      playsInline
                      poster={media.thumbnailUrl ?? "/images/video-placeholder.svg"}
                      className="aspect-video w-full bg-navy"
                      aria-label={media.originalFilename}
                    >
                      <source src={media.url} type={media.mimeType} />
                    </video>
                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-semibold text-foreground">
                          {media.originalFilename}
                        </p>
                        {isPrimary && (
                          <span className="shrink-0 rounded bg-gold-soft px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-accent-foreground">
                            {t("media.videos.primary")}
                          </span>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <input
                          type="radio"
                          name={`primary-video-${item?.slug ?? "new"}`}
                          checked={isPrimary}
                          onChange={() => setPrimaryVideoKey(key)}
                          className="size-4 accent-primary"
                        />
                        <Star
                          className={`size-3.5 ${isPrimary ? "text-gold" : "text-muted-foreground"}`}
                        />
                        {t("media.videos.makePrimary")}
                      </label>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem]">
                        <button
                          type="button"
                          onClick={() => removeExistingMedia(media)}
                          className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" /> {t("media.videos.remove")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeExistingMedia(media);
                            window.requestAnimationFrame(() => videoInputRef.current?.click());
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-azure"
                        >
                          <RefreshCw className="size-3.5" /> {t("media.videos.replace")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {newVideos.map((video) => {
                const key = `new:${video.key}`;
                const isPrimary = effectivePrimaryKey === key;
                return (
                  <div key={video.key} className="overflow-hidden rounded-xl border bg-surface">
                    <video
                      controls
                      preload="none"
                      playsInline
                      poster={video.posterPreview}
                      className="aspect-video w-full bg-navy"
                      aria-label={video.file.name}
                    >
                      <source src={video.preview} type={video.file.type} />
                    </video>
                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-semibold text-foreground">
                          {video.file.name}
                        </p>
                        {isPrimary && (
                          <span className="shrink-0 rounded bg-gold-soft px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-accent-foreground">
                            {t("media.videos.primary")}
                          </span>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <input
                          type="radio"
                          name={`primary-video-${item?.slug ?? "new"}`}
                          checked={isPrimary}
                          onChange={() => setPrimaryVideoKey(key)}
                          className="size-4 accent-primary"
                        />
                        <Star
                          className={`size-3.5 ${isPrimary ? "text-gold" : "text-muted-foreground"}`}
                        />
                        {t("media.videos.makePrimary")}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeNewVideo(video)}
                        className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" /> {t("media.videos.remove")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-background p-4">
            <Video className="size-5 text-azure" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t("media.videos.add")}</p>
              <p className="text-xs text-muted-foreground">
                MP4 or WebM · {formatBytes(50 * 1024 * 1024)} max each
              </p>
            </div>
            <input
              ref={videoInputRef}
              id="innovation-gallery-videos"
              type="file"
              accept=".mp4,.webm,video/mp4,video/webm"
              multiple
              className="sr-only"
              onChange={handleVideoInput}
            />
            <Button type="button" variant="outline" size="sm" asChild>
              <label htmlFor="innovation-gallery-videos" className="cursor-pointer">
                <UploadCloud /> {t("media.videos.add")}
              </label>
            </Button>
          </div>
          {mediaBusy && (
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-azure">
              <Loader2 className="size-3.5 animate-spin" /> {t("media.uploading")}
            </p>
          )}
          {fieldError("videos") && (
            <p className="mt-2 text-xs text-destructive">{fieldError("videos")}</p>
          )}
          {fieldError("videoPosters") && (
            <p className="mt-2 text-xs text-destructive">{fieldError("videoPosters")}</p>
          )}
          {fieldError("primaryVideoIndex") && (
            <p className="mt-2 text-xs text-destructive">{fieldError("primaryVideoIndex")}</p>
          )}
          {fieldError("primaryVideoId") && (
            <p className="mt-2 text-xs text-destructive">{fieldError("primaryVideoId")}</p>
          )}
          {fieldError("removeMediaIds") && (
            <p className="mt-2 text-xs text-destructive">{fieldError("removeMediaIds")}</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold text-foreground">Cover image, team and links</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label
              htmlFor="innovation-image"
              className="block text-sm font-semibold text-foreground"
            >
              Cover image (optional)
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {(preview || item?.image) && (
                <div className="relative">
                  <img
                    src={preview ?? item?.image ?? ""}
                    alt="Cover preview"
                    className="h-24 w-36 rounded-lg border object-cover"
                  />
                  {preview && (
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
                      aria-label="Remove selected image"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
              <label
                htmlFor="innovation-image"
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                <ImagePlus className="size-4" /> Choose image
                <input
                  id="innovation-image"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
            </div>
            {fieldError("image") && (
              <p className="mt-1 text-xs text-destructive">{fieldError("image")}</p>
            )}
          </div>
          <label className="block text-sm font-semibold text-foreground">
            Team members
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {item
                ? "Enter emails only if you want to replace the current team"
                : "TIE account emails, comma-separated"}
            </span>
            <input
              value={form.teamEmails}
              onChange={(event) => update("teamEmails", event.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="colleague@example.com"
            />
            {fieldError("teamEmails") && (
              <span className="mt-1 block text-xs text-destructive">
                {fieldError("teamEmails")}
              </span>
            )}
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Project link (optional)
            <input
              type="url"
              value={form.link}
              onChange={(event) => update("link", event.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://"
            />
            {fieldError("link") && (
              <span className="mt-1 block text-xs text-destructive">{fieldError("link")}</span>
            )}
          </label>
        </div>
      </div>

      {uploadProgress !== null && (
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-foreground">
              <Loader2 className="size-4 animate-spin text-azure" /> {t("media.uploading")}
            </span>
            <span className="font-display text-sm font-bold text-azure">{uploadProgress}%</span>
          </div>
          <Progress
            value={uploadProgress}
            className="mt-3"
            aria-label={t("media.uploadProgress")}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-5 shadow-card">
        <label className="text-sm font-semibold text-foreground">
          Visibility
          <select
            value={form.status}
            onChange={(event) => update("status", event.target.value as "draft" | "published")}
            className="ml-2 h-10 rounded-md border bg-background px-3 text-sm font-normal"
          >
            <option value="draft">Draft (only you)</option>
            <option value="published">Published</option>
          </select>
        </label>
        <Button type="submit" disabled={busy || mediaBusy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />}{" "}
          {form.status === "draft" ? "Save draft" : item ? "Save & publish" : "Publish innovation"}
        </Button>
        {form.status !== "draft" && (
          <Button
            type="button"
            variant="outline"
            disabled={busy || mediaBusy}
            onClick={(event) => void submit(event, "draft")}
          >
            Save as draft
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link to="/dashboard/innovations">Cancel</Link>
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          Published innovations appear publicly immediately. Moderators can hide content that breaks
          the rules.
        </p>
      </div>
    </form>
  );
}
