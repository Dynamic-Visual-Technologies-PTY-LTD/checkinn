import { ManageBookingForm } from "@/app/manage/manage-booking-form";
import { prefilledReference } from "@/domain/lookup";

/**
 * The lookup form, with the reference from `/manage?reference=…` filled in
 * (normalised and cut to the field's limit). Only the reference ever comes
 * from the URL; the email never does (AD-15).
 */
export async function ManageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { reference } = await searchParams;
  const value = Array.isArray(reference) ? reference[0] : reference;
  return <ManageBookingForm initialReference={prefilledReference(value)} />;
}

/** The form's shape while the URL resolves (DESIGN.md Skeleton). */
export function ManageFormSkeleton() {
  const block = "rounded-md bg-primary-subtle motion-safe:animate-pulse";
  return (
    <div aria-hidden="true" className="flex flex-col gap-space-md">
      <div className={`h-16 ${block}`} />
      <div className={`h-16 ${block}`} />
      <div className={`h-14 w-48 ${block}`} />
    </div>
  );
}
