import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HermesBotSchema } from '../../types/hermes.ts'
import { botChanges, botErrors, formOf } from './hermesBotLogic.ts'

const bot = HermesBotSchema.parse({ name: 'editor', model: 'qwen3.6-64k:latest', provider: 'custom', baseUrl: 'http://192.168.1.184:11434/v1', contextLength: 65536, description: null })
const orig = formOf(bot)

test('hồ sơ bot: trường null/thiếu từ Hermes vẫn parse, có mặc định', () => {
  assert.deepEqual(bot.plugins, []); assert.equal(bot.gateway, 'unknown'); assert.equal(bot.soul, ''); assert.deepEqual(bot.envKeys, [])
})

test('không đổi gì thì không có gì để gửi và không có lỗi', () => {
  assert.deepEqual(botChanges(orig, orig), {})
  assert.deepEqual(botErrors(orig, orig), {})
})

test('chỉ gửi ô đã đổi, cắt khoảng trắng, contextLength thành số', () => {
  assert.deepEqual(botChanges(orig, { ...orig, model: ' qwen3.6:35b ', contextLength: '32768' }), { model: 'qwen3.6:35b', contextLength: 32768 })
})

test('kiểm tra từng ô đã đổi', () => {
  assert.ok(botErrors(orig, { ...orig, model: '  ' }).model)
  assert.ok(botErrors(orig, { ...orig, baseUrl: 'ftp://x' }).baseUrl)
  assert.equal(botErrors(orig, { ...orig, baseUrl: 'https://api.example.com/v1' }).baseUrl, undefined)
  assert.ok(botErrors(orig, { ...orig, contextLength: '512' }).contextLength)
  assert.ok(botErrors(orig, { ...orig, contextLength: '8k' }).contextLength)
  assert.equal(botErrors(orig, { ...orig, contextLength: '131072' }).contextLength, undefined)
})
