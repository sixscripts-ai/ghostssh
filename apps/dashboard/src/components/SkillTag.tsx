interface SkillTagProps {
  name: string;
  variant?: "match" | "missing" | "neutral";
}

export default function SkillTag({ name, variant = "neutral" }: SkillTagProps) {
  const icon = variant === "match" ? "✓" : variant === "missing" ? "✗" : "";
  return (
    <span className={`skill-tag ${variant}`}>
      {icon && <span>{icon}</span>}
      {name}
    </span>
  );
}
