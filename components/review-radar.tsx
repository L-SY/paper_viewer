import { reviewDimensions } from "@/lib/review-dimensions";

type RadarDimension = {
  key: string;
  short: string;
  name: string;
  score: number;
  levelLabel?: string;
};

const center = 120;
const chartRadius = 72;
const labelRadius = 102;

function pointAt(index: number, radius: number) {
  const angle = -Math.PI / 2 + index * Math.PI / 3;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function polygonPoints(radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const point = pointAt(index, radius);
    return `${point.x},${point.y}`;
  }).join(" ");
}

export function ReviewRadar({
  dimensions = reviewDimensions,
  maxScore = 10,
}: {
  dimensions?: readonly RadarDimension[];
  maxScore?: number;
}) {
  const valuePoints = dimensions.map((dimension, index) => {
    const ratio = Math.max(0, Math.min(1, dimension.score / maxScore));
    return pointAt(index, ratio * chartRadius);
  });
  const valuePolygon = valuePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const scores = dimensions.map((dimension) => dimension.score);
  const allSame = scores.length > 0 && scores.every((score) => score === scores[0]);
  const sharedLevel = allSame && dimensions.every((dimension) => dimension.levelLabel === dimensions[0]?.levelLabel)
    ? dimensions[0]?.levelLabel
    : null;
  const caption = sharedLevel
    ? `六项均为“${sharedLevel}”，因此轮廓接近规则六边形`
    : allSame
      ? "六项结果相同，因此轮廓接近规则六边形"
      : "越接近外圈，表示该维度越充分";
  const accessibleSummary = dimensions
    .map((dimension) => `${dimension.name}${dimension.levelLabel ? `：${dimension.levelLabel}` : `：${dimension.score}/${maxScore}`}`)
    .join("；");

  return (
    <figure className="radar-figure">
      <svg className="css-radar" viewBox="0 0 240 240" role="img" aria-label={`六维评阅雷达图。${accessibleSummary}`}>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <polygon
            className={`radar-svg-ring ${ratio === 1 ? "outer" : ""}`}
            key={ratio}
            points={polygonPoints(chartRadius * ratio)}
          />
        ))}
        {dimensions.map((dimension, index) => {
          const end = pointAt(index, chartRadius);
          return <line className="radar-svg-axis" key={`${dimension.key}-axis`} x1={center} y1={center} x2={end.x} y2={end.y} />;
        })}
        <polygon className="radar-svg-value" points={valuePolygon} />
        {valuePoints.map((point, index) => (
          <circle className="radar-svg-point" key={`${dimensions[index].key}-point`} cx={point.x} cy={point.y} r="3.5" />
        ))}
        {dimensions.map((dimension, index) => {
          const label = pointAt(index, labelRadius);
          const anchor = Math.abs(label.x - center) < 4 ? "middle" : label.x > center ? "start" : "end";
          const secondary = dimension.levelLabel || `${dimension.score}/${maxScore}`;
          return (
            <text className="radar-svg-label" key={dimension.key} x={label.x} y={label.y - 3} textAnchor={anchor}>
              <tspan className="radar-svg-label-name" x={label.x}>{dimension.short}</tspan>
              <tspan className="radar-svg-label-value" x={label.x} dy="12">{secondary}</tspan>
            </text>
          );
        })}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
