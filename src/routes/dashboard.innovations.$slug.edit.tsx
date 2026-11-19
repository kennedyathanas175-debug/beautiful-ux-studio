import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { InnovationForm } from "@/components/dashboard/InnovationForm";
import { ErrorState, PageLoader } from "@/components/site/states";
import { useAuth } from "@/lib/auth";
import { useInnovation } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/innovations/$slug/edit")({
  component: EditInnovationPage,
});

function EditInnovationPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useInnovation(slug);

  useEffect(() => {
    if (query.data && user && query.data.creator.slug !== user.slug && !user.isStaff) {
      void navigate({ to: "/dashboard/innovations" });
    }
  }, [query.data, user, navigate]);

  if (query.isLoading) return <PageLoader label="Loading your innovation…" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Innovation not found"
        message="It may have been removed or you do not have access."
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/dashboard/innovations"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my innovations
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit “{query.data.title}”</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes appear immediately on your public page.
        </p>
      </div>
      <InnovationForm item={query.data} />
    </div>
  );
}
