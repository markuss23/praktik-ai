"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviewsCount?: number;
  size?: number;
}

export function StarRating({ rating, reviewsCount, size = 16 }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {stars.map((value) => {
          const filled = value <= Math.round(rating);
          return (
            <Star
              key={value}
              size={size}
              className={filled ? "text-yellow-400" : "text-gray-300"}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
      {typeof reviewsCount === "number" && (
        <span className="text-xs text-gray-500">({reviewsCount})</span>
      )}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
}

/** Interaktivní výběr hvězdiček (1–5) s hover náhledem. */
export function StarRatingInput({
  value,
  onChange,
  size = 22,
  disabled = false,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div
      className="flex items-center gap-0.5"
      role="radiogroup"
      aria-label="Hodnocení hvězdičkami"
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= active;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} z 5 hvězdiček`}
            disabled={disabled}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(star)}
            className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Star
              size={size}
              className={`transition-colors ${
                filled ? "text-yellow-400" : "text-gray-300"
              }`}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
