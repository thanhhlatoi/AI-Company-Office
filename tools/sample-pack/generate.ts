import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ANIM_TABLE, DRAWN_DIRS, FRAME_H, FRAME_W, type DrawnDir } from '../../src/features/sprites/config.ts'
import { asepriteToPixi, type AseExport } from '../aseprite-to-pixi/convert.ts'
import { Canvas, encodePng, type RGBA } from './png.ts'

/**
 * Sinh gói tài nguyên MẪU (pixel-art khối, giấy phép CC0 do chính dự án tạo) để kiểm chứng đường nạp:
 * lớp body + một đồ vật (cây, 2 khung) + một ô sàn. Đi qua đúng quy trình thật: Aseprite JSON -> aseprite-to-pixi -> atlas.
 * `scale` 2 = gói 16px (assetScale 2). `drop` = bỏ một khung để thử chế độ lùi về hình tạm.
 */
export interface Options { scale?: 1 | 2; drop?: string }

const WHITE: RGBA = [255, 255, 255, 255]
const EYE: RGBA = [30, 41, 59, 255]
const GREEN: RGBA = [34, 139, 34, 255]
const POT: RGBA = [180, 83, 9, 255]

/** Thân (đầu vuông + hai bàn tay) trắng để tint theo màu da. Tư thế đơn giản nhưng khác nhau theo hoạt ảnh/khung/hướng. */
function body(anim: string, dir: DrawnDir, i: number, k: number): Canvas {
  const c = new Canvas(Math.round(FRAME_W * k), Math.round(FRAME_H * k), k)
  const sit = anim.startsWith('sit_')
  const dy = sit ? 10 : 0
  const bob = anim === 'walk' && i % 2 ? -1 : 0
  const nod = anim === 'sit_idle' && i % 2 ? 1 : 0
  c.rect(10, 5 + dy + bob + nod, 12, 12, WHITE)
  if (dir !== 'up') for (const x of dir === 'right' ? [17] : [13, 18]) c.rect(x, 10 + dy + bob + nod, 2, 2, EYE)
  const lift = anim === 'sit_hand' ? -14 : 0
  const typing = anim === 'sit_type' ? (i % 2) * 2 : 0
  c.rect(5, 30 + dy + lift + typing, 4, 4, WHITE)
  c.rect(23, 30 + dy + (anim === 'sit_hand' ? -14 : 0) + (anim === 'sit_type' ? ((i + 1) % 2) * 2 : 0), 4, 4, WHITE)
  return c
}

const plant = (i: number, k: number) => {
  const c = new Canvas(Math.round(32 * k), Math.round(52 * k), k)
  c.rect(9, 36, 14, 16, POT)
  for (const [x, y, w, h] of [[6 + i * 2, 22, 8, 8], [18 - i * 2, 18, 8, 10], [11, 8 + i, 10, 14]]) c.rect(x, y, w, h, GREEN)
  return c
}

const carpet = (k: number) => {
  const c = new Canvas(Math.round(32 * k), Math.round(32 * k), k)
  c.rect(0, 0, 32, 32, [243, 244, 246, 255])
  for (let n = 0; n < 24; n++) c.rect((n * 13) % 32, (n * 7) % 32, 2, 2, [209, 213, 219, 255])
  return c
}

export function generate(out: string, o: Options = {}): void {
  const k = o.scale === 2 ? 0.5 : 1
  const fw = Math.round(FRAME_W * k), fh = Math.round(FRAME_H * k)
  const write = (rel: string, data: string | Buffer) => { mkdirSync(dirname(join(out, rel)), { recursive: true }); writeFileSync(join(out, rel), data) }

  // --- Lớp nhân vật: Aseprite-style (frames + frameTags) -> aseprite-to-pixi ---
  const frames: Canvas[] = []
  const tags: NonNullable<AseExport['meta']['frameTags']> = []
  for (const [anim, spec] of Object.entries(ANIM_TABLE)) for (const dir of DRAWN_DIRS) {
    const from = frames.length
    for (let i = 0; i < spec.frames; i++) if (`${anim}_${dir}_${i}` !== o.drop) frames.push(body(anim, dir, i, k))
    if (frames.length > from) tags.push({ name: `${anim}_${dir}`, from, to: frames.length - 1, direction: 'forward' })
  }
  const cols = 10, rows = Math.ceil(frames.length / cols)
  const sheet = new Canvas(cols * fw, rows * fh)
  const ase: AseExport = { frames: [], meta: { image: 'body_pixel.png', size: { w: sheet.w, h: sheet.h }, frameTags: tags } }
  frames.forEach((f, n) => {
    const x = (n % cols) * fw, y = Math.floor(n / cols) * fh
    sheet.blit(f, x, y);
    (ase.frames as unknown[]).push({ filename: `f ${n}`, frame: { x, y, w: fw, h: fh }, trimmed: false, sourceSize: { w: fw, h: fh } })
  })
  write('sprites/characters/body_pixel.png', encodePng(sheet))
  write('sprites/characters/body_pixel.json', `${JSON.stringify(asepriteToPixi(ase, 'body_pixel.png').sheet, null, 2)}\n`)

  // --- Đồ vật (cây, hoạt ảnh 2 khung) và ô sàn ---
  const pw = Math.round(32 * k), ph = Math.round(52 * k), tw = Math.round(32 * k)
  const props = new Canvas(pw * 2, ph)
  props.blit(plant(0, k), 0, 0); props.blit(plant(1, k), pw, 0)
  write('sprites/props/pixel_props.png', encodePng(props))
  write('sprites/props/pixel_props.json', `${JSON.stringify({
    frames: { plant_0: { frame: { x: 0, y: 0, w: pw, h: ph } }, plant_1: { frame: { x: pw, y: 0, w: pw, h: ph } } },
    animations: { plant_sway: ['plant_0', 'plant_1'] }, meta: { image: 'pixel_props.png', size: { w: pw * 2, h: ph }, scale: '1' },
  }, null, 2)}\n`)
  write('sprites/tiles/pixel_tiles.png', encodePng(carpet(k)))
  write('sprites/tiles/pixel_tiles.json', `${JSON.stringify({ frames: { carpet: { frame: { x: 0, y: 0, w: tw, h: tw } } }, meta: { image: 'pixel_tiles.png', size: { w: tw, h: tw }, scale: '1' } }, null, 2)}\n`)

  write('manifest.json', `${JSON.stringify({
    version: 1, tileSize: 32, assetScale: o.scale ?? 1, pixelArt: true,
    packs: [{ id: 'sample-pixel', name: 'AgentOffice mẫu (pixel)', author: 'AgentOffice', sourceUrl: '', license: 'CC0-1.0', attributionRequired: false, notes: 'Sinh bằng tools/sample-pack, chỉ để kiểm chứng đường nạp tài nguyên.' }],
    characterLayers: [{ id: 'body_pixel', kind: 'body', style: 'pixel', atlas: 'sprites/characters/body_pixel.json', tintable: true, order: 0, pack: 'sample-pixel' }],
    props: [{ catalogKey: 'plant', atlas: 'sprites/props/pixel_props.json', animation: 'plant_sway' }],
    tiles: [{ pattern: 'carpet', atlas: 'sprites/tiles/pixel_tiles.json', frame: 'carpet', tintable: true }],
  }, null, 2)}\n`)
  write('LICENSES.md', '# Giấy phép tài nguyên\n\n- **AgentOffice mẫu (pixel)**: CC0-1.0, do dự án tự sinh bằng `tools/sample-pack`; chỉ để kiểm thử.\n')
}
