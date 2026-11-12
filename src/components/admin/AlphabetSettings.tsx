'use client'

import { useState, useTransition } from 'react'
import { resetAlphabetListsAction, saveAlphabetSettingsAction } from '@/app/admin/_actions/settings'
import type { AlphabetSettings } from '@/lib/translit/types'
import { useToast, useUnsavedWarning } from './ui'

type Row = { id: number; key: string; value: string }

let nextId = 1
/** Sorted by the Latin word: the database (jsonb) does not keep insertion order. */
const toRows = (map: Record<string, string>): Row[] =>
  Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b, 'uz'))
    .map(([key, value]) => ({ id: nextId++, key, value }))
/** What the editors show: the stored lists, or the built-in defaults while the stored lists are empty. */
const effective = (stored: AlphabetSettings, defaults: Defaults) => ({
  exceptions: Object.keys(stored.exceptions || {}).length ? stored.exceptions : defaults.exceptions,
  words: (stored.protectedWords?.length ? stored.protectedWords : defaults.protectedWords).join('\n'),
})
const snapshot = (rows: Row[], words: string, index: boolean) => JSON.stringify([rows.map((r) => [r.key, r.value]), words, index])

type Defaults = { exceptions: Record<string, string>; protectedWords: string[] }

/** Settings → Alifbolar: Cyrillic exceptions, protected words and /yangi/ indexing. */
export function AlphabetSettingsSection({ initial, defaults }: { initial: AlphabetSettings; defaults: Defaults }) {
  const start = effective(initial, defaults)
  const [rows, setRows] = useState<Row[]>(() => toRows(start.exceptions))
  const [words, setWords] = useState(start.words)
  const [index, setIndex] = useState(initial.indexNewLatin !== false)
  const [usingDefaults, setUsingDefaults] = useState(!Object.keys(initial.exceptions || {}).length && !initial.protectedWords?.length)
  const [saved, setSaved] = useState(() => snapshot(rows, words, index))
  const [errorRow, setErrorRow] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const toast = useToast()
  const dirty = snapshot(rows, words, index) !== saved
  useUnsavedWarning(dirty)

  const setRow = (id: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await saveAlphabetSettingsAction(fd)
      if (r.ok) {
        setErrorRow(null)
        setSaved(snapshot(rows, words, index))
        setUsingDefaults(false)
        toast.success(r.message || 'Saqlandi.')
      } else {
        setErrorRow(r.row ?? null)
        toast.error(r.error)
      }
    })
  }

  const reset = () => {
    if (!confirm("Istisnolar va himoyalangan so'zlar standart ro'yxatga qaytariladi. Davom etasizmi?")) return
    startTransition(async () => {
      const r = await resetAlphabetListsAction()
      if (!r.ok) return toast.error(r.error)
      const nextRows = toRows(defaults.exceptions)
      const nextWords = defaults.protectedWords.join('\n')
      setRows(nextRows)
      setWords(nextWords)
      setErrorRow(null)
      setUsingDefaults(true)
      setSaved(snapshot(nextRows, nextWords, index))
      toast.success(r.message || 'Tiklandi.')
    })
  }

  return (
    <form onSubmit={onSubmit}>
      {toast.node}
      {usingDefaults ? (
        <div className="wpa-notice wpa-notice--info">
          Hozir standart roʻyxatlar ishlatilmoqda. Ularni shu yerda tahrirlab saqlasangiz, saqlangan roʻyxat standart roʻyxat oʻrnini egallaydi.
        </div>
      ) : null}

      <div className="wpa-box">
        <div className="wpa-box__head">
          <h2>Kirill istisnolari</h2>
        </div>
        <div className="wpa-box__body">
          <p className="wpa-help" style={{ marginTop: 0 }}>
            Qoida bilan toʻgʻri chiqmaydigan soʻzlar (yumshoq belgi, ц). Chapda joriy lotincha soʻz yoki oʻzak, oʻngda kirillcha yozuvi. Soʻz shu oʻzak bilan boshlansa (oʻzak kamida 4 harf), qolgan qismi qoida bilan qoʻshiladi: <code>aksiya</code> → <code>акция</code>, <code>aksiyalar</code> → <code>акциялар</code>.
          </p>
          <div className="wpa-table-wrap">
            <table className="wpa-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Lotincha</th>
                  <th>Kirillcha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r, i) => (
                    <tr key={r.id} style={errorRow === i + 1 ? { background: 'rgba(214, 54, 56, 0.08)' } : undefined}>
                      <td className="wpa-muted">{i + 1}</td>
                      <td>
                        <input
                          name="exceptionKey"
                          className="wpa-input wpa-input--sm"
                          value={r.key}
                          aria-label={`${i + 1}-qator, lotincha`}
                          onChange={(e) => setRow(r.id, { key: e.target.value })}
                          lang="uz-Latn"
                        />
                      </td>
                      <td>
                        <input
                          name="exceptionValue"
                          className="wpa-input wpa-input--sm"
                          value={r.value}
                          aria-label={`${i + 1}-qator, kirillcha`}
                          onChange={(e) => setRow(r.id, { value: e.target.value })}
                          lang="uz-Cyrl"
                        />
                      </td>
                      <td className="wpa-nowrap">
                        <button type="button" className="wpa-link-btn wpa-link-btn--danger" onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}>
                          Oʻchirish
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="wpa-table__empty">
                      Istisnolar yoʻq. Boʻsh roʻyxat saqlansa, standart roʻyxat ishlatiladi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button type="button" className="wpa-btn wpa-btn--sm wpa-mt" onClick={() => setRows((prev) => [...prev, { id: nextId++, key: '', value: '' }])}>
            Qator qoʻshish
          </button>
        </div>
      </div>

      <div className="wpa-box">
        <div className="wpa-box__body">
          <table className="wpa-form-table">
            <tbody>
              <tr>
                <th>
                  <label htmlFor="alphabet-protected-words">Himoyalangan soʻzlar</label>
                </th>
                <td>
                  <textarea
                    id="alphabet-protected-words"
                    name="protectedWords"
                    className="wpa-textarea wpa-textarea--code"
                    rows={12}
                    value={words}
                    onChange={(e) => setWords(e.target.value)}
                  />
                  <div className="wpa-help">Har qatorda bitta soʻz. Bu soʻzlar kirill va yangi lotin sahifalarida ham oʻzgarmaydi (brendlar, qisqartmalar).</div>
                </td>
              </tr>
              <tr>
                <th>Yangi lotin sahifalarini indekslash</th>
                <td>
                  <label className="wpa-switch">
                    <input type="checkbox" name="indexNewLatin" checked={index} onChange={(e) => setIndex(e.target.checked)} />
                    <span>{index ? 'Yoqilgan' : 'Oʻchirilgan'}</span>
                  </label>
                  <div className="wpa-help">Oʻchirilsa, /yangi/ sahifalari noindex boʻladi va yangi lotin sayt xaritalari oʻchadi.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="wpa-flex wpa-mt" style={{ position: 'sticky', bottom: 0, background: 'var(--a-bg)', padding: '12px 0', zIndex: 4 }}>
        <button type="submit" className="wpa-btn wpa-btn--primary wpa-btn--lg" disabled={pending || !dirty}>
          {pending ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
        <button type="button" className="wpa-btn" disabled={pending} onClick={reset}>
          Standart roʻyxatni tiklash
        </button>
        {dirty ? <span className="wpa-muted">Saqlanmagan oʻzgarishlar bor.</span> : null}
      </div>
    </form>
  )
}
