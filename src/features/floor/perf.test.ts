import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FpsMonitor } from './fpsMonitor.ts'
import { companyBalanceMicro, goalBoardText, rackState, safeText } from './objectState.ts'

const run = (m: FpsMonitor, fps: number, fromMs: number, seconds: number) => {
  let last = { fps: null as number | null, sustainedLow: false }
  for (let t = fromMs; t < fromMs + seconds * 1000; t += 1000 / fps) last = m.frame(t)
  return last
}

test('FPS: 60 fps ổn định, đo ~60 và không gợi ý hạ', () => {
  const r = run(new FpsMonitor(), 60, 0, 10)
  assert.ok(r.fps! > 58 && r.fps! < 62)
  assert.equal(r.sustainedLow, false)
})

test('FPS: chưa đủ cửa sổ thì chưa báo; thấp liên tục mới gợi ý; phục hồi thì thôi', () => {
  const m = new FpsMonitor()
  assert.equal(run(m, 30, 0, 2).fps, null)
  const low = run(m, 30, 2000, 12)
  assert.ok(low.fps! < 40 && low.sustainedLow)
  const back = run(m, 60, 14000, 12)
  assert.equal(back.sustainedLow, false)
})

test('FPS: tab ẩn (khoảng trống dài) không kéo trung bình xuống', () => {
  const m = new FpsMonitor()
  run(m, 60, 0, 8)
  m.frame(8000 + 20_000) // quay lại sau 20 giây
  const r = run(m, 60, 28_016, 8)
  assert.ok(r.fps! > 55)
  assert.equal(r.sustainedLow, false)
})

test('rackState theo số liệu thiết bị', () => {
  assert.equal(rackState(undefined), 'default')
  assert.equal(rackState({ status: 'OFFLINE', metrics: { cpuPct: 99 } }), 'off')
  assert.equal(rackState({ status: 'ONLINE', metrics: { cpuPct: 95 } }), 'alert')
  assert.equal(rackState({ status: 'ONLINE', metrics: { cpuPct: 60 } }), 'busy')
  assert.equal(rackState({ status: 'ONLINE', metrics: {} }), 'default')
})

test('số dư két sắt đúng dữ liệu thật, không có ngân sách công ty thì để trống', () => {
  const b = [{ scopeType: 'AGENT', limitMicro: 1, usedMicro: 0, reservedMicro: 0 }, { scopeType: 'COMPANY', limitMicro: 10_000_000, usedMicro: 3_500_000, reservedMicro: 500_000 }]
  assert.equal(companyBalanceMicro(b), 6_000_000)
  assert.equal(safeText(companyBalanceMicro(b)), '$6.000')
  assert.equal(safeText(companyBalanceMicro([b[0]])), '')
  assert.equal(companyBalanceMicro(undefined), null)
})

test('bảng mục tiêu: cắt ngắn tiêu đề + %', () => {
  assert.equal(goalBoardText({ title: 'Ra mắt chiến dịch TikTok Tết 2027', pct: 45 }), 'Ra mắt chiến dịc…\n45%')
  assert.match(goalBoardText(null), /mục tiêu/)
})
