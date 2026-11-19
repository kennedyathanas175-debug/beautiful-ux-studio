import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CategoryId, Innovator, UserRole } from "@/lib/api-types";
import { categories, communityRoles, TANZANIA_REGIONS } from "@/data/catalog";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInstitutionOptions } from "@/lib/queries";

export function ProfileForm({ user }: { user: Innovator }) {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const institutions = useInstitutionOptions();
  const [fullName, setFullName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [headline, setHeadline] = useState(user.headline);
  const [bio, setBio] = useState(user.bio);
  const [location, setLocation] = useState(user.location);
  const [institution, setInstitution] = useState(user.institution?.slug ?? "");
  const [skills, setSkills] = useState(user.skills.join("\n"));
  const [lookingFor, setLookingFor] = useState(user.lookingFor.join("\n"));
  const [interests, setInterests] = useState<CategoryId[]>(user.interests);
  const [links, setLinks] = useState(
    user.links.map((link) => `${link.label} | ${link.url}`).join("\n"),
  );
  const [isPublic, setIsPublic] = useState(user.isPublic);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  const fieldError = (name: string) => fields[name]?.[0];

  const toggleInterest = (id: CategoryId) => {
    setInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const parseLinks = () =>
    links
      .split("\n")
      .map((line) => {
        const [label, ...rest] = line.split("|");
        return { label: (label ?? "").trim(), url: rest.join("|").trim() };
      })
      .filter((link) => link.label && link.url);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const skillsList = skills
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const lookingList = lookingFor
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const linksList = parseLinks();
    try {
      let updated: Innovator;
      if (avatar) {
        const data = new FormData();
        data.append("full_name", fullName);
        data.append("role", role);
        data.append("headline", headline);
        data.append("bio", bio);
        data.append("location", location);
        data.append("institution", institution);
        data.append("skills", JSON.stringify(skillsList));
        data.append("looking_for", JSON.stringify(lookingList));
        data.append("links", JSON.stringify(linksList));
        data.append("is_public", String(isPublic));
        interests.forEach((interest) => data.append("interests", interest));
        data.append("avatar", avatar);
        const response = await api.patch<{ user: Innovator }>("/auth/me/", undefined, data);
        updated = response.user;
      } else {
        const response = await api.patch<{ user: Innovator }>("/auth/me/", {
          full_name: fullName,
          role,
          headline,
          bio,
          location,
          institution: institution || null,
          skills: skillsList,
          looking_for: lookingList,
          links: linksList,
          is_public: isPublic,
          interests,
        });
        updated = response.user;
      }
      auth.setUser(updated);
      setAvatar(null);
      toast.success("Profile updated");
      await queryClient.invalidateQueries({ queryKey: ["innovator", user.slug] });
      await queryClient.invalidateQueries({ queryKey: ["innovators"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
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

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border-l-4 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold text-foreground">Public profile</h2>
        <div className="mt-4 grid gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {user.photo && (
              <img
                src={user.photo}
                alt={user.name}
                className="size-20 rounded-2xl border object-cover"
              />
            )}
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold text-foreground hover:bg-secondary">
              Change photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => setAvatar(event.target.files?.[0] ?? null)}
              />
            </label>
            {avatar && <span className="text-xs text-muted-foreground">{avatar.name}</span>}
          </div>
          {fieldError("avatar") && (
            <p className="text-xs text-destructive">{fieldError("avatar")}</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-foreground">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                minLength={2}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldError("full_name") && (
                <span className="mt-1 block text-xs text-destructive">
                  {fieldError("full_name")}
                </span>
              )}
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Community role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                {communityRoles.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {user.isStaff && <option value="admin">Administrator</option>}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Headline
              <input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={180}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
                placeholder="Software engineer · Digital health"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Location
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                <option value="">Not set</option>
                {TANZANIA_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Institution
              <select
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                <option value="">No institution</option>
                {(institutions.data?.results ?? []).map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.short} – {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Profile visibility
              <select
                value={isPublic ? "public" : "private"}
                onChange={(event) => setIsPublic(event.target.value === "public")}
                className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal"
              >
                <option value="public">Public profile</option>
                <option value="private">Private (staff only)</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-foreground">
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="What do you work on and what are you looking for?"
            />
            {fieldError("bio") && (
              <span className="mt-1 block text-xs text-destructive">{fieldError("bio")}</span>
            )}
          </label>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold text-foreground">Skills and interests</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-foreground">
            Skills <span className="text-xs font-normal text-muted-foreground">one per line</span>
            <textarea
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              rows={5}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder={"React Native\nFHIR\nProduct design"}
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Open to collaborate on{" "}
            <span className="text-xs font-normal text-muted-foreground">one per line</span>
            <textarea
              value={lookingFor}
              onChange={(event) => setLookingFor(event.target.value)}
              rows={5}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder={"Clinical partners\nPilot districts"}
            />
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-foreground">Areas of interest</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={interests.includes(category.id)}
                onClick={() => toggleInterest(category.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${interests.includes(category.id) ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {category.en}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 block text-sm font-semibold text-foreground">
          Links{" "}
          <span className="text-xs font-normal text-muted-foreground">
            one per line as “Label | https://…”
          </span>
          <textarea
            value={links}
            onChange={(event) => setLinks(event.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
            placeholder={"GitHub | https://github.com/yourname\nWebsite | https://example.com"}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-5 shadow-card">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />} Save profile
        </Button>
        <p className="text-xs text-muted-foreground">
          Your email address is used for login and is never shown publicly.
        </p>
      </div>
    </form>
  );
}
