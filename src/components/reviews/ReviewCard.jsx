import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { format } from "date-fns";

export default function ReviewCard({ review }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-gray-900">{review.user_name}</p>
            <p className="text-xs text-gray-500">
              {format(new Date(review.created_date), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
        {review.comment && (
          <p className="text-gray-700 text-sm">{review.comment}</p>
        )}
      </CardContent>
    </Card>
  );
}