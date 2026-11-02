import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ANIM_TABLE, DRAWN_DIRS, frameName } from '../src/features/sprites/config.ts'
import { checkAssets } from './assetsCheck.ts'

interface Opts { license?: string; drop?: string; size?: [number, number]; atlasPx?: number; extraFile?: boolean; badName?: boolean; noAnimKey?: boolean }

/** Dựng một bộ tài nguyên mẫu: một lớp body đủ mọi hoạt ảnh (A + B), có thể làm hỏng theo opts. */
function makeSet(o: Opts = {}) {
  const root = mkdtempSync(join(tmpdir(), 'assets-'))
  mkdirSync(join(root, 'sprites/characters'), { recursive: true })
  const [w, h] = o.size ?? [32, 48]
  const frames: Record<string, unknown> = {}
  const animations: Record<string, string[]> = {}
  for (const [anim, spec] of Object.entries(ANIM_TABLE)) for (const dir of DRAWN_DIRS) {
    const names = Array.from({ length: spec.frames }, (_, i) => frameName(anim, dir, i)).filter((n) => n !== o.drop)
    for (const n of names) frames[n] = { frame: { x: 0, y: 0, w, h } }
    animations[`${anim}_${dir}`] = names
  }
  if (o.badName) frames['Walk-1'] = { frame: { x: 0, y: 0, w, h } }
  const px = o.atlasPx ?? 512
  writeFileSync(join(root, 'sprites/characters/body_a.json'), JSON.stringify({ frames, animations: o.noAnimKey ? {} : animations, meta: { image: 'body_a.png', size: { w: px, h: px } } }))
  const png = Buffer.alloc(32)
  png.writeUInt32BE(0x89504e47, 0)
  png.writeUInt32BE(px, 16)
  png.writeUInt32BE(px, 20)
  writeFileSync(join(root, 'sprites/characters/body_a.png'), png)
  writeFileSync(join(root, 'manifest.json'), JSON.stringify({
    version: 1, packs: [{ id: 'p1', name: 'Gói mẫu', author: 'A', sourceUrl: 'https://x', license: o.license ?? 'CC0', attributionRequired: false }],
    characterLayers: [{ id: 'body_a', kind: 'body', style: 'a', atlas: 'sprites/characters/body_a.json', tintable: true, order: 0, pack: 'p1' }],
  }))
  if (o.extraFile) writeFileSync(join(root, 'sprites/characters/old.png'), 'x')
  return root
}
const errors = (root: string) => { try { return checkAssets(root).filter((i) => i.level === 'error').map((i) => i.message) } finally { rmSync(root, { recursive: true, force: true }) } }

test('bộ tài nguyên đúng: không lỗi', () => assert.deepEqual(errors(makeSet()), []))

test('thiếu một khung bắt buộc', () => {
  const e = errors(makeSet({ drop: 'sit_type_down_2' }))
  assert.ok(e.some((m) => m.includes('sit_type_down') && m.includes('sit_type_down_2')), e.join('\n'))
})

test('kích thước khung lệch', () => {
  const e = errors(makeSet({ size: [32, 40] }))
  assert.ok(e.some((m) => m.includes('32x40') && m.includes('32x48')))
})

test('thiếu giấy phép của gói', () => assert.ok(errors(makeSet({ license: '' })).some((m) => m.includes('giấy phép'))))

test('atlas vượt 2048', () => assert.ok(errors(makeSet({ atlasPx: 4096 })).some((m) => m.includes('vượt 2048'))))

test('tệp thừa không dùng', () => assert.ok(errors(makeSet({ extraFile: true })).some((m) => m.includes('old.png'))))

test('tên khung sai quy ước và thiếu khoá animations', () => {
  assert.ok(errors(makeSet({ badName: true })).some((m) => m.includes('Walk-1')))
  assert.ok(errors(makeSet({ noAnimKey: true })).some((m) => m.includes('animations[')))
})

test('manifest rỗng (chỉ hình tạm) không lỗi, chỉ cảnh báo', () => {
  const issues = checkAssets('public/assets')
  assert.equal(issues.filter((i) => i.level === 'error').length, 0)
})
