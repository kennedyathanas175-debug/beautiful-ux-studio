import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Bookmark,
  Bell,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Plus,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/site/states";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Your dashboard – TIE" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardLayout,
});

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/innovations", label: "My innovations", icon: Lightbulb, exact: false },
  { to: "/dashboard/saved", label: "Saved", icon: Bookmark, exact: false },
  { to: "/dashboard/requests", label: "Collaboration", icon: Handshake, exact: false },
  { to: "/dashboard/applications", label: "Applications", icon: Send, exact: false },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, exact: false },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!loading && !user && pathname.startsWith("/dashboard")) {
      void navigate({ to: "/auth", search: { mode: "login", redirect: pathname } });
    }
  }, [loading, user, navigate, pathname]);

  if (loading || !user) return <PageLoader label="Checking your session…" />;

  const signOut = async () => {
    await logout();
    toast.success("Signed out");
    void navigate({ to: "/" });
  };

  return (
    <>
      <section className="relative overflow-hidden bg-navy-gradient py-10 text-navy-foreground">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="container-tie relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={user.name}
              photo={user.photo ?? undefined}
              className="size-16 rounded-2xl border-2 border-navy-foreground/20 text-xl"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                Your workspace
              </p>
              <h1 className="truncate text-2xl font-bold sm:text-3xl">{user.name}</h1>
              <p className="truncate text-sm text-navy-foreground/70">
                {user.headline || user.roleLabel}
                {user.institution ? ` · ${user.institution.short}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="gold">
              <Link to="/dashboard/innovations/new">
                <Plus /> New innovation
              </Link>
            </Button>
            <Button asChild variant="onNavy">
              <Link to="/innovators/$slug" params={{ slug: user.slug }}>
                View public profile
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container-tie grid gap-8 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-10">
        <aside className="min-w-0">
          <nav
            aria-label="Dashboard"
            className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 scrollbar-none lg:mx-0 lg:flex-col lg:px-0 lg:pb-0"
          >
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors lg:w-full",
                    active
                      ? "bg-navy text-navy-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" /> {item.label}
                </Link>
              );
            })}
            {user.isStaff && (
              <Link
                to="/moderation"
                className="inline-flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-azure hover:bg-secondary lg:w-full"
              >
                <ShieldCheck className="size-4" /> Moderation
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:w-full"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </>
  );
}
