interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-red-400">error</span>
        <p className="text-sm text-red-300">{message}</p>
      </div>
      {onDismiss && (
        <button
          className="text-red-400 hover:text-red-300 transition-colors"
          onClick={onDismiss}
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
}
