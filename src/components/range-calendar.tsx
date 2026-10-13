"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { iconButton } from "@/components/button-styles";
import { Icon } from "@/components/icons/icons";
import {
  addDays,
  addMonths,
  dayLabel,
  endOfMonth,
  endOfWeek,
  isBefore,
  isUnavailable,
  monthGrid,
  monthLabel,
  rangeLabel,
  shortDayLabel,
  startOfMonth,
  startOfWeek,
  WEEKDAY_NAMES,
  type DateRange,
} from "@/domain/dates";
import type { IsoDate } from "@/domain/types";

/** The phone sheet lists this many months, from today's month. */
export const PHONE_MONTHS = 12;

type RangeCalendarProps = {
  today: IsoDate;
  /** The range being picked. */
  range: DateRange;
  /** Called with an available day the guest picks. */
  onPick: (date: IsoDate) => void;
  /** `desktop`: two months with Previous and Next. `phone`: stacked months. */
  layout: "desktop" | "phone";
  /** Shown in the footer beside the summary, such as the Done button. */
  action?: ReactNode;
};

function between(date: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return !isBefore(date, start) && !isBefore(end, date);
}

function summary(range: DateRange): string {
  if (range.checkIn && range.checkOut) {
    return rangeLabel({ checkIn: range.checkIn, checkOut: range.checkOut });
  }
  if (range.checkIn) return `${shortDayLabel(range.checkIn)} · Select check-out`;
  return "Select check-in";
}

/**
 * The range calendar grid (EXPERIENCE.md Range calendar, DESIGN.md Range
 * calendar). One day at a time is in the Tab order; arrow keys, Page Up and
 * Page Down, Home and End move it, and Enter or Space picks it.
 */
