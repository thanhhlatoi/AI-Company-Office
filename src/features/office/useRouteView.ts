import { matchPath, useLocation } from 'react-router-dom'

/** Đọc phòng / agent đang xem từ URL (URL là nguồn sự thật). */
export function useRouteView(): { slug?: string; agentId?: string } {
  const { pathname } = useLocation()
  const withAgent = matchPath('/department/:slug/agent/:id', pathname)
  const room = withAgent ?? matchPath('/department/:slug', pathname)
  return { slug: room?.params.slug, agentId: withAgent?.params.id }
}
