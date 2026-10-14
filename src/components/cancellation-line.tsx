import { Icon } from "@/components/icons/icons";
import type { CancellationLine } from "@/domain/cancellation";

/**
 * The cancellation line (DESIGN.md Cancellation line): a Mint "Free
 * cancellation" badge with "until …" beside it; "Free cancellation ended on
 * …" once the deadline has passed; "Non-refundable. This booking can't be
 * cancelled." with a warning icon. Used in the booking summary and the
 * Booking view.
 */
export function CancellationLineText({ line }: { line: CancellationLine }) {
  if (line.kind === "free") {
    return (
      <p className="flex flex-wrap items-center gap-x-space-sm gap-y-space-xs">
        <span className="rounded-full bg-success px-space-sm text-label-md text-on-success">
          Free cancellation
        </span>
        <span>{line.until}</span>
      </p>
    );
  }
  if (line.kind === "ended") return <p>{line.text}</p>;
  return (
    <p className="flex items-start gap-space-xs">
      <Icon name="warning" className="mt-0.5 shrink-0" />
      {line.text}
    </p>
  );
}
