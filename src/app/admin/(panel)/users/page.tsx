import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { listUsers } from '@/app/admin/_actions/users'
import { UsersScreen } from '@/components/admin/UsersScreen'

export const metadata: Metadata = { title: 'Users' }

export default async function UsersPage() {
  const me = await requireUser('manage_users')
  return <UsersScreen initial={await listUsers()} meId={me.id} />
}
