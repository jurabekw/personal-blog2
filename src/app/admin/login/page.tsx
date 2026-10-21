import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/data/settings'
import { isDatabaseConfigured } from '@/lib/db'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Log In' }

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const sp = await searchParams
  const next = typeof sp.next === 'string' ? sp.next : '/admin/'
  if (await getCurrentUser()) redirect('/admin/')
  const settings = await getSettings()
  const missing = [
    !isDatabaseConfigured() && 'DATABASE_URL',
    !(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16) && 'AUTH_SECRET',
  ].filter(Boolean)
  return (
    <div className="wpa-login">
      <div className="wpa-login__card">
        <div className="wpa-login__brand">
          <span className="wpa-login__mark">{Array.from(settings.general.siteName)[0] ?? 'J'}</span>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{settings.general.siteName}</h1>
        </div>
        {missing.length ? (
          <div className="wpa-notice wpa-notice--warning">
            <p>
              Setup needed: add <code>{missing.join(', ')}</code> to the environment variables and redeploy.
            </p>
          </div>
        ) : null}
        <LoginForm next={next} />
        <p className="wpa-login__foot">
          <a href="/">← Go to {settings.general.siteName}</a>
        </p>
      </div>
    </div>
  )
}