export function RangeCalendar({ today, range, onPick, layout, action }: RangeCalendarProps) {
  const phone = layout === "phone";
  const firstAllowed = startOfMonth(today);
  const lastPhoneDay = endOfMonth(addMonths(firstAllowed, PHONE_MONTHS - 1));
  const initialFocus =
    range.checkIn && !isBefore(range.checkIn, today) ? range.checkIn : today;

  const [focused, setFocused] = useState<IsoDate>(initialFocus);
  const [firstMonth, setFirstMonth] = useState<IsoDate>(() => startOfMonth(initialFocus));
  // Bumped by keyboard moves, so the effect below moves DOM focus after render.
  const [focusRequest, setFocusRequest] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  const months = phone
    ? Array.from({ length: PHONE_MONTHS }, (_, i) => addMonths(firstAllowed, i))
    : [firstMonth, addMonths(firstMonth, 1)];
  const visibleStart = months[0];
  const visibleEnd = endOfMonth(months[months.length - 1]);
  const tabbable = between(focused, visibleStart, visibleEnd)
    ? focused
    : between(today, visibleStart, visibleEnd)
      ? today
      : visibleStart;

  useEffect(() => {
    if (focusRequest === 0) return;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`)?.focus();
  }, [focusRequest, focused]);

  function moveFocus(target: IsoDate) {
    let next = isBefore(target, firstAllowed) ? firstAllowed : target;
    if (phone && isBefore(lastPhoneDay, next)) next = lastPhoneDay;
    if (!phone) {
      const month = startOfMonth(next);
      if (isBefore(month, firstMonth)) setFirstMonth(month);
      else if (isBefore(addMonths(firstMonth, 1), month)) setFirstMonth(addMonths(month, -1));
    }
    setFocused(next);
    setFocusRequest((n) => n + 1);
  }

  function pick(date: IsoDate) {
    if (isUnavailable(date, today, range)) return;
    setFocused(date);
    onPick(date);
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: IsoDate) {
    const moves: Record<string, () => IsoDate> = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      PageUp: () => addMonths(date, -1),
      PageDown: () => addMonths(date, 1),
      Home: () => startOfWeek(date),
      End: () => endOfWeek(date),
    };
    if (event.key === "Enter" || event.key === " ") {
      // Handled here so the button's own click doesn't pick the day twice.
      event.preventDefault();
      pick(date);
      return;
    }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(move());
  }

  const prevDisabled = !isBefore(firstAllowed, firstMonth);

  function renderDay(date: IsoDate | null, index: number) {
    if (!date) return <td key={`empty-${index}`} role="gridcell" className="p-0" />;

    const unavailable = isUnavailable(date, today, range);
    const complete = Boolean(range.checkIn && range.checkOut);
    const isCheckIn = date === range.checkIn;
    const isCheckOut = date === range.checkOut;
    const inStay =
      complete &&
      isBefore(range.checkIn as IsoDate, date) &&
      isBefore(date, range.checkOut as IsoDate);
    const isToday = date === today;
    const name = [
      dayLabel(date),
      isToday && "today",
      isCheckIn && "check-in",
      isCheckOut && "check-out",
      inStay && "in your stay",
      unavailable && "unavailable",
    ]
      .filter(Boolean)
      .join(", ");

    let band = "";
    if (inStay) band = "border-y border-primary bg-primary-subtle";
    else if (complete && isCheckIn) band = "rounded-l-full border-y border-l border-primary bg-primary-subtle";
    else if (complete && isCheckOut) band = "rounded-r-full border-y border-r border-primary bg-primary-subtle";

    let look = "hover:bg-primary-subtle";
    if (isCheckIn || isCheckOut) {
      look = "bg-primary-strong text-label-md text-on-primary ring-2 ring-on-surface ring-inset";
    } else if (unavailable) {
      look = "cursor-default text-on-surface-disabled line-through";
    }

    return (
      <td
        key={date}
        role="gridcell"
        aria-selected={isCheckIn || isCheckOut || inStay ? true : undefined}
        className={`p-0 ${phone ? "w-1/7" : ""} ${band}`}
      >
        <button
          type="button"
          data-date={date}
          data-autofocus={date === tabbable ? "" : undefined}
          tabIndex={date === tabbable ? 0 : -1}
          aria-label={name}
          aria-disabled={unavailable || undefined}
          onClick={() => pick(date)}
          onKeyDown={(event) => onDayKeyDown(event, date)}
          onKeyUp={(event) => {
            if (event.key === " ") event.preventDefault();
          }}
          className={`flex h-11 items-center justify-center rounded-full text-label-sm ${phone ? "w-full min-w-10" : "w-11"} ${look}`}
        >
          <span className={isToday ? "border-b-2 border-secondary px-0.5 leading-tight" : undefined}>
            {Number(date.slice(8))}
          </span>
        </button>
      </td>
    );
  }

  function renderMonth(month: IsoDate, index: number) {
    const headingId = `${idPrefix}-${month}`;
    const Heading = phone ? "h3" : "h2";
    const spacer = <span className="size-11 shrink-0" aria-hidden="true" />;

    return (
      // Desktop months are keyed by position, so Previous and Next keep focus.
      <div key={phone ? month : index} className={phone ? "pb-space-md" : undefined}>
        <div
          className={
            phone
              ? "pt-space-lg pb-space-md"
              : "mb-space-md flex items-center justify-between gap-space-sm"
          }
        >
          {!phone &&
            (index === 0 ? (
              <button
                type="button"
                aria-label="Previous month"
                aria-disabled={prevDisabled || undefined}
                onClick={() => {
                  if (!prevDisabled) setFirstMonth(addMonths(firstMonth, -1));
                }}
                className={iconButton}
              >
                <Icon name="chevron-left" />
              </button>
            ) : (
              spacer
            ))}
          <Heading id={headingId} className="text-headline-sm">
            {monthLabel(month)}
          </Heading>
          {!phone &&
            (index === 1 ? (
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setFirstMonth(addMonths(firstMonth, 1))}
                className={iconButton}
              >
                <Icon name="chevron-right" />
              </button>
            ) : (
              spacer
            ))}
        </div>
        <table
          role="grid"
          aria-labelledby={headingId}
          className={`border-separate border-spacing-0 ${phone ? "w-full table-fixed" : ""}`}
        >
          <thead className={phone ? "sr-only" : undefined}>
            <tr>
              {WEEKDAY_NAMES.map((day) => (
                <th
                  key={day}
                  scope="col"
                  abbr={day}
                  className="h-11 text-label-sm font-normal text-on-surface-muted"
                >
                  {day.slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid(month).map((week, row) => (
              <tr key={row}>{week.map((date, col) => renderDay(date, row * 7 + col))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const footerText = (
    <p aria-live="polite" className="text-body-sm">
      {summary(range)}
    </p>
  );

  if (phone) {
    return (
      <div ref={gridRef} className="flex min-h-0 flex-1 flex-col">
        <div aria-hidden="true" className="flex px-space-md">
          {WEEKDAY_NAMES.map((day) => (
            <span key={day} className="w-1/7 text-center text-label-sm text-on-surface-muted">
              {day.slice(0, 2)}
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-space-md">{months.map(renderMonth)}</div>
        <div className="flex flex-col gap-space-md border-t border-primary p-space-md">
          {footerText}
          {action}
        </div>
      </div>
    );
  }

  return (
    <div ref={gridRef}>
      <div className="flex gap-space-lg">{months.map(renderMonth)}</div>
      <div className="mt-space-md flex items-center justify-between gap-space-lg">
        {footerText}
        {action}
      </div>
    </div>
  );
}
