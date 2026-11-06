import { BookOpen, Briefcase, Building2, Camera, Clapperboard, Code, Crown, FlaskConical, Globe, GraduationCap, Headphones, Heart, Lightbulb, Megaphone, Music, Palette, Scale, Server, Shield, ShoppingCart, Smartphone, Truck, Users, Wallet, Wrench, type LucideIcon } from 'lucide-react'

// Tên icon (chuỗi từ BE/config) -> icon lucide. Icon lạ rơi về Building2.
const ICONS: Record<string, LucideIcon> = {
  crown: Crown, clapperboard: Clapperboard, smartphone: Smartphone, code: Code, wallet: Wallet, briefcase: Briefcase, server: Server,
  megaphone: Megaphone, users: Users, scale: Scale, flask: FlaskConical, headphones: Headphones, palette: Palette, cart: ShoppingCart,
  graduation: GraduationCap, heart: Heart, truck: Truck, camera: Camera, music: Music, book: BookOpen, globe: Globe, shield: Shield,
  wrench: Wrench, lightbulb: Lightbulb, building: Building2,
}
/** Icon chọn được trên form phòng ban (tên chuỗi lưu trong Department.icon). */
export const ICON_CHOICES = Object.keys(ICONS)

export function DepartmentIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICONS[name] ?? Building2
  return <Icon size={size} className={className} aria-hidden="true" />
}
