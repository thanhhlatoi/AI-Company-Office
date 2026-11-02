import { Briefcase, Building2, Clapperboard, Code, Crown, Server, Smartphone, Wallet, type LucideIcon } from 'lucide-react'

// Tên icon (chuỗi từ BE/config) -> icon lucide. Icon lạ rơi về Building2.
const ICONS: Record<string, LucideIcon> = {
  crown: Crown, clapperboard: Clapperboard, smartphone: Smartphone, code: Code, wallet: Wallet, briefcase: Briefcase, server: Server,
}

export function DepartmentIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICONS[name] ?? Building2
  return <Icon size={size} className={className} aria-hidden="true" />
}
