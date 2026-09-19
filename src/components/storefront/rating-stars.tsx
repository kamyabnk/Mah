import { cn } from "@/lib/cn";

interface RatingStarsProps {
  rating: number | null;
  reviewCount?: number;
  className?: string;
}

export function RatingStars({ rating, reviewCount, className }: RatingStarsProps) {
  if (rating === null) return null;
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex" aria-label={`Rating: ${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rounded ? "text-amber" : "text-espresso/20"}>
            ★
          </span>
        ))}
      </div>
      {reviewCount !== undefined && <span className="text-sm text-espresso-light">({reviewCount})</span>}
    </div>
  );
}
