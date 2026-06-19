import clsx from "clsx";

const STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  processing: "bg-amber-100 text-amber-700",
  generating: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STYLES[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      {status}
    </span>
  );
}
