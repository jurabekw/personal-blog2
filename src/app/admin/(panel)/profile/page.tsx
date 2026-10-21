import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { ProfileScreen } from '@/components/admin/UsersScreen'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const me = await requireUser()
  return <ProfileScreen user={{ name: me.name, email: me.email, role: me.role }} />
}
