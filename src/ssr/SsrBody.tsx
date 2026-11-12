import React from 'react';
import { MarkdownContent } from '../components/ui/MarkdownContent.js';
import { formatUzbekDate, formatUzbekReadingTime } from '../lib/i18n.js';
import { buildScriptPath, SCRIPT_LABEL, SCRIPTS, type Script } from '../lib/script.js';
import { transliterateText } from '../lib/translit/core.js';
import type { TranslitConfig } from '../lib/translit/types.js';
import type { PageKind } from '../lib/pageCopy.js';
import type { UiStrings } from '../lib/uiStrings.js';
import type { Category, Post, SiteSettings } from '../types.js';

export interface SsrBodyProps {
  script: Script;
  kind: PageKind;
  /** Path without alphabet prefix (used by the alphabet links). */
  path: string;
  posts: Post[];
  post: Post | null;
  settings: SiteSettings;
  categories: Category[];
  ui: UiStrings;
  cfg: TranslitConfig;
  alphabetsEnabled: boolean;
  notFoundTitle: string;
  notFoundText: string;
}

/**
 * Static, server-rendered version of a public page. Crawlers read this HTML; the React app
 * replaces it on load. Must not touch window, document or localStorage.
 */
export const SsrBody: React.FC<SsrBodyProps> = (props) => {
  const { script, kind, posts, post, settings, ui, cfg } = props;
  const href = (p: string) => buildScriptPath(script, p);
  const t = (s: string) => transliterateText(s, script, cfg);
  const date = (p: Post) => t(formatUzbekDate(p.publishedAt || p.createdAt));

  const postList = (list: Post[]) => (
    <ul className="flex flex-col gap-8">
      {list.map((p) => (
        <li key={p.id}>
          <article>
            <h2 className="font-serif text-[22px] font-semibold">
              <a href={href(`/blog/${p.slug}`)}>{p.title}</a>
            </h2>
            <p className="text-[13px] text-[#666666]">
              <time dateTime={p.publishedAt || p.createdAt}>{date(p)}</time> · {p.category} ·{' '}
              {t(formatUzbekReadingTime(p.readingTimeMinutes))}
            </p>
            {p.excerpt && <p className="mt-2 text-[15px]">{p.excerpt}</p>}
          </article>
        </li>
      ))}
    </ul>
  );

  let main: React.ReactNode;
  if (kind === 'post' && post) {
    const idx = posts.findIndex((p) => p.id === post.id);
    const prev = idx >= 0 ? posts[idx + 1] : undefined;
    const next = idx > 0 ? posts[idx - 1] : undefined;
    const related = posts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 3);
    const faqs = (post.faqs || []).filter((f) => f.question?.trim() && f.answer?.trim());
    main = (
      <article className="w-full max-w-[72ch] mx-auto px-6 py-12">
        <p className="text-[13px] text-[#666666]">
          <a href={href('/blog')}>{ui.article.backToArchive}</a>
        </p>
        <h1 className="font-serif text-[36px] font-bold mt-4">{post.title}</h1>
        <p className="text-[13px] text-[#666666] mt-2">
          <time dateTime={post.publishedAt || post.createdAt}>{date(post)}</time> · {post.category} ·{' '}
          {t(formatUzbekReadingTime(post.readingTimeMinutes))}
        </p>
        {post.coverImage && (
          <img src={post.coverImage} alt={post.coverImageAlt || post.title} className="w-full rounded-[12px] mt-6" />
        )}
        <div className="mt-8">
          <MarkdownContent content={post.content} copyLabel={ui.article.copy} copiedLabel={ui.article.copied} />
        </div>
        {faqs.length > 0 && (
          <section id="faq" className="mt-12">
            <h2 className="font-serif text-[26px] font-semibold">{ui.article.faqTitle}</h2>
            <dl>
              {faqs.map((f) => (
                <React.Fragment key={f.id}>
                  <dt className="font-semibold mt-4">{f.question}</dt>
                  <dd className="mt-1">{f.answer}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        )}
        <p className="mt-10 text-[14px]">
          {ui.article.writtenBy} {settings.authorName}
        </p>
        <nav className="mt-8 flex justify-between gap-4 text-[14px]">
          {prev ? <a href={href(`/blog/${prev.slug}`)}>← {prev.title}</a> : <span />}
          {next ? <a href={href(`/blog/${next.slug}`)}>{next.title} →</a> : <span />}
        </nav>
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-[20px] font-semibold">
              {post.category} — {ui.article.moreInCategory}
            </h2>
            <ul>
              {related.map((p) => (
                <li key={p.id}>
                  <a href={href(`/blog/${p.slug}`)}>{p.title}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    );
  } else if (kind === 'home') {
    main = (
      <div className="w-full max-w-[72ch] mx-auto px-6 py-12">
        <section>
          <h1 className="font-serif text-[32px] font-bold">{settings.authorName}</h1>
          <p className="text-[15px] text-[#666666]">{settings.authorSubtitle || ui.home.authorSubtitle}</p>
          <p className="mt-4 text-[16px]">{settings.authorBio || ui.home.authorBioDefault}</p>
        </section>
        <section className="mt-12">
          <h2 className="font-serif text-[24px] font-semibold mb-6">{ui.home.recentWritings}</h2>
          {postList(posts.slice(0, 10))}
          <p className="mt-8">
            <a href={href('/blog')}>{ui.home.viewAllArchive}</a>
          </p>
        </section>
      </div>
    );
  } else if (kind === 'blog') {
    main = (
      <div className="w-full max-w-[72ch] mx-auto px-6 py-12">
        <h1 className="font-serif text-[32px] font-bold">{ui.blog.title}</h1>
        <p className="text-[15px] text-[#666666] mb-8">{ui.blog.subtitle}</p>
        {postList(posts)}
      </div>
    );
  } else if (kind === 'contact') {
    main = (
      <div className="w-full max-w-[72ch] mx-auto px-6 py-12">
        <h1 className="font-serif text-[32px] font-bold">{ui.contact.title}</h1>
        <p className="mt-4">{ui.contact.subtitle}</p>
        <p className="mt-4">
          {ui.contact.emailTitle}: <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </p>
      </div>
    );
  } else {
    main = (
      <div className="w-full max-w-[72ch] mx-auto px-6 py-24 text-center">
        <h1 className="font-serif text-[24px] font-bold">{props.notFoundTitle}</h1>
        <p className="mt-4">{props.notFoundText}</p>
        <p className="mt-4">
          <a href={href('/blog')}>{ui.article.backToArchive}</a>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <header className="w-full max-w-[72ch] mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
        <a href={href('/')} className="font-serif text-[20px] font-bold">
          {settings.title || 'Jurabek'}
        </a>
        <nav className="flex gap-4 text-[14px]">
          <a href={href('/')}>{ui.nav.home}</a>
          <a href={href('/blog')}>{ui.nav.writing}</a>
          <a href={href('/contact')}>{ui.nav.contact}</a>
        </nav>
        {props.alphabetsEnabled && (
          <nav aria-label="Alifbo" className="flex gap-2 text-[13px]">
            {SCRIPTS.map((s) => (
              <a key={s} href={buildScriptPath(s, props.path)} aria-current={s === script ? 'true' : undefined}>
                {SCRIPT_LABEL[s]}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1">{main}</main>
      <footer className="w-full max-w-[72ch] mx-auto px-6 py-8 text-[13px] text-[#666666]">
        <p>
          © {settings.authorName} · {ui.footer.craftedBy}
        </p>
        <nav className="flex gap-4 mt-2">
          <a href={href('/blog')}>{ui.footer.archive}</a>
          <a href={href('/contact')}>{ui.nav.contact}</a>
        </nav>
      </footer>
    </div>
  );
};
