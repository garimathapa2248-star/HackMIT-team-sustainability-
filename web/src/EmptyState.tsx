type EmptyProps = {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
};

export function EmptyState({ title, body, action, onAction }: EmptyProps) {
  return (
    <div className="empty-state" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
      {action && onAction ? (
        <button className="cta-ghost" type="button" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="loading-block" aria-busy="true" aria-live="polite">
      <div className="skeleton-kpis">
        <i />
        <i />
        <i />
        <i />
      </div>
      <p>{label}</p>
    </div>
  );
}
