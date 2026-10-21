'use client'

import { useEffect } from 'react'
import { t } from '@/lib/i18n'

function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    if (ok) resolve()
    else reject(new Error('copy failed'))
  })
}

/**
 * Port of the theme's features.js + toc.js:
 * reading progress bar, "Mundarija" scroll-spy, copy-link and copy-box buttons.
 * Renders nothing; attaches listeners to server-rendered markup.
 */
export function Enhancer() {
  useEffect(() => {
    const cleanups: (() => void)[] = []

    /* Copy buttons (event delegation). */
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLElement>('.jb-copy-link, .jb-copy-button')
      if (!button) return
      const container = button.closest('.jb-share, .jb-copy-box')
      const status = container?.querySelector<HTMLElement>("[role='status']")
      let text = button.dataset.copyUrl || ''
      if (!text) {
        const content = button.closest('.jb-copy-box')?.querySelector<HTMLElement>('.jb-copy-box__content')
        text = content ? content.innerText.trim() : ''
      }
      copyText(text)
        .then(() => {
          button.classList.add('is-copied')
          const success = button.dataset.labelSuccess || t.copied
          if (status) status.textContent = success
          if (button.classList.contains('jb-copy-button')) button.textContent = success
          window.setTimeout(() => {
            button.classList.remove('is-copied')
            if (status) status.textContent = ''
            if (button.classList.contains('jb-copy-button')) button.textContent = button.dataset.labelDefault || t.copy
          }, 2200)
        })
        .catch(() => {
          if (status) status.textContent = t.copyFailed
        })
    }
    document.addEventListener('click', onClick)
    cleanups.push(() => document.removeEventListener('click', onClick))

    /* Reading progress. */
    const bar = document.querySelector<HTMLElement>('[data-jb-reading-progress]')
    const article = document.querySelector<HTMLElement>('.jb-article')
    if (bar && article) {
      const update = () => {
        const rect = article.getBoundingClientRect()
        const start = window.scrollY + rect.top
        const distance = Math.max(1, article.offsetHeight - window.innerHeight)
        const value = Math.min(1, Math.max(0, (window.scrollY - start) / distance))
        bar.style.transform = `scaleX(${value})`
        bar.parentElement?.setAttribute('aria-valuenow', String(Math.round(value * 100)))
      }
      update()
      window.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update)
      cleanups.push(() => {
        window.removeEventListener('scroll', update)
        window.removeEventListener('resize', update)
      })
    }

    /* Mundarija scroll-spy: a clicked item stays active until the reader scrolls manually. */
    const links: { link: HTMLAnchorElement; target: HTMLElement; id: string }[] = []
    document.querySelectorAll<HTMLAnchorElement>('[data-jb-toc] .jb-toc__link').forEach((link) => {
      const id = decodeURIComponent((link.getAttribute('href') || '').slice(1))
      const target = id ? document.getElementById(id) : null
      if (target) links.push({ link, target, id })
    })
    if (links.length) {
      let clicked: string | null = null
      let ticking = false
      const offset = () => {
        const header = document.querySelector<HTMLElement>('.jb-header')
        return (header ? header.offsetHeight : 64) + 20
      }
      const setActive = (id: string) => {
        for (const item of links) {
          const on = item.id === id
          item.link.classList.toggle('is-active', on)
          if (on) item.link.setAttribute('aria-current', 'true')
          else item.link.removeAttribute('aria-current')
        }
      }
      const update = () => {
        ticking = false
        if (clicked) return setActive(clicked)
        const limit = offset()
        let current = links[0].id
        for (const item of links) if (item.target.getBoundingClientRect().top <= limit) current = item.id
        setActive(current)
      }
      const onScroll = () => {
        if (!ticking) {
          ticking = true
          window.requestAnimationFrame(update)
        }
      }
      const release = () => {
        if (clicked) {
          clicked = null
          onScroll()
        }
      }
      const handlers = links.map((item) => {
        const h = () => {
          clicked = item.id
          setActive(item.id)
        }
        item.link.addEventListener('click', h)
        return () => item.link.removeEventListener('click', h)
      })
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll, { passive: true })
      window.addEventListener('wheel', release, { passive: true })
      window.addEventListener('touchstart', release, { passive: true })
      window.addEventListener('keydown', release)
      update()
      cleanups.push(() => {
        handlers.forEach((h) => h())
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
        window.removeEventListener('wheel', release)
        window.removeEventListener('touchstart', release)
        window.removeEventListener('keydown', release)
      })
    }

    return () => cleanups.forEach((c) => c())
  }, [])

  return null
}
