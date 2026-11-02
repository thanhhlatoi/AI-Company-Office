import { NetworkMap } from '../features/devices/NetworkMap'
import { ModeTabs } from '../features/office/ModeTabs'

export default function NetworkPage() {
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Sơ đồ mạng</h1>
      <ModeTabs />
      <div className="min-h-0 flex-1"><NetworkMap /></div>
    </div>
  )
}
