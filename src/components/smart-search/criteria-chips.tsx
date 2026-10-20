"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import { Icon } from "@/components/icons/icons";
import {
  type ChipFocusTarget,
  SMART_INPUT_ID,
  useSmartSearch,
} from "@/components/smart-search/smart-search-context";
import { todayIn } from "@/domain/clock";
import { parseCriteria, type ResultsCriteria, withoutCriterion } from "@/domain/criteria";
import { criteriaChips } from "@/domain/hard-criteria";

/**
 * Moves focus to a Criteria chip by its key, or to the Smart search box when
 * that chip is gone or the target is the box.
 */
export function focusChipTarget(target: ChipFocusTarget) {
  const chip =
    target === "box"
      ? null
      : document.querySelector<HTMLElement>(`[data-criterion="${target}"]`);
  (chip ?? document.getElementById(SMART_INPUT_ID))?.focus();
}

/** Whether focus has fallen to the page, as when an update removed the focused node. */
export function focusIsLost(): boolean {
  const active = document.activeElement;
  return active === null || active === document.body;
}

/**
 * The Criteria chip row (EXPERIENCE.md Criteria chip): one removable chip per
 * Max price or Policy criterion, in that order, in a list labelled "Your
 * filters". Each chip is a button named "Remove " plus its visible copy, and
 * is keyed by its criterion, so surviving chips keep their DOM nodes.
 *
 * Removing a chip pushes the URL without that criterion (AD-21). Focus moves
 * to the next chip, else the previous one, else the Smart search box, and
 * is restored by key if the update drops it. The heading is not focused; the
 * new count is said by the results status instead.
 */
export function CriteriaChips({ criteria }: { criteria: ResultsCriteria }) {
  const router = useRouter();
  const smart = useSmartSearch();
  const labelId = useId();
  const chips = criteriaChips(criteria.smart);
  const restore = smart?.chipRemoval?.focus ?? null;

  // The row is not re-mounted per URL, so surviving chips keep focus. The
  // box is, so focus is put back if the update dropped it.
  useEffect(() => {
    if (restore && focusIsLost()) focusChipTarget(restore);
  }, [restore, criteria]);

  if (chips.length === 0) return null;

  function remove(index: number) {
    const focus: ChipFocusTarget = chips[index + 1]?.key ?? chips[index - 1]?.key ?? "box";
    // Built from the newest URL, not this render's props, so a quick second
    // removal never brings back the first (the newest action wins).
    const current = smart ? parseCriteria(smart.currentParams(), todayIn()).criteria : criteria;
    const href = withoutCriterion(
      { q: current.q, stay: current.stay, party: current.party, smart: current.smart },
      chips[index].key,
    );
    focusChipTarget(focus);
    smart?.startChipRemoval(focus, href);
    smart?.recordPush(href);
    router.push(href, { scroll: false });
  }

  return (
    <div className="mt-space-md">
      <span id={labelId} className="sr-only">
        Your filters
      </span>
      <ul aria-labelledby={labelId} className="flex flex-wrap gap-space-sm">
        {chips.map((chip, index) => (
          <li key={chip.key} className="max-w-full">
            <button
              type="button"
              data-criterion={chip.key}
              onClick={() => remove(index)}
              className="inline-flex min-h-11 max-w-full items-start gap-space-xs rounded-full border border-primary bg-surface px-space-md py-2.5 text-left text-label-md text-on-surface uppercase hover:border-tertiary"
            >
              {/* The space sits outside the hidden span, so the name keeps it. */}
              <span className="sr-only">Remove</span>
              {` ${chip.label}`}
              <Icon name="close" className="shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
