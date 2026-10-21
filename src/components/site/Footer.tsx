import Link from 'next/link'
import { getSettings } from '@/lib/data/settings'
import { getTaxonomies, type TermRef } from '@/lib/data/posts'
import { t } from '@/lib/i18n'
import { Brand } from './Brand'

function CategoryTree({ items, all, parentId }: { items: TermRef[]; all: TermRef[]; parentId: number | null }) {
  return (
    <>
      {items.map((c) => {
        const children = all.filter((x) => x.parentId === c.id)
        return (
          <li key={c.id} className="cat-item">
            <Link href={c.path}>{c.name}</Link>
            {children.length ? (
              <ul className="children">
                <CategoryTree items={children} all={all} parentId={c.id} />
              </ul>
            ) : null}
          </li>
        )
      })}
    </>
  )
}

/** footer.php */
export async function Footer() {
  const settings = await getSettings()
  const { categories } = await getTaxonomies()
  const nonEmpty = categories.filter(
    (c) => c.count > 0 || categories.some((child) => child.parentId === c.id && child.count > 0),
  )
  const roots = nonEmpty.filter((c) => !c.parentId || !nonEmpty.some((p) => p.id === c.parentId))
  const footerMenu = settings.menus.footer
  const year = new Date().getFullYear()

  return (
    <footer className="jb-footer">
      <div className="jb-shell jb-footer__grid">
        <div>
          <Brand siteName={settings.general.siteName} tagline={settings.general.tagline} logoUrl={settings.general.logoUrl} />
          {settings.appearance.footerText ? (
            <p className="jb-body jb-muted jb-footer__text">{settings.appearance.footerText}</p>
          ) : null}
        </div>

        <nav aria-label={t.categories}>
          <h2>{t.categories}</h2>
          <ul>
            <CategoryTree items={roots} all={nonEmpty} parentId={null} />
          </ul>
        </nav>

        <div>
          {footerMenu.length ? (
            <nav aria-label={settings.appearance.footerLinksTitle}>
              <h2>{settings.appearance.footerLinksTitle}</h2>
              <ul>
                {footerMenu.map((item) =>
                  /^https?:\/\//.test(item.url) ? (
                    <li key={item.id}>
                      <a href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined}>
                        {item.label}
                      </a>
                    </li>
                  ) : (
                    <li key={item.id}>
                      <Link href={item.url}>{item.label}</Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>

      <div className="jb-footer__bottom">
        <div className="jb-shell">
          <p className="jb-caption" style={{ margin: 0 }}>
            {t.rights(year, settings.general.siteName)}
          </p>
        </div>
      </div>
    </footer>
  )
}
