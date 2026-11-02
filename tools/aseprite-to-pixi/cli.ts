import { readFileSync, writeFileSync } from 'node:fs'
import { asepriteToPixi, type AseExport } from './convert.ts'

const [input, output, image] = process.argv.slice(2)
if (!input) {
  console.error('Cách dùng: npm run assets:aseprite -- <aseprite.json> [atlas.json] [ten-anh.png]')
  process.exit(2)
}
try {
  const { sheet, warnings } = asepriteToPixi(JSON.parse(readFileSync(input, 'utf8')) as AseExport, image)
  for (const w of warnings) console.warn(`cảnh báo: ${w}`)
  const out = output ?? input.replace(/\.json$/, '.pixi.json')
  writeFileSync(out, `${JSON.stringify(sheet, null, 2)}\n`)
  console.log(`Đã ghi ${out}: ${Object.keys(sheet.frames).length} khung, ${Object.keys(sheet.animations).length} hoạt ảnh`)
} catch (e) {
  console.error(`LỖI: ${(e as Error).message}`)
  process.exit(1)
}
