interface ScoreBadgeProps {
  score: number;
  size?: "default" | "sm";
}

export default function ScoreBadge({ score, size = "default" }: ScoreBadgeProps) {
  const tier = score >= 70 ? "high" : score >= 40 ? "mid" : "low";
  const className = `score-badge ${tier}${size === "sm" ? " score-badge-sm" : ""}`;

  return <div className={className}>{score}</div>;
}
