'use server'

import { redirect } from 'next/navigation'
import { login, logout } from '@/lib/auth'

export interface LoginState {
  error?: string
  email?: string
}

function safeNext(next: string): string {
  return next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin/'
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') || '')
  const password = String(form.get('password') || '')
  const remember = form.get('remember') === 'on'
  const res = await login(email, password, remember)
  if (!res.ok) return { error: res.error, email }
  redirect(safeNext(String(form.get('next') || '/admin/')))
}

export async function logoutAction(): Promise<void> {
  await logout()
  redirect('/admin/login/')
}
