import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCommands, CHECKLIST, DEFAULT_IGNORE, OLLAMA_PLACEHOLDER, ollamaHost, parseChecked } from './graphify.ts'

const lines = (m: Parameters<typeof buildCommands>[0], os: Parameters<typeof buildCommands>[1], url = 'http://192.168.1.184:11434/v1') => buildCommands(m, os, url).flatMap((b) => b.lines)

test('ollamaHost bỏ đuôi /v1 và dấu / cuối', () => {
  assert.equal(ollamaHost('http://192.168.1.184:11434/v1'), 'http://192.168.1.184:11434')
  assert.equal(ollamaHost('http://192.168.1.184:11434/v1/'), 'http://192.168.1.184:11434')
  assert.equal(ollamaHost('http://localhost:11434'), 'http://localhost:11434')
  assert.equal(ollamaHost('https://ollama.lan/api/v1'), 'https://ollama.lan/api')
})

test('ollamaHost từ chối địa chỉ sai hoặc có ký tự nguy hiểm khi dán vào shell', () => {
  for (const bad of ['', 'abc', 'ftp://x', 'http://u:p@x:11434', "http://x/a'b", 'http://x/a$(id)', 'http://x/a;rm', 'http://x/a b']) assert.equal(ollamaHost(bad), null, bad)
})

test('chỉ code: cài graphifyy (hai chữ y), extract --code-only, không có biến môi trường', () => {
  const l = lines('code', 'unix')
  assert.ok(l.includes('uv tool install graphifyy'))
  assert.ok(l.includes('graphify extract . --code-only'))
  assert.ok(!l.some((x) => x.includes('GRAPHIFY_BACKEND')))
  assert.ok(l.includes('graphify hook install') && l.includes('graphify watch'))
})

test('Ollama: cài kèm extra, đặt backend và địa chỉ đã bỏ /v1, theo hệ điều hành', () => {
  const u = lines('ollama', 'unix')
  assert.ok(u.includes('uv tool install "graphifyy[ollama]"'))
  assert.ok(u.includes("export GRAPHIFY_BACKEND='ollama'"))
  assert.ok(u.includes("export OLLAMA_BASE_URL='http://192.168.1.184:11434'"))
  const p = lines('ollama', 'powershell')
  assert.ok(p.includes("$env:GRAPHIFY_BACKEND = 'ollama'"))
  assert.ok(p.includes("$env:OLLAMA_BASE_URL = 'http://192.168.1.184:11434'"))
})

test('Ollama với địa chỉ hỏng dùng chỗ trống và có ghi chú', () => {
  const b = buildCommands('ollama', 'unix', "http://x/a'b")
  assert.ok(b.flatMap((x) => x.lines).includes(`export OLLAMA_BASE_URL='${OLLAMA_PLACEHOLDER}'`))
  assert.match(b[1].note ?? '', /chưa hợp lệ/)
})

test('tắt LLM: GRAPHIFY_BACKEND=none, cài bản thường', () => {
  const l = lines('none', 'unix')
  assert.ok(l.includes("export GRAPHIFY_BACKEND='none'"))
  assert.ok(l.includes('uv tool install graphifyy'))
  assert.ok(!l.some((x) => x.includes('OLLAMA_BASE_URL')))
})

test('mặc định .graphifyignore có các mục nhạy cảm; checklist đọc an toàn', () => {
  for (const s of ['target/', 'node_modules/', '.env', '*.pem']) assert.ok(DEFAULT_IGNORE.split('\n').includes(s), s)
  assert.deepEqual(parseChecked('["uv","lạ",3]'), ['uv'])
  assert.deepEqual(parseChecked('{hỏng'), [])
  assert.deepEqual(parseChecked(null), [])
  assert.equal(CHECKLIST.length, 6)
})
