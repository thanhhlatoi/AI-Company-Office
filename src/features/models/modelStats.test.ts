import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterModels, summarize } from './modelStats.ts'

const ms = [
  { id: 'cx/gpt-a', contextWindow: 272000, vision: true, tools: true, reasoning: true },
  { id: 'cx/gpt-b[1m]', contextWindow: 1048576, vision: false, tools: true },
  { id: 'cx/gpt-c' },
]

test('summarize: đếm đúng, bỏ qua trường không báo', () => {
  assert.deepEqual(summarize(ms), { count: 3, vision: 1, tools: 2, reasoning: 1, maxContext: 1048576 })
  assert.deepEqual(summarize([{ id: 'x' }]), { count: 1, vision: 0, tools: 0, reasoning: 0, maxContext: null })
})

test('filterModels: tìm theo chữ và chỉ model nhận ảnh', () => {
  assert.equal(filterModels(ms, 'GPT-B', false).length, 1)
  assert.equal(filterModels(ms, '', true).length, 1)
  assert.equal(filterModels(ms, '  ', false).length, 3)
})
