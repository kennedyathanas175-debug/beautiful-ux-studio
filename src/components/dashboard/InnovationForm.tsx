import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Innovation, Stage, CategoryId } from "@/lib/api-types";
import { TANZANIA_REGIONS, categories, stages } from "@/data/catalog";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useInstitutionOptions } from "@/lib/queries";

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

export function InnovationForm({ item }: { item?: Innovation }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const institutions = useInstitutionOptions();
  const [form, setForm] = useState<FormState>(() => initialState(item));
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

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

    try {
      let result: Innovation;
      if (image) {
        const data = new FormData();
        data.append("title", form.title);
        data.append("tagline", form.tagline);
        data.append("description", form.description);
        data.append("problem", form.problem);
        data.append("solution", form.solution);
        data.append("category", form.category);
        data.append("stage", form.stage);
        data.append("region", form.region);
        data.append("link", form.link);
        data.append("status", targetStatus);
        data.append("institution", form.institution);
        objectives.forEach((value) => data.append("objectives", value));
        tech.forEach((value) => data.append("tech", value));
        if (includingTeam) teamEmails.forEach((value) => data.append("teamEmails", value));
        data.append("image", image);
        result = item
          ? await api.patch<Innovation>(`/innovations/${item.slug}/`, undefined, data)
          : await api.post<Innovation>("/innovations/", undefined, data);
      } else {
        const payload = {
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
        <h2 className="text-base font-bold text-foreground">Media, team and links</h2>
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
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />}{" "}
          {form.status === "draft" ? "Save draft" : item ? "Save & publish" : "Publish innovation"}
        </Button>
        {form.status !== "draft" && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
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
