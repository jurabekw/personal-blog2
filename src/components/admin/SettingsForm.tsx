'use client'

import { useState, useTransition } from 'react'
import { saveSettingsAction } from '@/app/admin/_actions/settings'
import type { AllSettings, SettingsKey } from '@/lib/settings-defaults'
import { useToast, useUnsavedWarning } from './ui'

/** Shared state + save button for settings screens. */
export function useSettingsForm<K extends SettingsKey>(key: K, initial: AllSettings[K]) {
  const [value, setValue] = useState<AllSettings[K]>(initial)
  const [saved, setSaved] = useState(JSON.stringify(initial))
  const [pending, start] = useTransition()
  const toast = useToast()
  const dirty = JSON.stringify(value) !== saved
  useUnsavedWarning(dirty)

  /** Immutable update by dot path: set('hero.title', 'x') */
  const set = (path: string, v: unknown) => {
    setValue((prev) => {
      const next = structuredClone(prev) as unknown as Record<string, unknown>
      const parts = path.split('.')
      let cur = next
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] as Record<string, unknown>
      cur[parts[parts.length - 1]] = v
      return next as unknown as AllSettings[K]
    })
  }

  const save = () =>
    start(async () => {
      const r = await saveSettingsAction(key, value)
      if (r.ok) {
        setSaved(JSON.stringify(value))
        toast.success(r.message || 'Saved.')
      } else toast.error(r.error)
    })

  const saveBar = (
    <div className="wpa-flex wpa-mt" style={{ position: 'sticky', bottom: 0, background: 'var(--a-bg)', padding: '12px 0', zIndex: 4 }}>
      <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--lg" disabled={pending || !dirty} onClick={save}>
        {pending ? 'Saving…' : 'Save Changes'}
      </button>
      {dirty ? <span className="wpa-muted">You have unsaved changes.</span> : null}
    </div>
  )

  return { value, set, setValue, save, pending, dirty, saveBar, toastNode: toast.node }
}

export function TextRow({
  label,
  value,
  onChange,
  help,
  placeholder,
  multiline,
  mono,
  type = 'text',
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  help?: React.ReactNode
  placeholder?: string
  multiline?: boolean | number
  mono?: boolean
  type?: string
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <tr>
      <th>
        <label htmlFor={id}>{label}</label>
      </th>
      <td>
        {multiline ? (
          <textarea
            id={id}
            className={`wpa-textarea${mono ? ' wpa-textarea--code' : ''}`}
            rows={typeof multiline === 'number' ? multiline : 3}
            value={String(value)}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input id={id} type={type} className="wpa-input" value={String(value)} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
        {help ? <div className="wpa-help">{help}</div> : null}
      </td>
    </tr>
  )
}

export function CheckRow({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: React.ReactNode }) {
  return (
    <tr>
      <th>{label}</th>
      <td>
        <label className="wpa-switch">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          <span>{checked ? 'On' : 'Off'}</span>
        </label>
        {help ? <div className="wpa-help">{help}</div> : null}
      </td>
    </tr>
  )
}

export function SelectRow({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  help?: React.ReactNode
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <tr>
      <th>
        <label htmlFor={id}>{label}</label>
      </th>
      <td>
        <select id={id} className="wpa-select" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 420 }}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {help ? <div className="wpa-help">{help}</div> : null}
      </td>
    </tr>
  )
}
