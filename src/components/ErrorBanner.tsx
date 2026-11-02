export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between bg-red-600 px-4 py-2 text-sm text-white">
      <span>{message}</span>
      <button onClick={onRetry} aria-label="Thử lại" className="rounded bg-white/20 px-3 py-1 hover:bg-white/30">Thử lại</button>
    </div>
  )
}
