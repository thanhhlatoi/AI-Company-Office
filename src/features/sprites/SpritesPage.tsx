import { Application } from 'pixi.js'
import { useEffect, useRef, useState } from 'react'
import { buildStage, type StageOpts } from './SpriteStage.ts'
import { createSpriteProvider } from './createProvider.ts'
import type { CompositeProvider } from './provider.ts'
import type { Manifest } from './manifest.ts'

const DEFAULTS: StageOpts = { skin: '#f2c9a0', hair: '#3b2a20', outfit: '#2563eb', floor: '#e8f0fe', fpsScale: 1, grid: true, anchor: true }
const COLORS: [keyof StageOpts, string][] = [['skin', 'Màu da'], ['hair', 'Màu tóc'], ['outfit', 'Màu áo'], ['floor', 'Màu sàn']]

/** /dev/sprites — chỉ có trong môi trường dev. Rà bằng mắt hoạt ảnh, hướng, anchor, footprint, khung đang dùng hình tạm. */
export default function SpritesPage() {
  const host = useRef<HTMLDivElement>(null)
  const app = useRef<Application | null>(null)
  const [env, setEnv] = useState<{ provider: CompositeProvider; manifest: Manifest } | null>(null)
  const [opts, setOpts] = useState(DEFAULTS)
  const [missing, setMissing] = useState<string[]>([])

  useEffect(() => {
    let dead = false
    const a = new Application()
    void (async () => {
      await a.init({ width: 780, height: 600, background: '#f8fafc', antialias: true, resolution: window.devicePixelRatio, autoDensity: true })
      if (dead) return a.destroy(true)
      host.current?.appendChild(a.canvas)
      app.current = a
      setEnv(await createSpriteProvider(a.renderer))
    })()
    return () => { dead = true; app.current = null; if (a.renderer) a.destroy(true, { children: true }) }
  }, [])

  useEffect(() => {
    const a = app.current
    if (!a || !env) return
    const { root, height } = buildStage(env.provider, opts)
    a.stage.removeChildren().forEach((c) => c.destroy({ children: true }))
    a.stage.addChild(root)
    a.renderer.resize(780, height)
    setMissing(env.provider.missing())
  }, [env, opts])

  const set = <K extends keyof StageOpts>(k: K, v: StageOpts[K]) => setOpts((o) => ({ ...o, [k]: v }))
  return (
    <div className="flex min-h-screen gap-4 bg-slate-100 p-4 text-sm text-slate-800">
      <aside className="w-64 shrink-0 space-y-4">
        <h1 className="text-lg font-semibold">/dev/sprites</h1>
        <div className="space-y-2">
          {COLORS.map(([k, name]) => (
            <label key={k} className="flex items-center justify-between">{name}
              <input type="color" value={opts[k] as string} onChange={(e) => set(k, e.target.value as never)} />
            </label>
          ))}
          <label className="block">Tốc độ hoạt ảnh x{opts.fpsScale.toFixed(1)}
            <input className="w-full" type="range" min={0.25} max={3} step={0.25} value={opts.fpsScale} onChange={(e) => set('fpsScale', +e.target.value)} />
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={opts.grid} onChange={(e) => set('grid', e.target.checked)} />Khung 32x48</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={opts.anchor} onChange={(e) => set('anchor', e.target.checked)} />Đường anchor (chân)</label>
        </div>
        <section>
          <h2 className="font-medium">Lớp đang dùng</h2>
          <ul className="text-xs">{env?.provider.layers().map((l) => <li key={l.id}>{l.order}. {l.id} ({l.kind}{l.tintable ? ', tint' : ''})</li>)}</ul>
          <p className="mt-1 text-xs text-slate-500">Gói trong manifest: {env?.manifest.packs.length ?? 0}</p>
        </section>
        <section>
          <h2 className="font-medium">Khung thiếu → hình tạm ({missing.length})</h2>
          {missing.length ? <ul className="max-h-64 overflow-auto text-xs text-amber-700">{missing.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="text-xs text-slate-500">Không có (hoặc chưa có atlas nào).</p>}
        </section>
      </aside>
      <div ref={host} className="overflow-auto rounded border border-slate-300 bg-white" />
    </div>
  )
}
