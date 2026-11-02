import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AgentStatus } from '../../types/index.ts'
import { avatarOf, tintFor } from './avatar.ts'
import { ANIM_TABLE } from './config.ts'
import { avoidOverlaps, labelScale } from './labelLayout.ts'
import { frameIndex, idleLook, reasonOf, resolvePose, viewOf, type PoseInput } from './resolvePose.ts'

const ALL = () => true
const ONLY_A = (a: string) => ANIM_TABLE[a as keyof typeof ANIM_TABLE]?.level === 'A'
const base = (status: AgentStatus, over: Partial<PoseInput> = {}): PoseInput => ({ id: 'ag1', status, seatFacing: 'down', nowMs: 0, has: ALL, ...over })

test('resolvePose: mỗi trạng thái, đủ hình mức B', () => {
  assert.equal(resolvePose(base('WORKING')).anim, 'sit_type')
  assert.equal(resolvePose(base('WORKING')).screen, 'working')
  const blocked = resolvePose(base('BLOCKED', { reason: 'approval' }))
  assert.deepEqual([blocked.anim, blocked.icon], ['sit_hand', 'alert'])
  assert.equal(resolvePose(base('BLOCKED', { reason: 'budget' })).icon, 'coin')
  const err = resolvePose(base('ERROR'))
  assert.deepEqual([err.anim, err.icon, err.sparks, err.screen], ['sit_error', 'none', true, 'error'])
  const off = resolvePose(base('OFFLINE'))
  assert.deepEqual([off.anim, off.icon, off.chairTilt, off.screen], ['sit_sleep', 'zzz', true, 'off'])
  assert.equal(resolvePose(base('IDLE', { reason: 'dependency' })).anim, 'sit_think')
})

test('resolvePose: thiếu hình mức B thì lùi về mức A gần nhất', () => {
  const err = resolvePose(base('ERROR', { has: ONLY_A }))
  assert.deepEqual([err.anim, err.icon, err.sparks], ['sit_hand', 'error', false])
  assert.equal(resolvePose(base('IDLE', { reason: 'dependency', has: ONLY_A })).anim, 'sit_idle')
  assert.equal(resolvePose(base('IDLE', { has: ONLY_A, override: { anim: 'drink' } })).anim, 'stand')
})

test('resolvePose: reason host/budget/approval đổi trạng thái hiển thị; override ghi đè và rời ghế', () => {
  assert.equal(resolvePose(base('WORKING', { reason: 'host' })).anim, 'sit_sleep')
  assert.equal(resolvePose(base('WORKING', { reason: 'budget' })).anim, 'sit_hand')
  const walk = resolvePose(base('WORKING', { override: { anim: 'walk', dir: 'left' } }))
  assert.deepEqual([walk.anim, walk.dir, walk.screen], ['walk', 'left', 'off'])
})

test('mọi trạng thái x có/thiếu mức B đều ra hoạt ảnh tồn tại trong bảng', () => {
  for (const s of ['IDLE', 'WORKING', 'BLOCKED', 'ERROR', 'OFFLINE'] as const)
    for (const has of [ALL, ONLY_A]) assert.ok(resolvePose(base(s, { has })).anim in ANIM_TABLE)
})

test('reasonOf: thứ tự ưu tiên; viewOf: chữ + màu hiển thị ngay', () => {
  assert.equal(reasonOf({ budgetBlocked: true, waitingApproval: true }), 'budget')
  assert.equal(reasonOf({ hostLost: true, budgetBlocked: true }), 'host')
  assert.equal(reasonOf({}), undefined)
  assert.deepEqual(viewOf('WORKING', null, 'approval'), { status: 'BLOCKED', text: 'Chờ duyệt' })
  assert.match(viewOf('WORKING', { title: 'Đối soát' }).text, /Đối soát/)
})

test('idleLook: xác định theo id + thời gian, và không phải ai cũng nhìn cùng lúc', () => {
  assert.equal(idleLook('a', 5000, 'down'), idleLook('a', 5000, 'down'))
  const looks = new Set<string>()
  for (let i = 0; i < 40; i++) looks.add(idleLook(`agent${i}`, 4000, 'down'))
  assert.ok(looks.has('down') && looks.size > 1)
  for (let t = 0; t < 40; t++) assert.notEqual(idleLook('x', t * 4000, 'left'), 'up')
})

test('frameIndex: vòng lặp, giảm chuyển động (không bước, gõ phím 2 khung chậm)', () => {
  assert.equal(frameIndex('walk', 4, 8, 0, false), 0)
  assert.equal(frameIndex('walk', 4, 8, 125, false), 1)
  assert.equal(frameIndex('walk', 4, 8, 125, true), 0)
  const seen = new Set([0, 300, 700, 1100, 1700].map((t) => frameIndex('sit_type', 4, 8, t, true)))
  assert.ok([...seen].every((f) => f < 2))
  assert.equal(frameIndex('stand', 1, 1, 9999, false), 0)
})

test('avatar: dùng avatar của agent, thiếu thì suy ra xác định; tint đúng lớp', () => {
  const a = avatarOf({ id: 'x', color: '#123456', avatar: { skin: '#aaaaaa' } })
  assert.equal(a.skin, '#aaaaaa')
  assert.equal(a.outfit, '#123456')
  assert.deepEqual(avatarOf({ id: 'x', color: '#1' }), avatarOf({ id: 'x', color: '#1' }))
  assert.equal(tintFor({ kind: 'hair', tintable: true }, a), a.hair)
  assert.equal(tintFor({ kind: 'outfit', tintable: true }, a), '#123456')
  assert.equal(tintFor({ kind: 'body', tintable: false }, a), undefined)
  assert.equal(tintFor({ kind: 'accessory', tintable: true }, a), undefined)
})

test('labelScale: chữ trên màn hình luôn trong [11, 16] px', () => {
  for (const z of [0.3, 0.6, 0.92, 1, 1.5, 3]) {
    const px = 12 * z * labelScale(z)
    assert.ok(px >= 11 - 1e-9 && px <= 16 + 1e-9, `zoom ${z}: ${px}`)
  }
  assert.equal(labelScale(1), 1)
})

test('avoidOverlaps: nhãn sau bị đẩy lên, nhãn xa nhau thì giữ, có giới hạn', () => {
  const a = { id: 'a', x: 0, y: 100, w: 100, h: 46 } // thấp hơn trên màn hình: giữ nguyên
  const b = { id: 'b', x: 20, y: 90, w: 100, h: 46 }
  const r = avoidOverlaps([a, b], 72)
  assert.equal(r.get('a'), 0)
  assert.ok(r.get('b')! > 0 && r.get('b')! <= 72)
  const far = avoidOverlaps([a, { ...b, x: 400 }], 72)
  assert.equal(far.get('b'), 0)
  const stack = avoidOverlaps([a, b, { id: 'c', x: 10, y: 80, w: 100, h: 46 }], 72)
  assert.ok(stack.get('c')! > stack.get('b')!)
  assert.ok([...stack.values()].every((v) => v <= 72))
})
