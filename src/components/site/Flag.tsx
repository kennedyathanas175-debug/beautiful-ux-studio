import { cn } from "@/lib/utils";

/** Flag of Tanzania, drawn to the official 2:3 proportions. */
export function TanzaniaFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 48"
      className={cn("rounded-[2px] shadow-card", className)}
      role="img"
      aria-label="Flag of Tanzania"
    >
      <path d="M0 0h72L0 48z" className="fill-flag-green" />
      <path d="M72 0v48H0z" className="fill-flag-blue" />
      <path d="M0 48 72 0" className="stroke-flag-yellow" strokeWidth="19" />
      <path d="M0 48 72 0" className="stroke-flag-black" strokeWidth="12" />
    </svg>
  );
}
