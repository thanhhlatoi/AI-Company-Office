import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Conversation, Message } from '../../types/history.ts'
import { toJson, toMarkdown } from './exportConv.ts'

const c = { id: 'c1', title: 'Đối soát', agentId: '1', startedAt: '2026-11-01T00:00:00Z', updatedAt: '', messageCount: 2, tokens: 10, costMicro: 0, hasError: false, tools: [] } as Conversation
const ms = [
  { id: 'm1', role: 'USER', content: 'Xin chào', createdAt: 't1', tokens: 1, costMicro: 0, truncated: false },
  { id: 'm2', role: 'TOOL', content: 'ok', createdAt: 't2', tokens: 1, costMicro: 0, truncated: true, toolName: 'send_email', toolArgs: { auth: '[REDACTED:API_KEY]' } },
] as Message[]

test('toMarkdown giữ nhãn REDACTED và đánh dấu tin bị cắt', () => {
  const md = toMarkdown(c, 'Kế toán', ms)
  assert.match(md, /^# Đối soát/)
  assert.match(md, /## Người dùng \(t1\)\n\nXin chào/)
  assert.match(md, /## Công cụ · send_email \(t2\) \[bị cắt bớt\]/)
  assert.ok(md.includes('[REDACTED:API_KEY]'))
})
test('toJson hợp lệ và đủ tin', () => assert.equal(JSON.parse(toJson(c, ms)).messages.length, 2))
