import type { NotificationSettings } from '../../../types/notify'
import { useSaveSettings } from './hooks'

const TZ = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Tokyo', 'UTC']
const INPUT = 'rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50'

/** Giờ yên tĩnh (từ-đến, múi giờ) và tóm tắt cuối ngày. */
export function QuietDigest({ settings }: { settings: NotificationSettings }) {
  const save = useSaveSettings()
  const { quiet, digest } = settings
  return (
    <section aria-labelledby="quiet" className="space-y-4 rounded-card border border-slate-300 bg-white p-4">
      <h2 id="quiet" className="text-lg font-semibold">Giờ yên tĩnh và tóm tắt</h2>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" role="switch" checked={quiet.enabled} onChange={(e) => save.mutate({ quiet: { ...quiet, enabled: e.target.checked } })} className="size-4" /> Bật giờ yên tĩnh (không gửi Telegram/Email trong khoảng này)</label>
        <div className="flex flex-wrap items-center gap-2 pl-6 text-sm">
          Từ <input type="time" aria-label="Từ giờ" value={quiet.from} disabled={!quiet.enabled} onChange={(e) => e.target.value && save.mutate({ quiet: { ...quiet, from: e.target.value } })} className={INPUT} />
          đến <input type="time" aria-label="Đến giờ" value={quiet.to} disabled={!quiet.enabled} onChange={(e) => e.target.value && save.mutate({ quiet: { ...quiet, to: e.target.value } })} className={INPUT} />
          <select aria-label="Múi giờ" value={quiet.tz} disabled={!quiet.enabled} onChange={(e) => save.mutate({ quiet: { ...quiet, tz: e.target.value } })} className={INPUT}>{TZ.map((z) => <option key={z}>{z}</option>)}</select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" role="switch" checked={digest.enabled} onChange={(e) => save.mutate({ digest: { ...digest, enabled: e.target.checked } })} className="size-4" /> Tóm tắt cuối ngày (một tin gom các việc trong ngày)</label>
        <div className="pl-6 text-sm">Gửi lúc <input type="time" aria-label="Giờ gửi tóm tắt" value={digest.at} disabled={!digest.enabled} onChange={(e) => e.target.value && save.mutate({ digest: { ...digest, at: e.target.value } })} className={INPUT} /></div>
      </div>
    </section>
  )
}
