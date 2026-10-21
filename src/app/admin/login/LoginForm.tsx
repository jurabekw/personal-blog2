'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '../_actions/auth'

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {})
  return (
    <form action={action}>
      {state.error ? (
        <div className="wpa-notice wpa-notice--error" role="alert">
          <p>{state.error}</p>
        </div>
      ) : null}
      <input type="hidden" name="next" value={next} />
      <div className="wpa-field">
        <label className="wpa-label" htmlFor="email">
          Email
        </label>
        <input className="wpa-input" id="email" name="email" type="email" autoComplete="username" required autoFocus={!state.email} defaultValue={state.email} key={state.email} />
      </div>
      <div className="wpa-field">
        <label className="wpa-label" htmlFor="password">
          Password
        </label>
        <input className="wpa-input" id="password" name="password" type="password" autoComplete="current-password" required autoFocus={Boolean(state.email)} />
      </div>
      <div className="wpa-between">
        <label className="wpa-check">
          <input type="checkbox" name="remember" defaultChecked /> Remember me
        </label>
        <button className="wpa-btn wpa-btn--primary wpa-btn--lg" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Log In'}
        </button>
      </div>
    </form>
  )
}
