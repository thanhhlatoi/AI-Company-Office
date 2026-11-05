// Kiểm tra chạy thật màn /settings/ai bằng Chrome headless (không thêm thư viện).
// Cần: google-chrome, và dev server đang chạy với VITE_USE_MOCK=true. Dùng: npm run e2e:settings-ai  (đổi địa chỉ bằng E2E_URL)
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const BASE = process.env.E2E_URL ?? 'http://localhost:5173/settings/ai'
// hồ sơ Chrome mới mỗi lần chạy (không dính localStorage cũ)
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9333', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'agentoffice-e2e-'))}`, 'about:blank'], { stdio: 'ignore', detached: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let tgt
for (let i = 0; i < 40; i++) { try { tgt = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page'); if (tgt) break } catch {} await sleep(250) }
const ws = new WebSocket(tgt.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pending = new Map(); const logs = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } else if (d.method === 'Runtime.consoleAPICalled') logs.push(JSON.stringify(d.params.args.map((a) => a.value ?? a.description))) }
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Runtime.enable'); await send('Page.enable')
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description)); return r.result.result.value }
const go = async (q) => { await send('Page.navigate', { url: `${BASE}?${q}` }); await sleep(1800) }
const H = `
const btn = (t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t || b.getAttribute('aria-label') === t)
const setVal = (el, v) => { const p = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })) }
const txt = () => document.body.innerText
`
const run = (code) => ev(`(async()=>{${H}; ${code}})()`)
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`) }

// ---- A. Khoá API ghi một chiều
const SECRET = 'sk-TEST-SECRET-123'
await go('tab=omniroute&mock=ok')
check('A1 cảnh báo chi phí hiện khi dùng OmniRoute', await run(`return txt().includes('SẼ THẤP HƠN THỰC TẾ')`))
check('A2 cảnh báo chi phí không có nút đóng, có link Bảng giá', await run(`const w=[...document.querySelectorAll('div')].find(d=>d.className.includes('border-amber-500')&&d.innerText.includes('THẤP HƠN')); return !!w && !w.querySelector('[aria-label*="Đóng"],[aria-label*="đóng"]') && !!w.querySelector('a[href="/costs/prices"]')`))
check('A3 thấy "Đã đặt ●●●●", không thấy giá trị khoá', await run(`return txt().includes('Đã đặt ●●●●')`))
await run(`btn('Đổi khoá').click()`); await sleep(200)
check('A4 ô khoá là type=password, autocomplete=off', await run(`const i=document.getElementById('omni-key'); return i.type==='password' && i.autocomplete==='off'`))
const after = await run(`const i=document.getElementById('omni-key'); setVal(i, ${JSON.stringify(SECRET)}); await new Promise(r=>setTimeout(r,50)); document.querySelector('form').requestSubmit(); await new Promise(r=>setTimeout(r,0)); return { inputGone: !document.getElementById('omni-key'), inDom: document.documentElement.outerHTML.includes(${JSON.stringify(SECRET)}) }`)
check('A5 ô nhập bị xoá ngay khi gửi, khoá không còn trong DOM', after.inputGone && !after.inDom, JSON.stringify(after))
await sleep(900)
check('A6 báo "Đã lưu khoá"', await run(`return txt().includes('Đã lưu khoá')`))
const leak = await run(`return { dom: document.documentElement.outerHTML.includes(${JSON.stringify(SECRET)}), ls: JSON.stringify({...localStorage}).includes(${JSON.stringify(SECRET)}), ss: JSON.stringify({...sessionStorage}).includes(${JSON.stringify(SECRET)}), url: location.href.includes(${JSON.stringify(SECRET)}), idb: (await indexedDB.databases()).length }`)
check('A7 khoá không ở DOM/localStorage/sessionStorage/URL', !leak.dom && !leak.ls && !leak.ss && !leak.url, JSON.stringify(leak))
check('A8 khoá không xuất hiện trong console', !logs.some((l) => l.includes(SECRET)))
await run(`btn('Xoá khoá').click()`); await sleep(200)
check('A9 xoá khoá có hộp xác nhận', await run(`return !!document.querySelector('[role=dialog]') && txt().includes('Xoá: Khoá API OmniRoute')`))
await run(`btn('Huỷ').click()`)

// ---- B. Nháp, lưu, xác nhận
await go('tab=ollama&mock=ok')
check('B1 chưa sửa thì không có thanh Lưu', await run(`return !btn('Bỏ thay đổi')`))
await run(`setVal(document.getElementById('timeout'), '600')`); await sleep(100)
check('B2 sửa 1 trường → "1 thay đổi chưa lưu"', await run(`return txt().includes('1 thay đổi chưa lưu')`))
await run(`setVal(document.getElementById('timeout'), '0')`); await sleep(100)
check('B3 giá trị sai → lỗi + nút Lưu bị khoá', await run(`const s=[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Lưu (')); return txt().includes('Số nguyên từ 1 đến 3600') && s.disabled`))
await run(`setVal(document.getElementById('timeout'), '300')`); await sleep(100)
check('B4 trả về giá trị cũ → hết thay đổi', await run(`return !btn('Bỏ thay đổi')`))
await run(`setVal(document.getElementById('ollama-url'), 'http://u:p@10.0.0.2:11434/v1')`); await sleep(100)
check('B5 URL có user:pass@ bị chặn', await run(`return txt().includes('Không đặt user:mật khẩu@')`))
await run(`setVal(document.getElementById('ollama-url'), 'https://api.example.com/v1')`); await sleep(100)
check('B6 URL ngoài LAN chỉ cảnh báo', await run(`return txt().includes('ngoài mạng LAN') && ![...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Lưu (')).disabled`))
await run(`setVal(document.getElementById('ollama-url'), 'http://10.0.0.2:11434/v1'); await new Promise(r=>setTimeout(r,100)); [...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Lưu (')).click()`); await sleep(300)
check('B7 đổi địa chỉ → hộp xác nhận nêu hậu quả', await run(`return !!document.querySelector('[role=dialog]') && txt().includes('Địa chỉ Ollama đổi từ')`))
await run(`const d=document.querySelector('[role=dialog]'); [...d.querySelectorAll('button')].find(b=>b.textContent==='Lưu').click()`); await sleep(900)
check('B8 lưu xong: hết thanh Lưu, giá trị mới được giữ', await run(`return !btn('Bỏ thay đổi') && document.getElementById('ollama-url').value==='http://10.0.0.2:11434/v1'`))

// ---- C. source=env
await go('tab=ollama&mock=env')
check('C1 env: banner chỉ xem, ô bị khoá, không có thanh Lưu', await run(`return txt().includes('chỉ xem được') && document.getElementById('ollama-url').disabled && !btn('Bỏ thay đổi')`))
check('C2 env: nút Thử kết nối vẫn bấm được', await run(`return !btn('Thử kết nối').disabled`))
await go('tab=omniroute&mock=env')
check('C3 env: không có nút Đổi/Xoá khoá', await run(`return !btn('Đổi khoá') && !btn('Xoá khoá') && txt().includes('do tệp .env')`))

// ---- D. Thử kết nối
await go('tab=ollama&mock=down')
await run(`btn('Thử kết nối').click()`); await sleep(900)
check('D1 lỗi LLM_UNAVAILABLE → checklist + mã tra log', await run(`return txt().includes('Kiểm tra lần lượt') && txt().includes('Mã tra log: req-')`))
check('D2 kết quả nằm trong vùng aria-live', await run(`return !!document.querySelector('[aria-live=polite] .bg-red-50')`))
await go('tab=ollama&mock=slow')
await run(`btn('Gọi thử 1 câu').click()`); await sleep(400)
check('D3 đang chạy: có spinner + nút Huỷ', await run(`return txt().includes('Đang thử') && !!btn('Huỷ')`))
await run(`btn('Huỷ').click()`); await sleep(100)
check('D4 Huỷ → về trạng thái chờ, không hiện kết quả', await run(`return !txt().includes('Đang thử') && !txt().includes('Thành công')`))
await sleep(4500)
check('D5 kết quả của lần đã huỷ không hiện muộn', await run(`return !txt().includes('Thành công')`))
await go('tab=ollama&mock=ok')
await run(`btn('Gọi thử 1 câu').click()`); await sleep(900)
check('D6 gọi thử ok: hiện câu trả lời mẫu', await run(`return txt().includes('Câu trả lời mẫu: “Chào”')`))

// ---- E. Định tuyến + bàn phím + banner
await go('tab=routing&mock=ok')
await run(`btn('Thêm dòng tuỳ chỉnh').click()`); await sleep(100)
check('E1 dòng mới để trống → lỗi, Lưu khoá', await run(`return txt().includes('Tên alias không được để trống') && [...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Lưu (')).disabled`))
await run(`setVal(document.querySelector('input[aria-label^="Tên alias"]'), 'planner')`); await sleep(100)
check('E2 tên trùng planner → lỗi trùng', await run(`return txt().includes('Tên alias bị trùng')`))
await go('tab=overview&mock=ok')
await run(`const t=document.getElementById('tab-overview'); t.focus(); t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`); await sleep(300)
check('E3 phím → chuyển tab, URL ?tab=ollama, focus theo', await run(`return location.search.includes('tab=ollama') && document.activeElement.id==='tab-ollama'`))
await go('mock=badshape')
check('E4 dữ liệu sai định dạng: có thông báo, không sập', await run(`return txt().includes('BE trả dữ liệu không đúng định dạng') && !txt().includes('stack')`))
check('E5 console không in nguyên response sai định dạng', !logs.some((l) => l.includes('sometimes')))
await go('tab=graphify&mock=ok')
await run(`[...document.querySelectorAll('input[type=radio]')].find(r=>r.parentElement.textContent.includes('Dùng Ollama')).click()`); await sleep(150)
check('G1 Graphify chế độ Ollama: có graphifyy[ollama] và OLLAMA_BASE_URL bỏ /v1', await run(`return txt().includes('uv tool install "graphifyy[ollama]"') && txt().includes("OLLAMA_BASE_URL='http://192.168.1.184:11434'")`))
await run(`const cb=document.querySelector('input[type=checkbox]'); cb.click()`); await sleep(100)
check('G2 checklist chỉ lưu id ô tick', await run(`return localStorage.getItem('agentoffice.graphifyChecklist')==='["uv"]'`))

console.log(`\n${pass} pass, ${fail} fail`)
ws.close(); process.kill(-chrome.pid); process.exit(fail ? 1 : 0)
