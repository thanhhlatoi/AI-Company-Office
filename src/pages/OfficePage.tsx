import { ModeTabs } from '../features/office/ModeTabs'
import { OfficeCanvas } from '../features/office/OfficeCanvas'

export default function OfficePage() {
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Văn phòng</h1>
      <ModeTabs />
      <div className="min-h-0 flex-1"><OfficeCanvas /></div>
    </div>
  )
}
