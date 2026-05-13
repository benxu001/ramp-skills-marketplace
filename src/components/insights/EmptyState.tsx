'use client';

type Props = {
  onSeed: () => void;
};

export default function EmptyState({ onSeed }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border bg-surface/40">
      <div className="text-4xl mb-3">📊</div>
      <h3 className="text-lg font-medium text-text">No data yet</h3>
      <p className="text-sm text-muted mt-1.5 max-w-md">
        Run a few queries from the Chat tab, or seed 20 synthetic entries to
        see how the dashboard, QA flags, and Claude diagnosis come together.
      </p>
      <button
        type="button"
        onClick={onSeed}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 transition-colors"
      >
        Load demo data
      </button>
    </div>
  );
}
