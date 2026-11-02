import { generate } from './generate.ts'

const args = process.argv.slice(2)
const out = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--scale' && args[args.indexOf(a) - 1] !== '--drop')
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
if (!out) {
  console.error('Cách dùng: npm run assets:sample -- <thư-mục-đích> [--scale 2] [--drop walk_up_2]')
  process.exit(2)
}
generate(out, { scale: opt('--scale') === '2' ? 2 : 1, drop: opt('--drop') })
console.log(`Đã sinh gói mẫu vào ${out}. Kiểm tra: npm run assets:check -- ${out}`)
