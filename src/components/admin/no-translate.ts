import { Extension } from '@tiptap/core'

/**
 * Keeps lang="en", translate="no" and class="notranslate" (typed in the HTML view) when the post is
 * edited visually: they mark English passages that the alphabet versions leave untransliterated.
 */
export const NoTranslate = Extension.create({
  name: 'noTranslate',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'listItem', 'bulletList', 'orderedList', 'tableCell', 'tableHeader', 'bold', 'italic', 'underline', 'strike'],
        attributes: {
          lang: {
            default: null,
            keepOnSplit: false,
            parseHTML: (el) => el.getAttribute('lang'),
            renderHTML: (attrs) => (attrs.lang ? { lang: attrs.lang } : {}),
          },
          translate: {
            default: null,
            keepOnSplit: false,
            parseHTML: (el) => el.getAttribute('translate'),
            renderHTML: (attrs) => (attrs.translate ? { translate: attrs.translate } : {}),
          },
          notranslate: {
            default: false,
            keepOnSplit: false,
            parseHTML: (el) => el.classList.contains('notranslate'),
            renderHTML: (attrs) => (attrs.notranslate ? { class: 'notranslate' } : {}),
          },
        },
      },
    ]
  },
})
