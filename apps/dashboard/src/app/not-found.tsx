import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      gap: 'var(--space-md)'
    }}>
      <div style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>404</div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>Page not found</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: 'var(--space-md)' }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className="btn btn-primary">
        Return Home
      </Link>
    </div>
  );
}
