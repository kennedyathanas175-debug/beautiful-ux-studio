import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/site/bits";
import { EmptyRow, StatusBadge } from "@/components/dashboard/ui";
import { ErrorState, PageLoader } from "@/components/site/states";
import { api, errorMessage } from "@/lib/api";
import { useRequests } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/requests")({
  component: RequestsPage,
});

function RequestsPage() {
  const [direction, setDirection] = useState<"incoming" | "outgoing">("incoming");
  const incoming = useRequests("incoming");
  const outgoing = useRequests("outgoing");
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);
  const active = direction === "incoming" ? incoming : outgoing;
  const requests = active.data?.results ?? [];

  const respond = async (id: number, status: "accepted" | "declined" | "withdrawn") => {
    if (
      !window.confirm(
        status === "withdrawn"
          ? "Withdraw this request?"
          : `${status === "accepted" ? "Accept" : "Decline"} this request?`,
      )
    )
      return;
    setBusy(id);
    try {
      await api.patch(`/collaboration-requests/${id}/`, { status });
      toast.success("Request updated");
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Collaboration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Respond to people who want to work with you, and track requests you sent.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-secondary p-1">
        {(["incoming", "outgoing"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDirection(item)}
            aria-pressed={direction === item}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold capitalize transition-colors ${direction === item ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {active.isError ? (
        <ErrorState
          message="Collaboration requests could not be loaded."
          onRetry={() => void active.refetch()}
        />
      ) : active.isLoading ? (
        <PageLoader label="Loading requests…" />
      ) : requests.length === 0 ? (
        <EmptyRow>
          {direction === "incoming"
            ? "No collaboration requests yet."
            : "You have not sent any collaboration requests."}
        </EmptyRow>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const person = direction === "incoming" ? request.sender : request.recipient;
            return (
              <li key={request.id} className="rounded-2xl border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={person.name}
                      photo={person.photo ?? undefined}
                      className="size-11 shrink-0 rounded-full text-sm"
                    />
                    <div className="min-w-0">
                      <Link
                        to="/innovators/$slug"
                        params={{ slug: person.slug }}
                        className="block truncate font-semibold text-foreground hover:text-azure"
                      >
                        {person.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{person.headline}</p>
                    </div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                {request.innovation && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    About{" "}
                    <Link
                      to="/innovations/$slug"
                      params={{ slug: request.innovation.slug }}
                      className="font-semibold text-azure hover:underline"
                    >
                      {request.innovation.title}
                    </Link>
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm leading-relaxed text-foreground">
                  {request.message}
                </p>
                {request.responseMessage && (
                  <p className="mt-2 rounded-xl border-l-4 border-gold bg-accent p-3 text-sm text-accent-foreground">
                    Reply: {request.responseMessage}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Sent {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                  {request.canRespond && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy === request.id}
                        onClick={() => void respond(request.id, "accepted")}
                      >
                        {busy === request.id ? <Loader2 className="animate-spin" /> : <Check />}{" "}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === request.id}
                        onClick={() => void respond(request.id, "declined")}
                      >
                        <X /> Decline
                      </Button>
                    </div>
                  )}
                  {request.canWithdraw && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === request.id}
                      onClick={() => void respond(request.id, "withdrawn")}
                    >
                      Withdraw request
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
