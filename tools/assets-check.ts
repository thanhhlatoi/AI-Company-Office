import { checkAssets } from './assetsCheck.ts'

const root = process.argv[2] ?? 'public/assets'
const issues = checkAssets(root)
for (const i of issues) console.log(`${i.level === 'error' ? 'LỖI ' : 'cảnh báo'}  ${i.message}`)
const errors = issues.filter((i) => i.level === 'error').length
console.log(errors ? `\nassets:check THẤT BẠI: ${errors} lỗi` : `\nassets:check OK (${issues.length} cảnh báo)`)
process.exit(errors ? 1 : 0)
