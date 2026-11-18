import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "./bits";
import { ReportDialog } from "./ReportDialog";
import { useAuth } from "@/lib/auth";
import { api, errorMessage } from "@/lib/api";
import { useInfiniteComments } from "@/lib/queries";
import { usePrefs } from "@/lib/prefs";

export function CommentSection({ slug, count }: { slug: string; count: number }) {
  const { user } = useAuth();
  const { lang } = usePrefs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useInfiniteComments(slug);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState<number | null>(null);
  const comments = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.count ?? count;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["comments", slug] });
    void queryClient.invalidateQueries({ queryKey: ["innovation", slug] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (body.trim().length < 2) {
      setError("Write at least a few words.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/innovations/${slug}/comments/`, { body: body.trim() });
      setBody("");
      toast.success(lang === "sw" ? "Maoni yamewekwa" : "Comment posted");
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    try {
      await api.delete(`/comments/${id}/`);
      toast.success("Comment deleted");
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <MessageCircle className="size-5 text-gold" /> Discussion
        </h2>
        <span className="text-sm text-muted-foreground">
          {total} {total === 1 ? "comment" : "comments"}
        </span>
      </div>

      {user ? (
        <form onSubmit={submit} className="mt-5 rounded-xl border bg-surface p-4">
          <label htmlFor="comment-body" className="sr-only">
            Write a comment
          </label>
          <Textarea
            id="comment-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={
              lang === "sw"
                ? "Uliza swali au toa maoni…"
                : "Ask a question or share constructive feedback…"
            }
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{body.length}/2000</span>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />} Post comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed bg-surface p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Log in to join the discussion, ask questions and give feedback.
          </p>
          <Button asChild variant="outline" className="mt-3">
            <Link to="/auth" search={{ mode: "login" }}>
              Log in to comment
            </Link>
          </Button>
        </div>
      )}

      {query.isError ? (
        <p className="mt-4 text-sm text-destructive">Comments could not be loaded.</p>
      ) : query.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={comment.author.name}
                    photo={comment.author.photo ?? undefined}
                    className="size-9 shrink-0 rounded-full text-xs"
                  />
                  <div className="min-w-0 leading-tight">
                    <Link
                      to="/innovators/$slug"
                      params={{ slug: comment.author.slug }}
                      className="block truncate text-sm font-semibold text-foreground hover:text-azure"
                    >
                      {comment.author.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString(
                        lang === "sw" ? "sw-TZ" : "en-GB",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                      {comment.isHidden && (
                        <span className="ml-2 font-semibold text-warning">Hidden by moderator</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {user && !comment.canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        user
                          ? setReporting(comment.id)
                          : void navigate({ to: "/auth", search: { mode: "login" } })
                      }
                      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Report comment"
                    >
                      <Flag className="size-4" />
                    </button>
                  )}
                  {comment.canEdit && (
                    <button
                      type="button"
                      onClick={() => void remove(comment.id)}
                      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <div className="mt-5 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage && <Loader2 className="animate-spin" />} Load more comments
          </Button>
        </div>
      )}

      <ReportDialog
        open={reporting !== null}
        onClose={() => setReporting(null)}
        commentId={reporting ?? undefined}
      />
    </section>
  );
}
