import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Institution, InstitutionType, Opportunity, OpportunityType } from "@/lib/api-types";
import { categories, institutionTypes, opportunityTypes } from "@/data/catalog";
import { api, ApiError, errorMessage } from "@/lib/api";

export function OpportunityAdminDialog({
  open,
  onClose,
  opportunity,
}: {
  open: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    type: "Challenge" as OpportunityType,
    organizer: "",
    deadline: "",
    location: "Nationwide",
    summary: "",
    eligibility: "",
    reward: "",
    categories: [] as string[],
    external_url: "",
    status: "published",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    setError("");
    setFields({});
    if (opportunity) {
      setForm({
        title: opportunity.title,
        type: opportunity.type,
        organizer: opportunity.organizer,
        deadline: opportunity.deadline,
        location: opportunity.location,
        summary: opportunity.summary,
        eligibility: opportunity.eligibility.join("\n"),
        reward: opportunity.reward,
        categories: opportunity.categories,
        external_url: opportunity.external_url ?? "",
        status:
          opportunity.status === "closed"
            ? "closed"
            : opportunity.status === "archived"
              ? "archived"
              : opportunity.status,
      });
    } else {
      setForm({
        title: "",
        type: "Challenge",
        organizer: "",
        deadline: "",
        location: "Nationwide",
        summary: "",
        eligibility: "",
        reward: "",
        categories: [],
        external_url: "",
        status: "published",
      });
    }
  }, [open, opportunity]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const payload = {
      ...form,
      eligibility: form.eligibility
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    try {
      if (opportunity) {
        await api.patch(`/opportunities/${opportunity.slug}/`, payload);
      } else {
        await api.post("/opportunities/", payload);
      }
      toast.success(opportunity ? "Opportunity updated" : "Opportunity created");
      await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      await queryClient.invalidateQueries({ queryKey: ["moderation"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (name: string) => fields[name]?.[0];

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">
            {opportunity ? "Edit opportunity" : "New opportunity"}
          </DialogTitle>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-lg border-l-4 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-foreground sm:col-span-2">
              Title
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
              {fieldError("title") && (
                <span className="text-xs text-destructive">{fieldError("title")}</span>
              )}
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Type
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as OpportunityType })
                }
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                {opportunityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Organizer
              <input
                value={form.organizer}
                onChange={(event) => setForm({ ...form, organizer: event.target.value })}
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
              {fieldError("deadline") && (
                <span className="text-xs text-destructive">{fieldError("deadline")}</span>
              )}
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Location
              <input
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Reward
              <input
                value={form.reward}
                onChange={(event) => setForm({ ...form, reward: event.target.value })}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-foreground">
            Summary
            <textarea
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
              rows={3}
              required
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Eligibility{" "}
            <span className="text-xs font-normal text-muted-foreground">one per line</span>
            <textarea
              value={form.eligibility}
              onChange={(event) => setForm({ ...form, eligibility: event.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            External link (optional)
            <input
              type="url"
              value={form.external_url}
              onChange={(event) => setForm({ ...form, external_url: event.target.value })}
              className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Categories</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = form.categories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm({
                        ...form,
                        categories: active
                          ? form.categories.filter((item) => item !== category.id)
                          : [...form.categories, category.id],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {category.en}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Save />} Save opportunity
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              <X /> Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InstitutionAdminDialog({
  open,
  onClose,
  institution,
}: {
  open: boolean;
  onClose: () => void;
  institution?: Institution | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    short_name: "",
    type: "University" as InstitutionType,
    location: "",
    description: "",
    website: "",
    verified: false,
    focus: [] as string[],
    is_active: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    setError("");
    setFields({});
    if (institution) {
      setForm({
        name: institution.name,
        short_name: institution.short,
        type: institution.type,
        location: institution.location,
        description: institution.description,
        website: institution.website,
        verified: institution.verified,
        focus: institution.focus,
        is_active: institution.isActive ?? true,
      });
    } else {
      setForm({
        name: "",
        short_name: "",
        type: "University",
        location: "",
        description: "",
        website: "",
        verified: false,
        focus: [],
        is_active: true,
      });
    }
  }, [open, institution]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      if (institution) await api.patch(`/institutions/${institution.slug}/`, form);
      else await api.post("/institutions/", form);
      toast.success(institution ? "Institution updated" : "Institution created");
      await queryClient.invalidateQueries({ queryKey: ["institutions"] });
      await queryClient.invalidateQueries({ queryKey: ["moderation"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (name: string) => fields[name]?.[0];

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">
            {institution ? "Edit institution" : "New institution"}
          </DialogTitle>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-lg border-l-4 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-foreground sm:col-span-2">
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
              {fieldError("name") && (
                <span className="text-xs text-destructive">{fieldError("name")}</span>
              )}
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Short name
              <input
                value={form.short_name}
                onChange={(event) => setForm({ ...form, short_name: event.target.value })}
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Type
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as InstitutionType })
                }
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                {institutionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Location
              <input
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Website
              <input
                type="url"
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-foreground">
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Focus areas</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = form.focus.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm({
                        ...form,
                        focus: active
                          ? form.focus.filter((item) => item !== category.id)
                          : [...form.focus, category.id],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {category.en}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(event) => setForm({ ...form, verified: event.target.checked })}
                className="size-4 accent-primary"
              />{" "}
              Verified
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                className="size-4 accent-primary"
              />{" "}
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Save />} Save institution
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              <X /> Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
