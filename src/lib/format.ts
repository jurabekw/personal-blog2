const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
]

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' })
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]))
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) }
}

/** Date as shown in the theme ("Oktabr 2, 2026" for Uzbek). */
export function formatDate(date: Date | string, language = 'uz', timeZone = 'Asia/Tashkent'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  if (language === 'uz') {
    const { y, m, d: day } = parts(d, timeZone)
    return `${UZ_MONTHS[m - 1]} ${day}, ${y}`
  }
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, year: 'numeric', month: 'long', day: 'numeric' }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

export function formatDateTime(date: Date | string, timeZone = 'Asia/Tashkent'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
