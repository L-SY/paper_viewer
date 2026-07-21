"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { reviewDimensions } from "@/lib/review-dimensions";

export function ReviewRadar() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={reviewDimensions} outerRadius="66%">
        <PolarGrid stroke="#deddda" />
        <PolarAngleAxis dataKey="short" tick={{ fill: "#787774", fontSize: 9 }} />
        <Radar dataKey="score" stroke="#3b5bdb" fill="#3b5bdb" fillOpacity={0.13} strokeWidth={1.5} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
