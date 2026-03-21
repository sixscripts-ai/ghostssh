export default function LoadingState() {
  return (
    <div className="loading-container">
      <div className="loading-ghost">👻</div>
      <div className="loading-text">Scanning job boards & ranking matches...</div>
      <div className="loading-bar">
        <div className="loading-bar-fill" />
      </div>
      <div className="skeleton-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    </div>
  );
}
