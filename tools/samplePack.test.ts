import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkAssets } from './assetsCheck.ts'
import { generate, type Options } from './sample-pack/generate.ts'

const run = (o: Options) => {
  const dir = mkdtempSync(join(tmpdir(), 'pack-'))
  try { generate(dir, o); return { dir: dir, issues: checkAssets(dir), png: readFileSync(join(dir, 'sprites/characters/body_pixel.png')) } } finally { rmSync(dir, { recursive: true, force: true }) }
}
const errs = (o: Options) => run(o).issues.filter((i) => i.level === 'error').map((i) => i.message)

test('gói mẫu 32px qua assets:check không lỗi, PNG hợp lệ', () => {
  const r = run({})
  assert.deepEqual(r.issues.filter((i) => i.level === 'error'), [])
  assert.equal(r.png.subarray(1, 4).toString(), 'PNG')
})

test('gói mẫu 16px (assetScale 2): khung 16x24 vẫn đúng quy cách', () => assert.deepEqual(errs({ scale: 2 }), []))

test('bỏ một khung: assets:check báo đúng khung thiếu', () => {
  const e = errs({ drop: 'walk_up_2' })
  assert.ok(e.some((m) => m.includes('walk_up') && m.includes('walk_up_3')), e.join('\n'))
})
