'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ratingFromScore, type Rating } from '@/lib/seo/analysis'

export function ScoreDot({ score, label, rating }: { score?: number | null; label: string; rating?: Rating }) {
  const r = rating ?? ratingFromScore(score)
  const text = r === 'good' ? 'Good' : r === 'ok' ? 'OK' : r === 'bad' ? 'Needs improvement' : 'Not available'
  return <span className={`wpa-dot wpa-dot--${r}`} title={`${label}: ${text}`} aria-label={`${label}: ${text}`} role="img" />
}

/** Render "**bold** text" from analysis messages. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
    </span>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  size,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm'
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="wpa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`wpa-modal${size === 'sm' ? ' wpa-modal--sm' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="wpa-modal__head">
          <h2>{title}</h2>
          <button type="button" className="wpa-btn wpa-btn--ghost wpa-btn--sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="wpa-modal__body">{children}</div>
        {footer ? <div className="wpa-modal__foot">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Toast({ message, kind = 'success', onDone }: { message: string; kind?: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, kind === 'error' ? 6000 : 3000)
    return () => clearTimeout(t)
  }, [message, kind, onDone])
  return (
    <div className={`wpa-toast${kind === 'error' ? ' wpa-toast--error' : ''}`} role="status">
      {message}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const node = toast ? <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} /> : null
  return {
    node,
    success: (message: string) => setToast({ message, kind: 'success' }),
    error: (message: string) => setToast({ message, kind: 'error' }),
  }
}

export function Field({
  label,
  help,
  htmlFor,
  children,
}: {
  label: React.ReactNode
  help?: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="wpa-field">
      <label className="wpa-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {help ? <div className="wpa-help">{help}</div> : null}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
}) {
  return (
    <label className="wpa-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: React.ReactNode }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="wpa-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={value === t.id ? 'is-active' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Warn before leaving the page with unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}
