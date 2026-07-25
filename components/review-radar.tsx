import { reviewDimensions } from "@/lib/review-dimensions";

type RadarDimension = { key: string; short: string; name: string; score: number };

export function ReviewRadar({
  dimensions = reviewDimensions,
  maxScore = 10,
}: {
  dimensions?: readonly RadarDimension[];
  maxScore?: number;
}) {
  const points = dimensions.map((dimension, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const radius = Math.max(0, Math.min(1, dimension.score / maxScore)) * 42;
    return `${50 + Math.cos(angle) * radius}% ${50 + Math.sin(angle) * radius}%`;
  }).join(", ");

  return (
    <div className="css-radar" role="img" aria-label="六维评阅雷达图">
      <div className="radar-grid ring-outer" />
      <div className="radar-grid ring-middle" />
      <div className="radar-grid ring-inner" />
      <div className="radar-axis axis-one" />
      <div className="radar-axis axis-two" />
      <div className="radar-axis axis-three" />
      <div className="radar-value" style={{ clipPath: `polygon(${points})` }} />
      {dimensions.map((dimension, index) => (
        <span className={`radar-label label-${index + 1}`} key={dimension.key}>{dimension.short}</span>
      ))}
    </div>
  );
}
