"use client";

import { useState } from "react";
import type { ApplicationKit } from "@/types/api";

interface KitViewerProps {
  kit: ApplicationKit;
}

export default function KitViewer({ kit }: KitViewerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="kit-viewer">
      <KitSection
        title="Fit Summary"
        content={kit.fitSummary}
        field="fit"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />
      <KitSection
        title="Recruiter Pitch"
        content={kit.recruiterPitch}
        field="pitch"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />
      <KitSection
        title="Cover Letter"
        content={kit.coverLetter}
        field="letter"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />
    </div>
  );
}

function KitSection({
  title,
  content,
  field,
  copiedField,
  onCopy,
}: {
  title: string;
  content: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  return (
    <div className="kit-section">
      <h4>{title}</h4>
      <div className="kit-content">
        <button
          className="kit-copy-btn"
          onClick={() => onCopy(content, field)}
        >
          {copiedField === field ? "✓ Copied" : "Copy"}
        </button>
        {content}
      </div>
    </div>
  );
}
