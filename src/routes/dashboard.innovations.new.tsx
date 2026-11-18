import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { InnovationForm } from "@/components/dashboard/InnovationForm";

export const Route = createFileRoute("/dashboard/innovations/new")({
  component: NewInnovationPage,
});

function NewInnovationPage() {
  return (
    <div className="space-y-5">
      <Link
        to="/dashboard/innovations"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my innovations
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Publish an innovation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share the problem, your solution and what you need next. You can save a private draft at
          any time.
        </p>
      </div>
      <InnovationForm />
    </div>
  );
}
