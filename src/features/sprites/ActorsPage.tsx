import { Application, Container, Graphics } from 'pixi.js'
import { useEffect, useRef, useState } from 'react'
import type { Agent, AgentStatus } from '../../types/index.ts'
import { AgentActor } from './AgentActor.ts'
import type { Dir, Quality } from './config.ts'
import { createSpriteProvider } from './createProvider.ts'
import { avoidOverlaps } from './labelLayout.ts'
import type { PoseOverride } from './resolvePose.ts'

interface Case {
  label: string; status: AgentStatus; facing?: Dir; reason?: 'budget' | 'approval' | 'dependency' | 'host'
  override?: PoseOverride; carry?: 'paper' | 'cup'; head?: boolean; tag?: 'LOCAL' | 'CLOUD'
}
const CASES: Case[] = [
  { label: 'IDLE', status: 'IDLE' }, { label: 'WORKING', status: 'WORKING' },
  { label: 'Chờ duyệt', status: 'WORKING', reason: 'approval' }, { label: 'Chờ ngân sách', status: 'WORKING', reason: 'budget' },
  { label: 'ERROR', status: 'ERROR' }, { label: 'Chờ phụ thuộc', status: 'IDLE', reason: 'dependency' },
  { label: 'OFFLINE', status: 'OFFLINE' }, { label: 'Mất máy chủ', status: 'WORKING', reason: 'host' },
  { label: 'WORKING ↑', status: 'WORKING', facing: 'up' }, { label: 'WORKING ←', status: 'WORKING', facing: 'left', tag: 'LOCAL' },
  { label: 'WORKING →', status: 'WORKING', facing: 'right', head: true, tag: 'CLOUD' }, { label: 'stand', status: 'IDLE', override: { anim: 'stand' } },
  { label: 'walk →', status: 'IDLE', override: { anim: 'walk', dir: 'right' }, carry: 'paper' }, { label: 'walk ←', status: 'IDLE', override: { anim: 'walk', dir: 'left' }, carry: 'paper' },
  { label: 'talk', status: 'IDLE', override: { anim: 'talk', dir: 'down' } }, { label: 'drink', status: 'IDLE', override: { anim: 'drink', dir: 'down' }, carry: 'cup' },
]
const COLORS = ['#2563eb', '#c93d31', '#15803d', '#a8379a', '#b8530a', '#0e7490']
const COLS = 4, CELL_W = 250, CELL_H = 190

const agentOf = (i: number, c: Case): Agent => ({
  id: `agent-${i}`, name: ['Lan', 'Minh', 'Hà', 'Quân'][i % 4], role: c.head ? 'Trưởng phòng' : 'Kế toán', model: 'x', systemPrompt: '', color: COLORS[i % COLORS.length],
  status: c.status, currentTask: c.status === 'WORKING' ? { id: 't', title: 'Đối soát công nợ tháng 10' } : null, departmentId: null, isHead: !!c.head, runsOnDeviceId: null,
})

