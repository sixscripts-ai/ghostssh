import KanbanBoard from "@/components/KanbanBoard";

export default function BoardPage() {
  return (
    <>
      <div className="results-header" style={{ marginTop: "var(--space-2xl)" }}>
        <div>
          <h2>Application Pipeline</h2>
          <span className="results-count">Drag and drop jobs to update application status. Auto-syncs via Appwrite.</span>
        </div>
      </div>
      
      <KanbanBoard />
    </>
  );
}
