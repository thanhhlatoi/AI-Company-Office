import { Link } from 'react-router-dom'
import { DataClassBadge, HealthDot } from '../../components/studio/badges'
import { useDeviceStore } from '../../store/deviceStore'
import { formatUsd } from '../../lib/money'
import type { ModelProfile } from '../../types/models'

const TIER = { FAST: 'Nhanh', BALANCED: 'Cân bằng', POWER: 'Mạnh' } as const
const CAP = [['toolUse', 'Dùng công cụ'], ['json', 'JSON'], ['vision', 'Hình ảnh']] as const

/** Thông tin một model: nhãn LOCAL/CLOUD, tier, sức khoẻ, giá mỗi 1M token, năng lực, máy chạy. */
export function ModelInfo({ m, role }: { m: ModelProfile; role?: string }) {
  const device = useDeviceStore((s) => (m.deviceId ? s.devicesById[m.deviceId] : undefined))
  const offline = device?.status === 'OFFLINE'
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {role && <span className="text-xs font-semibold text-slate-700">{role}</span>}
        <b>{m.label}</b><DataClassBadge value={m.dataClass} /><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">{TIER[m.tier]}</span><HealthDot status={m.health.status} />
      </div>
      <p className="text-xs text-slate-700">
        {m.inputPerMTokMicro || m.outputPerMTokMicro ? <>Ước tính mỗi 1M token: vào {formatUsd(m.inputPerMTokMicro)} · ra {formatUsd(m.outputPerMTokMicro)}</> : m.dataClass === 'LOCAL' ? 'Chạy local: không tính tiền token' : 'Chưa có giá'}
        {' · '}ngữ cảnh {Math.round(m.contextTokens / 1000)}K · đồng thời {m.inUse}/{m.maxConcurrent}
      </p>
      <p className="flex flex-wrap gap-1 text-xs">{CAP.map(([k, label]) => <span key={k} className={`rounded px-1.5 py-0.5 ${m.capabilities[k] ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700 line-through'}`}>{m.capabilities[k] ? '✓' : '✗'} {label}</span>)}</p>
      {m.deviceId && <p className={`text-xs ${offline ? 'font-bold text-red-800' : 'text-slate-700'}`}>Chạy trên <Link className="underline" to="/network">{device?.name ?? m.deviceId}</Link>{offline && ': máy OFFLINE, model này đang không dùng được'}</p>}
    </div>
  )
}
