'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/lib/types';

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Props = {
  message: ChatMessage;
  onRetry?: (prompt: string) => void;
  rating?: 'up' | 'down' | null;
  onFeedback?: (messageId: string, rating: 'up' | 'down') => void;
};

export default function MessageBubble({
  message,
  onRetry,
  rating,
  onFeedback,
}: Props) {
  const isUser = message.role === 'user';
  const isError = !!message.error;
  const showFeedback =
    !isUser && !isError && !!message.executionPlan && !!onFeedback;

  return (
    <div
      className={`flex flex-col ${
        isUser ? 'items-end' : 'items-start'
      } gap-1 max-w-full`}
    >
      <div
        className={[
          'rounded-2xl px-4 py-3 max-w-[85%] break-words',
          isUser
            ? 'bg-violet-500/15 border border-violet-500/30 text-text'
            : isError
              ? 'bg-rose-500/10 border border-rose-500/40 text-rose-200'
              : 'bg-surface border border-border text-text',
        ].join(' ')}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {isError && onRetry && message.retryPrompt && (
          <button
            type="button"
            onClick={() => onRetry(message.retryPrompt!)}
            className="mt-3 text-xs font-medium rounded-md border border-rose-500/40 px-3 py-1.5 text-rose-100 hover:bg-rose-500/20 transition-colors"
          >
            ↻ Retry
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 px-1">
        {message.timestamp && (
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {formatTime(message.timestamp)}
          </span>
        )}
        {showFeedback && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onFeedback!(message.id, 'up')}
              aria-pressed={rating === 'up'}
              aria-label="Mark response as helpful"
              title="Helpful"
              className={[
                'rounded-md px-1.5 py-0.5 text-xs leading-none transition-colors',
                rating === 'up'
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'text-muted hover:text-text hover:bg-surface-2',
              ].join(' ')}
            >
              <span aria-hidden>👍</span>
            </button>
            <button
              type="button"
              onClick={() => onFeedback!(message.id, 'down')}
              aria-pressed={rating === 'down'}
              aria-label="Mark response as unhelpful"
              title="Not helpful"
              className={[
                'rounded-md px-1.5 py-0.5 text-xs leading-none transition-colors',
                rating === 'down'
                  ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40'
                  : 'text-muted hover:text-text hover:bg-surface-2',
              ].join(' ')}
            >
              <span aria-hidden>👎</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
