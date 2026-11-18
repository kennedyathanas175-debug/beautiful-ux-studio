import { useEffect, useState, type FormEvent } from "react";
import { Handshake, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";

export function CollaborationDialog({
  open,
  onClose,
  innovation,
  recipient,
}: {
  open: boolean;
  onClose: () => void;
  innovation?: { slug: string; title: string };
  recipient?: { slug: string; name: string };
}) {
  const { lang } = usePrefs();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (open) {
      setMessage("");
      setError("");
      setFieldError("");
    }
  }, [open]);

  if (!open) return null;
  const targetName = innovation?.title ?? recipient?.name ?? "this innovator";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldError("");
    if (message.trim().length < 10) {
      setFieldError("Write at least 10 characters about how you would like to collaborate.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/collaboration-requests/", {
        ...(innovation ? { innovation: innovation.slug } : {}),
        ...(recipient ? { recipient: recipient.slug } : {}),
        message: message.trim(),
      });
      toast.success(lang === "sw" ? "Ombi limetumwa" : "Collaboration request sent");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        setFieldError(Object.values(err.fields)[0]?.[0] ?? err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-left">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-soft text-accent-foreground">
            <Handshake className="size-5" />
          </span>
          <DialogTitle className="pt-2 font-display text-xl">Request collaboration</DialogTitle>
          <DialogDescription>
            Send a short, specific message to {targetName}. Your request appears in their dashboard
            and notifications.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="collab-message" className="text-sm font-semibold text-foreground">
            Your message
          </label>
          <Textarea
            id="collab-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Introduce yourself, explain what you bring and what you would like to do together…"
          />
          <p className="text-xs text-muted-foreground">{message.trim().length}/2000 characters</p>
          {fieldError && (
            <p role="alert" className="text-sm text-destructive">
              {fieldError}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border-l-4 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />} Send request
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
