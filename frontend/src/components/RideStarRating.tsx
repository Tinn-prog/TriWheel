"use client";

import { FormEvent, useState } from "react";
import {
  getRideRatingCopy,
  type RideRatingVariant,
} from "@/lib/rideRatingCopy";
import { parseRatingToStars } from "@/lib/rideRatings";

const STAR = "★";
const EMPTY_STAR = "☆";

function displayStarClass(size: "sm" | "md", filled: boolean) {
  const base = size === "sm" ? "text-sm leading-none" : "text-xl leading-none";
  return filled ? `${base} text-amber-400` : `${base} text-slate-300`;
}

function inputStarClass(size: "sm" | "md" | "lg", filled: boolean) {
  const base =
    size === "sm"
      ? "text-lg leading-none"
      : size === "md"
        ? "text-2xl leading-none"
        : "text-3xl leading-none";
  return filled ? `${base} text-amber-400` : `${base} text-slate-300`;
}

function inputStarGap(size: "sm" | "md" | "lg") {
  return size === "sm" ? "gap-1" : size === "md" ? "gap-1.5" : "gap-2";
}

export function StarRatingDisplay({
  value,
  size = "sm",
}: {
  value: string | number | null;
  size?: "sm" | "md";
}) {
  const stars = parseRatingToStars(value);

  if (stars === null) {
    return <span className="text-xs font-semibold text-slate-400">Not rated</span>;
  }

  return (
    <span aria-label={`${stars} out of 5 stars`} className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <span className={displayStarClass(size, index < stars)} key={index}>
          {index < stars ? STAR : EMPTY_STAR}
        </span>
      ))}
    </span>
  );
}

export function StarRatingInput({
  name,
  required = false,
  size = "md",
  value,
  onChange,
}: {
  name: string;
  required?: boolean;
  size?: "sm" | "md" | "lg";
  value?: number;
  onChange?: (value: number) => void;
}) {
  const [selected, setSelected] = useState(value ?? 0);
  const [hovered, setHovered] = useState(0);
  const active = hovered || selected;

  function pickStars(next: number) {
    setSelected(next);
    onChange?.(next);
  }

  return (
    <div className={`inline-flex items-center ${inputStarGap(size)}`}>
      <input
        name={name}
        required={required}
        type="hidden"
        value={selected > 0 ? selected : ""}
      />
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= active;

        return (
          <button
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
            className={`rounded p-0.5 transition ${inputStarClass(size, filled)} hover:scale-110`}
            key={starValue}
            onBlur={() => setHovered(0)}
            onClick={() => pickStars(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(0)}
            type="button"
          >
            {filled ? STAR : EMPTY_STAR}
          </button>
        );
      })}
    </div>
  );
}

export function DriverRatingSummary({
  average,
  count,
  variant = "regular",
}: {
  average: number | null;
  count: number;
  variant?: RideRatingVariant;
}) {
  if (average === null || count <= 0) {
    return (
      <span className="text-xs font-semibold text-slate-400">
        {variant === "emergency" ? "No emergency ratings yet" : "No ratings yet"}
      </span>
    );
  }

  const countLabel =
    variant === "emergency"
      ? `${count} emergency rating${count === 1 ? "" : "s"}`
      : `${count} rating${count === 1 ? "" : "s"}`;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      {variant === "emergency" ? (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
          Emergency
        </span>
      ) : null}
      <StarRatingDisplay size="sm" value={Math.round(average)} />
      <span className="font-bold text-slate-700">{average.toFixed(1)}</span>
      <span className="text-slate-400">({countLabel})</span>
    </span>
  );
}

export function RideRatingFeedback({
  comment,
  label,
  rating,
  variant = "regular",
}: {
  comment: string | null;
  label: string;
  rating: string | null;
  variant?: RideRatingVariant;
}) {
  const stars = parseRatingToStars(rating);

  if (stars === null && !comment) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
      {variant === "emergency" ? (
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
          Emergency
        </span>
      ) : null}
      <span className="shrink-0 font-bold text-slate-500">{label}</span>
      {stars !== null ? <StarRatingDisplay size="sm" value={rating} /> : null}
      {comment ? (
        <span className="min-w-0 truncate italic text-slate-400">&ldquo;{comment}&rdquo;</span>
      ) : null}
    </div>
  );
}

export function RideRatingForm({
  compact = false,
  isSubmitting,
  label,
  onCancel,
  onSubmit,
  variant = "regular",
  audience = "passenger",
}: {
  compact?: boolean;
  isSubmitting: boolean;
  label?: string;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  variant?: RideRatingVariant;
  audience?: "passenger" | "driver";
}) {
  const copy = getRideRatingCopy(variant, audience);
  const formLabel = label ?? copy.formLabel;
  const shellClass =
    variant === "emergency"
      ? "border-red-100 bg-red-50/80"
      : "border-orange-100 bg-orange-50/80";
  const compactShellClass =
    variant === "emergency"
      ? "border-red-100 bg-red-50/60"
      : "border-orange-100 bg-orange-50/60";
  const accentTextClass =
    variant === "emergency" ? "text-red-800" : "text-orange-800";
  const fieldBorderClass =
    variant === "emergency" ? "border-red-200 focus:border-red-400" : "border-orange-200 focus:border-orange-400";
  const submitClass =
    variant === "emergency"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-orange-500";

  if (compact) {
    return (
      <form
        className={`mt-2 flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:flex-wrap sm:items-center ${compactShellClass}`}
        onSubmit={onSubmit}
      >
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-[10px] font-bold ${accentTextClass}`}>{formLabel}</span>
          <StarRatingInput name="rating" required size="lg" />
        </div>
        <input
          className={`min-w-0 w-full max-w-xs flex-1 rounded-md border bg-white px-2 py-1 text-xs outline-none sm:max-w-sm ${fieldBorderClass}`}
          name="feedback"
          placeholder={copy.feedbackPlaceholder}
          type="text"
        />
        <div className="flex shrink-0 gap-2">
          {onCancel ? (
            <button
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 sm:px-3"
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          ) : null}
          <button
            className={`rounded-md px-2.5 py-1 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-3 ${submitClass}`}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "..." : "Submit"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className={`mt-3 space-y-3 rounded-xl border p-3 ${shellClass}`}
      onSubmit={onSubmit}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-bold ${accentTextClass}`}>{formLabel}</span>
        <StarRatingInput name="rating" required />
      </div>
      <textarea
        className={`w-full resize-none rounded-lg border bg-white px-3 py-2 text-xs outline-none ${fieldBorderClass}`}
        name="feedback"
        placeholder={copy.feedbackPlaceholder}
        rows={2}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            className="tw-btn-secondary min-h-10 px-4 py-2 text-sm"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
        <button
          className={`min-h-10 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${submitClass}`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Submitting..." : copy.submitLabel}
        </button>
      </div>
    </form>
  );
}
