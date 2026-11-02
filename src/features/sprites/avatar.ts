import type { CharacterLayerDef } from './manifest.ts'
import { hashId } from './resolvePose.ts'

export interface Avatar { skin: string; hair: string; outfit: string }

const SKINS = ['#f2c9a0', '#e0ac7e', '#c68642', '#8d5524', '#fbe0c8']
const HAIRS = ['#3b2a20', '#1f1b18', '#7c4a21', '#b8860b', '#6b7280']

/** Avatar của agent: dùng `agent.avatar` nếu BE có, thiếu thì suy ra xác định từ id (cùng agent luôn cùng diện mạo); áo = màu agent. */
export function avatarOf(a: { id: string; color: string; avatar?: Partial<Avatar> | null }): Avatar {
  const h = hashId(a.id)
  return {
    skin: a.avatar?.skin ?? SKINS[h % SKINS.length],
    hair: a.avatar?.hair ?? HAIRS[(h >> 8) % HAIRS.length],
    outfit: a.avatar?.outfit ?? a.color,
  }
}

/** Màu tint của một lớp; lớp không tintable hoặc phụ kiện thì không tint. */
export function tintFor(layer: Pick<CharacterLayerDef, 'kind' | 'tintable'>, av: Avatar): string | undefined {
  if (!layer.tintable) return undefined
  return layer.kind === 'body' ? av.skin : layer.kind === 'hair' ? av.hair : layer.kind === 'outfit' ? av.outfit : undefined
}
