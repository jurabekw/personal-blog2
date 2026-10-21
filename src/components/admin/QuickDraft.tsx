'use client'

import { useState, useTransition } from 'react'
import { quickDraft } from '@/app/admin/_actions/posts'

export function QuickDraft() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState<{ text: string; id?: number } | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await quickDraft(title, content)
          if (r.ok) {
            setMsg({ text: 'Draft saved.', id: r.data?.id })
            setTitle('')
            setContent('')
          } else setMsg({ text: r.error })
        })
      }}
    >
      <div className="wpa-field">
        <label className="wpa-label" htmlFor="qd-title">Title</label>
        <input id="qd-title" className="wpa-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="wpa-field">
        <label className="wpa-label" htmlFor="qd-content">Content</label>
        <textarea id="qd-content" className="wpa-textarea" rows={4} placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <div className="wpa-between">
        <button className="wpa-btn wpa-btn--primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save Draft'}
        </button>
        {msg ? (
          <span className="wpa-muted">
            {msg.text} {msg.id ? <a href={`/admin/posts/${msg.id}/`}>Edit draft</a> : null}
          </span>
        ) : null}
      </div>
    </form>
  )
}
