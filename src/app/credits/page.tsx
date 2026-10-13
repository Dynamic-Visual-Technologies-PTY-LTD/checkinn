import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotoCreditsList, PhotoCreditsSkeleton } from "@/app/credits/photo-credits";

export const metadata: Metadata = { title: "Photo credits" };

/** Every City and Hotel photo credit from the seed (the footer's Photo credits link). */
export default function CreditsPage() {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <h1 className="text-headline-lg-responsive">Photo credits</h1>
      <Suspense fallback={<PhotoCreditsSkeleton />}>
        <PhotoCreditsList />
      </Suspense>
    </div>
  );
}
