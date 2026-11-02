import { useState } from 'react'
import { INTERNET_ID } from '../../config/devices'
import { motionQuery } from '../../lib/motion'
import { useDeviceStore } from '../../store/deviceStore'
import type { Device, NetworkLink } from '../../types'
import { DEVICE_STATUS, fmtKbps, fmtUptime } from './format'

const W = 960, H = 440
const Y = { internet: 50, router: 190, leaf: 360 }
const SHORT = { WORKSTATION: 'PC', AI_PC: 'AI', LAPTOP: 'LT', SERVER: 'SRV', ROUTER: 'RT', NAS: 'NAS' } as const
const beads = (l: NetworkLink) => (!l.up || l.kbps < 100 ? 0 : l.kbps < 1500 ? 1 : l.kbps < 4000 ? 2 : 3)

interface Tip { x: number; y: number; lines: string[] }

/** Sơ đồ mạng: Internet -> Router -> các thiết bị. Nút tô màu theo trạng thái, đường dày/chạy hạt theo lưu lượng. */
export function NetworkMap() {
  const devices = useDeviceStore((s) => s.devicesById)
  const links = useDeviceStore((s) => s.links)
  const select = useDeviceStore((s) => s.select)
  const [tip, setTip] = useState<Tip | null>(null)
  const reduced = motionQuery().matches

  const list = Object.values(devices)
  const hub = list.find((d) => d.type === 'ROUTER')
  const leaves = list.filter((d) => d !== hub)
  const pos: Record<string, { x: number; y: number }> = { [INTERNET_ID]: { x: W / 2, y: Y.internet } }
  if (hub) pos[hub.id] = { x: W / 2, y: Y.router }
  leaves.forEach((d, i) => { pos[d.id] = { x: ((i + 0.5) * W) / leaves.length, y: Y.leaf } })
  const name = (id: string) => (id === INTERNET_ID ? 'Internet' : devices[id]?.name ?? id)
  const show = (e: { clientX: number; clientY: number }, lines: string[]) => setTip({ x: e.clientX, y: e.clientY, lines })

  const edgeTip = (l: NetworkLink) => [`${name(l.fromDeviceId)} → ${name(l.toDeviceId)}`, l.up ? 'Đang nối' : 'Đứt', `Băng thông: ${fmtKbps(l.kbps)}`, `Độ trễ: ${l.latencyMs == null ? '—' : `${Math.round(l.latencyMs)} ms`}`]
  const nodeTip = (d: Device) => {
    const into = links.find((l) => l.toDeviceId === d.id)
    return [d.name, DEVICE_STATUS[d.status].label, `Online: ${d.status === 'OFFLINE' ? '—' : fmtUptime(d.uptimeSec)}`, `Băng thông: ${fmtKbps(links.filter((l) => l.toDeviceId === d.id || l.fromDeviceId === d.id).reduce((s, l) => s + l.kbps, 0))}`, `Độ trễ: ${into?.latencyMs == null ? '—' : `${Math.round(into.latencyMs)} ms`}`]
  }

  return (
    <div className="relative h-full overflow-auto bg-slate-50 p-4" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Sơ đồ mạng" className="mx-auto h-auto w-full max-w-5xl">
        {links.map((l) => {
          const a = pos[l.fromDeviceId], b = pos[l.toDeviceId]
          if (!a || !b) return null
          const n = beads(l)
          const d = `M${a.x},${a.y} L${b.x},${b.y}`
          return (
            <g key={`${l.fromDeviceId}>${l.toDeviceId}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={l.up ? '#0e7490' : '#dc2626'} strokeOpacity={l.up ? 0.55 : 1} strokeWidth={l.up ? 2 + Math.min(5, l.kbps / 1200) : 3} strokeDasharray={l.up ? undefined : '8 6'} />
              {/* vùng rê chuột rộng hơn nét vẽ */}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={18} onMouseMove={(e) => show(e, edgeTip(l))} />
              {!reduced && Array.from({ length: n }, (_, i) => (
                <circle key={i} r={4} fill="#67e8f9" stroke="#0e7490">
                  <animateMotion dur={`${Math.max(1.2, 4 - l.kbps / 2000)}s`} begin={`${(-i * 4) / n}s`} repeatCount="indefinite" path={d} />
                </circle>
              ))}
            </g>
          )
        })}
        <g onMouseMove={(e) => show(e, ['Internet'])}>
          <circle cx={pos[INTERNET_ID].x} cy={pos[INTERNET_ID].y} r={26} fill="#e0f2fe" stroke="#0369a1" strokeWidth={3} />
          <text x={pos[INTERNET_ID].x} y={pos[INTERNET_ID].y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#0c4a6e">Internet</text>
        </g>
        {list.map((d) => {
          const p = pos[d.id], c = DEVICE_STATUS[d.status]
          return (
            <g key={d.id} role="button" tabIndex={0} aria-label={`${d.name}: ${c.label}`} className="cursor-pointer focus:outline-none"
              onClick={() => select(d.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') select(d.id) }}
              onMouseMove={(e) => show(e, nodeTip(d))}>
              <circle cx={p.x} cy={p.y} r={d === hub ? 30 : 26} fill={c.soft} stroke={c.color} strokeWidth={4} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={c.color}>{SHORT[d.type]}</text>
              <text x={d === hub ? p.x + 40 : p.x} y={d === hub ? p.y + 4 : p.y + 48} textAnchor={d === hub ? 'start' : 'middle'} fontSize={13} fontWeight={600} fill="#0f172a">{d.name}</text>
            </g>
          )
        })}
      </svg>
      {tip && (
        <div role="tooltip" className="pointer-events-none fixed z-40 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          {tip.lines.map((t, i) => <div key={i} className={i === 0 ? 'font-semibold' : ''}>{t}</div>)}
        </div>
      )}
    </div>
  )
}
