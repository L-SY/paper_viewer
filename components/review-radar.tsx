"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { reviewDimensions } from "@/lib/review-dimensions";

type RadarDimension = { key: string; short: string; name: string; score: number };

export function ReviewRadar({
  dimensions = reviewDimensions,
  maxScore = 10,
}: {
  dimensions?: readonly RadarDimension[];
  maxScore?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={dimensions} outerRadius="66%">
        <PolarGrid stroke="#deddda" />
        <PolarAngleAxis dataKey="short" tick={{ fill: "#787774", fontSize: 9 }} />
        <PolarRadiusAxis domain={[0, maxScore]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke="#3b5bdb" fill="#3b5bdb" fillOpacity={0.13} strokeWidth={1.5} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
