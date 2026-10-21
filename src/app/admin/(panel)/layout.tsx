import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/data/settings'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const settings = await getSettings()
  return (
    <AdminShell siteName={settings.general.siteName} user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </AdminShell>
  )
}
