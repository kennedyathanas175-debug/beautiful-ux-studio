import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This is how the ecosystem sees you. Keep it up to date.
          </p>
        </div>
        <Link
          to="/innovators/$slug"
          params={{ slug: user.slug }}
          className="text-sm font-semibold text-azure hover:underline"
        >
          View public profile →
        </Link>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
