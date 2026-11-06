import { isLocalProvider } from './providerNames'

/** "Local" = chạy trên máy bạn; "Cloud" = dịch vụ ngoài (tốn quota/tiền của nhà cung cấp, dữ liệu rời máy). */
export function CloudLocalBadge({ provider }: { provider: string }) {
  const local = isLocalProvider(provider)
  return <span className={`rounded-full px-2 py-0.5 text-xs ${local ? 'bg-emerald-100 text-emerald-900' : 'bg-sky-100 text-sky-900'}`}>{local ? 'Local' : 'Cloud'}</span>
}