/** /dev/actors — xem AgentActor (nhiều lớp, nhãn, bong bóng) với mọi trạng thái bằng hình tạm. Chỉ có trong môi trường dev. */
export default function ActorsPage() {
  const host = useRef<HTMLDivElement>(null)
  const state = useRef<{ app: Application; world: Container; actors: AgentActor[] } | null>(null)
  const [quality, setQuality] = useState<Quality>('medium')
  const [reduced, setReduced] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [crowd, setCrowd] = useState(false)

  useEffect(() => {
    let dead = false
    const app = new Application()
    void (async () => {
      await app.init({ width: COLS * CELL_W, height: Math.ceil(CASES.length / COLS) * CELL_H + 200, background: '#f8fafc', antialias: true, resolution: window.devicePixelRatio, autoDensity: true })
      if (dead) return app.destroy(true)
      host.current?.appendChild(app.canvas)
      const { provider } = await createSpriteProvider(app.renderer)
      const world = new Container()
      app.stage.addChild(world)
      const actors = CASES.map((c, i) => {
        const a = new AgentActor(`agent-${i}`, provider, { onTap: (id) => a.say(`Xin chào, tôi là ${id}`) })
        const cx = (i % COLS) * CELL_W + CELL_W / 2, cy = Math.floor(i / COLS) * CELL_H + 150
        a.position.set(cx, cy)
        a.update({ agent: agentOf(i, c), accent: '#2563eb', modelTag: c.tag ?? null, hostLost: c.reason === 'host', budgetBlocked: c.reason === 'budget', waitingApproval: c.reason === 'approval', waitingDependency: c.reason === 'dependency', seatFacing: c.facing ?? 'down' })
        a.setOverride(c.override)
        if (c.carry) a.setCarry(c.carry)
        world.addChild(new Graphics().circle(cx, cy, 2).fill('#ef4444'), a) // chấm đỏ = điểm chân
        return a
      })
      // hai người đứng sát nhau để thấy nhãn tự tránh chồng
      const y = Math.ceil(CASES.length / COLS) * CELL_H + 150
      for (const [j, dx] of [[0, 0], [1, 46], [2, 92]] as const) {
        const a = new AgentActor(`crowd-${j}`, provider)
        a.position.set(120 + dx, y - j * 6)
        a.update({ agent: { ...agentOf(j, CASES[1]), id: `crowd-${j}`, status: 'IDLE', currentTask: null }, accent: '#2563eb', seatFacing: 'down' })
        a.visible = false
        world.addChild(a)
        actors.push(a)
      }
      app.ticker.add(() => {
        const now = performance.now()
        const vis = actors.filter((a) => a.visible)
        vis.forEach((a) => a.animate(now))
        const dys = avoidOverlaps(vis.map((a) => ({ id: a.agentId, ...a.labelRect() })))
        vis.forEach((a) => a.setLabelShift(dys.get(a.agentId) ?? 0))
      })
      state.current = { app, world, actors }
      setQuality((q) => q) // kích hoạt effect áp tuỳ chọn
    })()
    return () => { dead = true; state.current = null; if (app.renderer) app.destroy(true, { children: true }) }
  }, [])

  useEffect(() => {
    const s = state.current
    if (!s) return
    s.actors.forEach((a, i) => {
      a.setQuality(quality); a.setReducedMotion(reduced); a.setZoom(zoom)
      if (i >= CASES.length) a.visible = crowd
    })
    s.world.scale.set(1)
  }, [quality, reduced, zoom, crowd])

  return (
    <div className="flex min-h-screen gap-4 bg-slate-100 p-4 text-sm text-slate-800">
      <aside className="w-64 shrink-0 space-y-3">
        <h1 className="text-lg font-semibold">/dev/actors</h1>
        <label className="block">Chất lượng
          <select className="mt-1 w-full rounded border p-1" value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
            <option value="low">Thấp (không bóng, không cross-fade, fps nửa)</option><option value="medium">Vừa</option><option value="high">Cao</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} />Giảm chuyển động</label>
        <label className="block">Zoom camera giả lập ×{zoom.toFixed(2)} (nhãn tự co giãn; &lt; 0.6 = chấm)
          <input className="w-full" type="range" min={0.3} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={crowd} onChange={(e) => setCrowd(e.target.checked)} />Thử 3 nhãn đứng sát nhau (hàng cuối)</label>
        <p className="text-xs text-slate-500">Bấm vào nhân vật để hiện bong bóng chat (tối đa 40 ký tự, tắt sau 3 giây). Chấm đỏ = điểm chân (anchor).</p>
        <ul className="text-xs text-slate-600">{CASES.map((c, i) => <li key={c.label}>{i + 1}. {c.label}</li>)}</ul>
      </aside>
      <div ref={host} className="overflow-auto rounded border border-slate-300 bg-white" />
    </div>
  )
}
