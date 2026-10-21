import type { Metadata } from 'next'
import '@/styles/fonts.css'
import '@/styles/admin.css'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s ‹ Admin' },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="wpa-root">{children}</div>
}
