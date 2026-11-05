import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

// Kiểm tra tĩnh quy tắc bí mật của màn /settings/ai (không thay cho test chạy thật: xem tools/settings-ai-e2e.mjs).
const dir = new URL('./', import.meta.url)
const files = [
  ...readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts')).map((f) => [`features/settingsAi/${f}`, readFileSync(new URL(f, dir), 'utf8')] as const),
  ['api/settingsAi.ts', readFileSync(new URL('../../api/settingsAi.ts', import.meta.url), 'utf8')] as const,
]

test('không console.* và không sessionStorage/indexedDB', () => {
  for (const [name, src] of files) assert.doesNotMatch(src, /console\.|sessionStorage|indexedDB/, name)
})

test('localStorage chỉ dùng cho checklist Graphify', () => {
  for (const [name, src] of files) if (/localStorage/.test(src)) assert.match(name, /\/(GraphifyTab\.tsx|graphify\.ts)$/)
})

test('query key không chứa khoá/bí mật', () => {
  for (const [name, src] of files) for (const line of src.split('\n')) if (/queryKey|KEYS\s*=/.test(line)) assert.doesNotMatch(line, /apiKey|secret|token|password/i, `${name}: ${line}`)
})

test('khoá API không đi vào nháp chung', () => {
  const draft = files.find(([n]) => n.endsWith('/draft.ts'))?.[1] ?? ''
  assert.doesNotMatch(draft, /apiKey/)
})
