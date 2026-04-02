import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

export default function MoodCard() {
  const [mood, setMood] = useState("neutral");

  const fetchMood = async () => {
    const res = await fetch("/api/analytics/mood");
    const data = await res.json();
    setMood(data.mood);
  };

  useEffect(() => {
    fetchMood();
    const interval = setInterval(fetchMood, 5000);
    return () => clearInterval(interval);
  }, []);

  const config = {
    engaged: {
      text: "Students are highly engaged",
      color: "bg-green-50 text-green-700 border-green-200",
      emoji: "😊",
    },
    confused: {
      text: "Students seem confused",
      color: "bg-red-50 text-red-700 border-red-200",
      emoji: "😟",
    },
    neutral: {
      text: "Class is neutral",
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
      emoji: "😐",
    },
  };

  const current = config[mood as keyof typeof config];

  return (
    <Card className={`mb-6 border ${current.color}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="text-sm font-medium">
          {current.emoji} {current.text}
        </div>
      </CardContent>
    </Card>
  );
}