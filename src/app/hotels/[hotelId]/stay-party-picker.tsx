"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { DateRangeField } from "@/components/date-range-field";
import { Icon } from "@/components/icons/icons";
import { OccupancyField } from "@/components/occupancy-field";
import { hotelHref, parseCriteria } from "@/domain/criteria";
import type { IsoDate, Party, Stay } from "@/domain/types";

type DatesField = { open: () => void; focus: () => void };

const DatesFieldContext = createContext<{
  triggerRef: RefObject<HTMLButtonElement | null>;
} | null>(null);

/**
 * Lets the room table reach this section's own Dates field ("Show prices",
 * "Change dates"). It is per instance: Next can keep an earlier copy of the
 * page hidden in the DOM, so nothing looks the field up by id or selector.
 */
export function DatesFieldProvider({ children }: { children: ReactNode }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const value = useMemo(() => ({ triggerRef }), []);
  return <DatesFieldContext value={value}>{children}</DatesFieldContext>;
}

/** Opens or focuses the Dates field of the surrounding section; no-ops outside one. */
export function useDatesField(): DatesField {
  const context = useContext(DatesFieldContext);
  return useMemo(
    () => ({
      open: () => context?.triggerRef.current?.click(),
      focus: () => context?.triggerRef.current?.focus(),
    }),
    [context],
  );
}

type OpenField = "dates" | "occupancy" | null;

type StayPartyPickerProps = {
  hotelId: string;
  today: IsoDate;
  q: string;
  stay: Stay | null;
  party: Party;
  /** Shown in Coral under Dates from the start, for a stale link. */
  datesError?: string;
};

function stayKey(stay: Stay | null): string {
  return stay ? `${stay.checkIn}/${stay.checkOut}` : "";
}

/**
 * The Stay and Party picker of the Availability section (EXPERIENCE.md Stay
 * and Party picker). Closing a popover or sheet with a changed value pushes a
 * new Hotel URL, keeping the selection; there is no button and focus stays on
 * the field. It never remounts, so its state follows the URL through props.
 */
export function StayPartyPicker({
  hotelId,
  today,
  q,
  stay: stayProp,
  party: partyProp,
  datesError,
}: StayPartyPickerProps) {
  const router = useRouter();
  const [stay, setStay] = useState(stayProp);
  const [party, setParty] = useState(partyProp);
  const [seen, setSeen] = useState(
    `${stayKey(stayProp)}|${partyProp.adults}.${partyProp.children}.${partyProp.rooms}`,
  );
  const [showError, setShowError] = useState(Boolean(datesError));
  const [openField, setOpenField] = useState<OpenField>(null);
  const ownRef = useRef<HTMLButtonElement>(null);
  const datesRef = useContext(DatesFieldContext)?.triggerRef ?? ownRef;
  const errorId = useId();

  // Back and Forward change the URL under the picker: follow it.
  const incoming = `${stayKey(stayProp)}|${partyProp.adults}.${partyProp.children}.${partyProp.rooms}`;
  if (incoming !== seen) {
    setSeen(incoming);
    setStay(stayProp);
    setParty(partyProp);
  }

  function openChange(field: Exclude<OpenField, null>) {
    return (open: boolean) =>
      setOpenField((current) => (open ? field : current === field ? null : current));
  }

  function commit(nextStay: Stay | null, nextParty: Party) {
    // The selection lives in the URL (replaced as it changes); the server
    // clamps it to the new Availability.
    const { criteria } = parseCriteria(new URLSearchParams(window.location.search), today, {
      defaultStay: false,
    });
    router.push(
      hotelHref(hotelId, { q, stay: nextStay, party: nextParty, sel: criteria.sel }),
      { scroll: false },
    );
  }

  const invalid = showError && datesError;

  return (
    <div
      role="group"
      aria-label="Stay and party"
      className="max-w-190 text-body-md text-on-surface"
    >
      <div className="flex flex-col rounded-md border border-primary bg-surface p-space-sm md:flex-row md:items-start">
        <div
          className="border-b border-primary px-space-sm py-space-xs md:flex-1 md:border-r md:border-b-0"
        >
          <div className={`rounded-sm border ${invalid ? "border-error" : "border-transparent"}`}>
            <DateRangeField
              today={today}
              value={stay}
              onChange={(next) => {
                setStay(next);
                setShowError(false);
                commit(next, party);
              }}
              open={openField === "dates"}
              onOpenChange={openChange("dates")}
              triggerRef={datesRef}
              errorId={invalid ? errorId : undefined}
              popoverPlacement="left-0"
            />
          </div>
          {invalid && (
            <p
              id={errorId}
              className="flex items-center gap-space-xs pb-space-xs text-body-sm text-error"
            >
              <Icon name="error" className="shrink-0" />
              {datesError}
            </p>
          )}
        </div>
        <div className="px-space-sm py-space-xs md:flex-1">
          <OccupancyField
            value={party}
            onChange={(next) => {
              setParty(next);
              commit(stay, next);
            }}
            open={openField === "occupancy"}
            onOpenChange={openChange("occupancy")}
          />
        </div>
      </div>
    </div>
  );
}
