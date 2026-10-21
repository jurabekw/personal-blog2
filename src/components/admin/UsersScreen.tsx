'use client'

import { useState, useTransition } from 'react'
import { createUser, deleteUser, listUsers, logoutEverywhere, resetUserPassword, updateProfile, updateUserRole } from '@/app/admin/_actions/users'
import { Field, useToast } from './ui'

type UserRow = Awaited<ReturnType<typeof listUsers>>[number]

export function UsersScreen({ initial, meId }: { initial: UserRow[]; meId: number }) {
  const toast = useToast()
  const [rows, setRows] = useState(initial)
  const [form, setForm] = useState({ email: '', name: '', role: 'author', password: '' })
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const reload = async () => setRows(await listUsers())
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn()
      if (r.ok) toast.success(r.message || 'Done')
      else toast.error(r.error || 'Failed')
      await reload()
    })

  return (
    <>
      {toast.node}
      <div className="wpa-head">
        <h1>Users</h1>
        <button type="button" className="wpa-btn" onClick={() => setOpen((v) => !v)}>
          Add New User
        </button>
      </div>
      {open ? (
        <form
          className="wpa-box"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              const r = await createUser(form)
              if (r.ok) {
                setForm({ email: '', name: '', role: 'author', password: '' })
                setOpen(false)
              }
              return r
            })
          }}
        >
          <div className="wpa-box__body wpa-grid wpa-grid--4" style={{ alignItems: 'end' }}>
            <Field label="Email" htmlFor="u-email">
              <input id="u-email" className="wpa-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Name" htmlFor="u-name">
              <input id="u-name" className="wpa-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Role" htmlFor="u-role">
              <select id="u-role" className="wpa-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="author">Author — writes and publishes own posts</option>
                <option value="editor">Editor — manages all content and SEO</option>
                <option value="administrator">Administrator — everything</option>
              </select>
            </Field>
            <Field label="Password" htmlFor="u-pass" help="At least 10 characters, letters and numbers.">
              <input id="u-pass" className="wpa-input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            </Field>
          </div>
          <div className="wpa-box__foot">
            <span />
            <button className="wpa-btn wpa-btn--primary" type="submit" disabled={pending}>
              Add New User
            </button>
          </div>
        </form>
      ) : null}
      <div className="wpa-table-wrap">
        <table className="wpa-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Last login</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="row-title">{u.email}</td>
                <td>{u.name}</td>
                <td>
                  <select className="wpa-select wpa-input--sm" style={{ width: 'auto' }} value={u.role} disabled={u.id === meId} onChange={(e) => run(() => updateUserRole(u.id, e.target.value))}>
                    <option value="administrator">Administrator</option>
                    <option value="editor">Editor</option>
                    <option value="author">Author</option>
                  </select>
                </td>
                <td className="muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                <td className="wpa-nowrap">
                  {u.id !== meId ? (
                    <>
                      <button
                        type="button"
                        className="wpa-link-btn"
                        onClick={() => {
                          const pw = prompt(`New password for ${u.email} (min 10 characters, letters and numbers):`)
                          if (pw) run(() => resetUserPassword(u.id, pw))
                        }}
                      >
                        Reset password
                      </button>{' '}
                      ·{' '}
                      <button type="button" className="wpa-link-btn wpa-link-btn--danger" onClick={() => confirm(`Delete ${u.email}?`) && run(() => deleteUser(u.id))}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="muted">You</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function ProfileScreen({ user }: { user: { name: string; email: string; role: string } }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name, email: user.email, currentPassword: '', newPassword: '' })
  const [pending, start] = useTransition()
  return (
    <>
      {toast.node}
      <div className="wpa-head">
        <h1>Profile</h1>
      </div>
      <form
        className="wpa-box"
        style={{ maxWidth: 720 }}
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await updateProfile(form)
            if (r.ok) {
              toast.success(r.message || 'Saved')
              setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }))
            } else toast.error(r.error)
          })
        }}
      >
        <div className="wpa-box__body">
          <p className="wpa-muted">Role: {user.role}. The public author name, bio and photo are edited in Appearance → Customize → Author.</p>
          <Field label="Display name" htmlFor="p-name">
            <input id="p-name" className="wpa-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email (used to log in)" htmlFor="p-email">
            <input id="p-email" className="wpa-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <hr className="wpa-hr" />
          <Field label="New password" htmlFor="p-new" help="Leave empty to keep the current password. At least 10 characters with letters and numbers.">
            <input id="p-new" className="wpa-input" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </Field>
          <Field label="Current password" htmlFor="p-cur" help="Required to change the email or password.">
            <input id="p-cur" className="wpa-input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          </Field>
        </div>
        <div className="wpa-box__foot">
          <button
            type="button"
            className="wpa-link-btn"
            onClick={() =>
              start(async () => {
                const r = await logoutEverywhere()
                if (r.ok) toast.success(r.message || 'Done')
              })
            }
          >
            Log out of all other devices
          </button>
          <button className="wpa-btn wpa-btn--primary" type="submit" disabled={pending}>
            Update Profile
          </button>
        </div>
      </form>
    </>
  )
}
