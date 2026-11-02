import { Link } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { Deliveries } from '../features/notifications/settings/Deliveries'
import { EmailSection } from '../features/notifications/settings/EmailSection'
import { useNotifySettings } from '../features/notifications/settings/hooks'
import { QuietDigest } from '../features/notifications/settings/QuietDigest'
import { RulesTable } from '../features/notifications/settings/RulesTable'
import { TelegramSection } from '../features/notifications/settings/TelegramSection'

/** /settings/notifications: kênh Telegram/Email, quy tắc theo sự kiện, giờ yên tĩnh, lịch sử giao hàng. */
export default function NotificationSettingsPage() {
  const q = useNotifySettings()
  return (
    <div className="mx-auto h-full max-w-4xl space-y-4 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24">
      <header>
        <Link to="/company" className="text-sm text-brand underline">← Về văn phòng</Link>
        <h1 className="mt-1 text-2xl font-bold">Cài đặt thông báo</h1>
      </header>
      {q.isError && <ErrorBanner message="Không tải được cài đặt thông báo." onRetry={() => void q.refetch()} />}
      {q.isLoading && <div className="space-y-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-card bg-slate-200" />)}</div>}
      {q.data && (
        <>
          <div className="grid gap-4 md:grid-cols-2"><TelegramSection tg={q.data.telegram} /><EmailSection email={q.data.email} /></div>
          <RulesTable settings={q.data} />
          <QuietDigest settings={q.data} />
        </>
      )}
      <Deliveries />
    </div>
  )
}
