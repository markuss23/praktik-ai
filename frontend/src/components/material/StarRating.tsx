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
