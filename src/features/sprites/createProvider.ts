import type { Renderer } from 'pixi.js'
import { AtlasSpriteProvider } from './AtlasSpriteProvider.ts'
import { EMPTY_MANIFEST, parseManifest, type Manifest } from './manifest.ts'
import { ProceduralSpriteProvider } from './ProceduralSpriteProvider.ts'
import { CompositeProvider } from './provider.ts'

const BASE = `${import.meta.env.BASE_URL}assets/`

async function loadManifest(): Promise<Manifest> {
  try {
    const res = await fetch(BASE + 'manifest.json')
    if (!res.ok) return EMPTY_MANIFEST
    return parseManifest(await res.json())
  } catch (e) {
    console.warn('[sprites] manifest lỗi, dùng toàn bộ hình tạm:', e)
    return EMPTY_MANIFEST
  }
}

/** Atlas (nếu có) + hình tạm. Luôn trả về provider dùng được, không bao giờ ném lỗi. */
export async function createSpriteProvider(renderer: Renderer): Promise<{ provider: CompositeProvider; manifest: Manifest; procedural: ProceduralSpriteProvider }> {
  const manifest = await loadManifest()
  const procedural = new ProceduralSpriteProvider(renderer)
  const atlas = await AtlasSpriteProvider.load(manifest, BASE)
  return { provider: new CompositeProvider(atlas.hasContent() ? atlas : null, procedural), manifest, procedural }
}
