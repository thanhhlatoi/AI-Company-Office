import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { DRAWN_DIRS, FRAME_H, FRAME_W, frameName, animKey } from '../src/features/sprites/config.ts'
import { parseManifest, type Manifest } from '../src/features/sprites/manifest.ts'

export interface Issue { level: 'error' | 'warn'; message: string }
interface Frame { frame?: { w: number; h: number }; sourceSize?: { w: number; h: number } }
interface Atlas { frames: Record<string, Frame>; animations?: Record<string, string[]>; meta: { image: string; size: { w: number; h: number } } }

const MAX_ATLAS = 2048
const NAME_RE = /^([a-z]+(?:_[a-z]+)*)_(down|up|left|right)_(\d+)$/
const ROOT_FILES = new Set(['manifest.json', 'LICENSES.md'])
const OPTIONAL_DIRS = ['audio'] // tuỳ chọn, chưa kiểm (Bước 5D)

const pngSize = (file: string) => {
  const b = readFileSync(file)
  return b.length >= 24 && b.readUInt32BE(0) === 0x89504e47 ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null
}
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })

/** Atlas dạng TexturePacker: `frames` là object hoặc mảng {filename}. Chuẩn hoá về object. */
function loadAtlas(file: string): Atlas {
  const j = JSON.parse(readFileSync(file, 'utf8')) as Omit<Atlas, 'frames'> & { frames: Atlas['frames'] | (Frame & { filename: string })[] }
  const frames = Array.isArray(j.frames) ? Object.fromEntries(j.frames.map((f) => [f.filename, f])) : j.frames
  return { ...j, frames }
}

/**
 * Kiểm tra bộ tài nguyên: (a) đủ khung của hoạt ảnh bắt buộc theo hướng, (b) đúng kích thước khung,
 * (c) tên khung `{anim}_{dir}_{index}`, (d) atlas <= 2048x2048, (e) mỗi gói có giấy phép, (f) không có tệp thừa.
 */
export function checkAssets(root: string): Issue[] {
  const issues: Issue[] = []
  const err = (message: string) => issues.push({ level: 'error', message })
  const warn = (message: string) => issues.push({ level: 'warn', message })
  const mfile = join(root, 'manifest.json')
  if (!existsSync(mfile)) return [{ level: 'error', message: `thiếu ${mfile}` }]
  let m: Manifest
  try { m = parseManifest(JSON.parse(readFileSync(mfile, 'utf8'))) } catch (e) { return [{ level: 'error', message: (e as Error).message }] }

  for (const p of m.packs) if (!p.license.trim()) err(`gói "${p.id}" chưa khai báo giấy phép`)
  const used = new Set([...m.characterLayers.map((l) => l.pack)])
  for (const p of m.packs) if (!used.has(p.id) && !m.props.length && !m.tiles.length) warn(`gói "${p.id}" không có lớp nhân vật nào dùng`)

  const referenced = new Set<string>(ROOT_FILES)
  const atlases = new Map<string, Atlas | null>()
  const need = (rel: string): Atlas | null => {
    if (atlases.has(rel)) return atlases.get(rel) ?? null
    const file = join(root, rel)
    referenced.add(rel)
    let atlas: Atlas | null = null
    if (!existsSync(file)) err(`atlas ${rel} không tồn tại`)
    else {
      try { atlas = loadAtlas(file) } catch (e) { err(`atlas ${rel} không đọc được: ${(e as Error).message}`) }
    }
    if (atlas) {
      const imgRel = relative(root, join(dirname(file), atlas.meta.image))
      referenced.add(imgRel)
      const { w, h } = atlas.meta.size
      if (w > MAX_ATLAS || h > MAX_ATLAS) err(`${rel}: atlas ${w}x${h} vượt ${MAX_ATLAS}x${MAX_ATLAS}`)
      const real = existsSync(join(root, imgRel)) ? pngSize(join(root, imgRel)) : undefined
      if (real === undefined) err(`${rel}: không thấy ảnh ${imgRel}`)
      else if (real && (real.w !== w || real.h !== h)) err(`${rel}: meta.size ${w}x${h} khác ảnh thật ${real.w}x${real.h}`)
    }
    atlases.set(rel, atlas)
    return atlas
  }

  const fw = FRAME_W / m.assetScale, fh = FRAME_H / m.assetScale
  for (const layer of m.characterLayers) {
    const a = need(layer.atlas)
    if (!a) continue
    const at = `${layer.id} (${basename(layer.atlas)})`
    for (const [name, f] of Object.entries(a.frames)) {
      const n = NAME_RE.exec(name)
      if (!n) { err(`${at}: tên khung "${name}" không theo {anim}_{dir}_{index}`); continue }
      if (n[2] === 'left') err(`${at}: "${name}" — hướng trái là bản lật của phải, không vẽ riêng`)
      const s = f.frame ?? f.sourceSize
      if (s && (s.w !== fw || s.h !== fh)) err(`${at}: khung "${name}" ${s.w}x${s.h}, cần ${fw}x${fh}`)
    }
    for (const [anim, spec] of Object.entries(m.animations)) for (const dir of DRAWN_DIRS) {
      const names = Array.from({ length: spec.frames }, (_, i) => frameName(anim, dir, i))
      const have = names.filter((n) => n in a.frames)
      const extra = Object.keys(a.frames).filter((k) => k.startsWith(`${anim}_${dir}_`) && !names.includes(k))
      if (extra.length) err(`${at}: ${anim}_${dir} có ${spec.frames + extra.length} khung, cần đúng ${spec.frames} (thừa: ${extra.join(', ')})`)
      if (have.length === 0) { if (spec.level === 'A') err(`${at}: thiếu hoạt ảnh bắt buộc ${anim}_${dir} (${spec.frames} khung)`) ; continue }
      if (have.length < names.length) err(`${at}: ${anim}_${dir} thiếu khung ${names.filter((n) => !have.includes(n)).join(', ')}`)
      else if (JSON.stringify(a.animations?.[animKey(anim, dir)]) !== JSON.stringify(names)) err(`${at}: thiếu hoặc sai khoá animations["${animKey(anim, dir)}"]`)
    }
  }

  const has = (a: Atlas, name: string) => name in a.frames || name in (a.animations ?? {})
  for (const p of m.props) {
    const a = need(p.atlas)
    if (!a) continue
    for (const name of [p.frame, p.animation, ...Object.values(p.states)]) if (name && !has(a, name)) err(`prop ${p.catalogKey}: không có "${name}" trong ${p.atlas}`)
  }
  for (const t of m.tiles) { const a = need(t.atlas); if (a && !has(a, t.frame ?? t.pattern)) err(`tile ${t.pattern}: không có "${t.frame ?? t.pattern}" trong ${t.atlas}`) }
  for (const [k, e] of Object.entries(m.emotes)) { const a = need(e.atlas); if (a && !has(a, e.frame)) err(`emote ${k}: không có "${e.frame}" trong ${e.atlas}`) }

  for (const file of walk(root)) {
    const rel = relative(root, file).split('\\').join('/')
    if (referenced.has(rel) || OPTIONAL_DIRS.some((d) => rel.startsWith(`${d}/`))) continue
    err(`tệp thừa/không dùng: ${rel}`)
  }
  if (!m.characterLayers.length && !m.props.length && !m.tiles.length) warn('manifest chưa có atlas nào: toàn bộ dùng hình tạm bằng code')
  return issues
}
