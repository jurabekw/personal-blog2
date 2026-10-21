'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorContent, Node, mergeAttributes, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import Youtube from '@tiptap/extension-youtube'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardCopy,
  Code,
  Code2,
  FileCode,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  SquarePlay as YoutubeIcon,
} from 'lucide-react'
import type { MediaItem } from '@/lib/admin-types'
import { MediaPicker, type StorageMode } from './MediaLibrary'

/** The theme's copy box ([jb_copy_box]) as an editable block. */
const CopyBox = Node.create({
  name: 'copyBox',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      title: {
        default: 'Maslahat',
        parseHTML: (el) => el.getAttribute('data-title') || 'Maslahat',
        renderHTML: (attrs) => ({ 'data-title': attrs.title }),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'aside.jb-copy-box' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes({ class: 'jb-copy-box' }, HTMLAttributes), 0]
  },
})

const ImageWithAlt = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
    }
  },
})

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={active ? 'is-active' : undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function RichEditor({
  value,
  onChange,
  storage,
  onReady,
  placeholder = 'Start writing…',
  minimal = false,
}: {
  value: string
  onChange: (html: string) => void
  storage: StorageMode
  onReady?: (editor: Editor) => void
  placeholder?: string
  minimal?: boolean
}) {
  const [source, setSource] = useState(false)
  const [html, setHtml] = useState(value)
  const [picker, setPicker] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkNewTab, setLinkNewTab] = useState(false)
  const changeRef = useRef(onChange)
  changeRef.current = onChange

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: null, target: null } },
      }),
      ImageWithAlt.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      CopyBox,
      CharacterCount,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: { attributes: { class: 'wpa-prose', spellcheck: 'true' } },
    onUpdate: ({ editor }) => changeRef.current(editor.getHTML()),
  })

  useEffect(() => {
    if (editor && onReady) onReady(editor)
  }, [editor, onReady])

  const e = editor
  const state = e
    ? {
        block: e.isActive('heading', { level: 2 })
          ? 'h2'
          : e.isActive('heading', { level: 3 })
            ? 'h3'
            : e.isActive('heading', { level: 4 })
              ? 'h4'
              : 'p',
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        link: e.isActive('link'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        quote: e.isActive('blockquote'),
        codeBlock: e.isActive('codeBlock'),
        table: e.isActive('table'),
        image: e.isActive('image'),
        copyBox: e.isActive('copyBox'),
        left: e.isActive({ textAlign: 'left' }),
        center: e.isActive({ textAlign: 'center' }),
        right: e.isActive({ textAlign: 'right' }),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        words: (e.storage as unknown as { characterCount?: { words?: () => number } }).characterCount?.words?.() ?? 0,
      }
    : null

  if (!editor || !state) {
    return <div className="wpa-editor" style={{ minHeight: 540 }} />
  }

  const chain = () => editor.chain().focus()

  const openLink = () => {
    const attrs = editor.getAttributes('link')
    setLinkUrl(attrs.href || '')
    setLinkNewTab(attrs.target === '_blank')
    setLinkOpen(true)
  }
  const applyLink = () => {
    const url = linkUrl.trim()
    if (!url) chain().extendMarkRange('link').unsetLink().run()
    else
      chain()
        .extendMarkRange('link')
        .setLink({ href: url, target: linkNewTab ? '_blank' : null, rel: linkNewTab ? 'noopener noreferrer' : null })
        .run()
    setLinkOpen(false)
  }

  const insertImage = (item: MediaItem) => {
    chain()
      .setImage({ src: item.url, alt: item.alt || '', title: item.title || undefined })
      .updateAttributes('image', { width: item.width, height: item.height })
      .run()
    setPicker(false)
  }

  const toggleSource = () => {
    if (source) {
      editor.commands.setContent(html, { emitUpdate: true })
      setSource(false)
    } else {
      setHtml(editor.getHTML())
      setSource(true)
    }
  }

  return (
    <div className="wpa-editor">
      <div className="wpa-toolbar" role="toolbar" aria-label="Formatting">
        {!source ? (
          <>
            <select
              aria-label="Block type"
              value={state.block}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'p') chain().setParagraph().run()
                else chain().toggleHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run()
              }}
            >
              <option value="p">Paragraph</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
            </select>
            <span className="wpa-toolbar__sep" />
            <Btn title="Bold (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
              <Bold size={16} />
            </Btn>
            <Btn title="Italic (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
              <Italic size={16} />
            </Btn>
            <Btn title="Underline (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
              <UnderlineIcon size={16} />
            </Btn>
            <Btn title="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}>
              <Strikethrough size={16} />
            </Btn>
            <Btn title="Inline code" active={state.code} onClick={() => chain().toggleCode().run()}>
              <Code size={16} />
            </Btn>
            <span className="wpa-toolbar__sep" />
            <Btn title="Insert/edit link (Ctrl+K)" active={state.link} onClick={openLink}>
              <Link2 size={16} />
            </Btn>
            {state.link ? (
              <Btn title="Remove link" onClick={() => chain().extendMarkRange('link').unsetLink().run()}>
                <Link2Off size={16} />
              </Btn>
            ) : null}
            <span className="wpa-toolbar__sep" />
            <Btn title="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
              <List size={16} />
            </Btn>
            <Btn title="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
              <ListOrdered size={16} />
            </Btn>
            <Btn title="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
              <Quote size={16} />
            </Btn>
            <Btn title="Code block" active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
              <Code2 size={16} />
            </Btn>
            {!minimal ? (
              <>
                <span className="wpa-toolbar__sep" />
                <Btn title="Align left" active={state.left} onClick={() => chain().setTextAlign('left').run()}>
                  <AlignLeft size={16} />
                </Btn>
                <Btn title="Align center" active={state.center} onClick={() => chain().setTextAlign('center').run()}>
                  <AlignCenter size={16} />
                </Btn>
                <Btn title="Align right" active={state.right} onClick={() => chain().setTextAlign('right').run()}>
                  <AlignRight size={16} />
                </Btn>
                <span className="wpa-toolbar__sep" />
                <Btn title="Add image" onClick={() => setPicker(true)}>
                  <ImagePlus size={16} />
                </Btn>
                {state.image ? (
                  <button
                    type="button"
                    title="Edit image alt text"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const alt = prompt('Alternative text (describe the image):', editor.getAttributes('image').alt || '')
                      if (alt !== null) chain().updateAttributes('image', { alt }).run()
                    }}
                  >
                    Alt
                  </button>
                ) : null}
                <Btn
                  title="Embed YouTube video"
                  onClick={() => {
                    const url = prompt('YouTube video URL:')
                    if (url) chain().setYoutubeVideo({ src: url }).run()
                  }}
                >
                  <YoutubeIcon size={16} />
                </Btn>
                <Btn
                  title="Insert table"
                  active={state.table}
                  onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >
                  <TableIcon size={16} />
                </Btn>
                <Btn
                  title="Copy box (tip / AI prompt readers can copy)"
                  active={state.copyBox}
                  onClick={() => {
                    if (state.copyBox) {
                      const t = prompt('Copy box title:', editor.getAttributes('copyBox').title || 'Maslahat')
                      if (t !== null) chain().updateAttributes('copyBox', { title: t || 'Maslahat' }).run()
                      return
                    }
                    const t = prompt('Copy box title (e.g. "Maslahat" or "AI prompt"):', 'Maslahat')
                    if (t === null) return
                    chain()
                      .insertContent({
                        type: 'copyBox',
                        attrs: { title: t || 'Maslahat' },
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nusxalanadigan matn…' }] }],
                      })
                      .run()
                  }}
                >
                  <ClipboardCopy size={16} />
                </Btn>
                <Btn title="Horizontal line" onClick={() => chain().setHorizontalRule().run()}>
                  <Minus size={16} />
                </Btn>
              </>
            ) : null}
            <span className="wpa-toolbar__sep" />
            <Btn title="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
              <Undo2 size={16} />
            </Btn>
            <Btn title="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
              <Redo2 size={16} />
            </Btn>
          </>
        ) : (
          <span className="wpa-muted" style={{ padding: '0 6px' }}>
            HTML source — switch back to Visual to keep editing with the toolbar.
          </span>
        )}
        <span style={{ flex: 1 }} />
        <Btn title={source ? 'Visual editor' : 'Edit HTML source'} active={source} onClick={toggleSource}>
          <FileCode size={16} />
          <span style={{ marginLeft: 4 }}>{source ? 'Visual' : 'HTML'}</span>
        </Btn>
      </div>

      {state.table && !source ? (
        <div className="wpa-toolbar" style={{ top: 82, background: '#f6f7f7' }}>
          <span className="wpa-muted" style={{ padding: '0 6px' }}>
            Table:
          </span>
          <button type="button" onClick={() => chain().addRowAfter().run()}>+ Row</button>
          <button type="button" onClick={() => chain().addColumnAfter().run()}>+ Column</button>
          <button type="button" onClick={() => chain().deleteRow().run()}>− Row</button>
          <button type="button" onClick={() => chain().deleteColumn().run()}>− Column</button>
          <button type="button" onClick={() => chain().toggleHeaderRow().run()}>Header row</button>
          <button type="button" onClick={() => chain().mergeOrSplit().run()}>Merge/split</button>
          <button type="button" onClick={() => chain().deleteTable().run()} style={{ color: 'var(--a-red)' }}>
            Delete table
          </button>
        </div>
      ) : null}

      {linkOpen ? (
        <div className="wpa-toolbar" style={{ top: 82, background: '#fff' }}>
          <input
            className="wpa-input wpa-input--sm"
            style={{ flex: 1, minWidth: 220 }}
            autoFocus
            placeholder="Paste URL or type /internal-path/"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              }
              if (e.key === 'Escape') setLinkOpen(false)
            }}
          />
          <label className="wpa-check" style={{ margin: '0 8px' }}>
            <input type="checkbox" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} /> Open in new tab
          </label>
          <button type="button" className="wpa-btn wpa-btn--primary wpa-btn--sm" onClick={applyLink}>
            Apply
          </button>
          <button type="button" className="wpa-btn wpa-btn--sm" onClick={() => setLinkOpen(false)}>
            Cancel
          </button>
        </div>
      ) : null}

      {source ? (
        <textarea
          className="wpa-editor__source"
          value={html}
          spellCheck={false}
          onChange={(e) => {
            setHtml(e.target.value)
            onChange(e.target.value)
          }}
        />
      ) : (
        <EditorContent
          editor={editor}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault()
              openLink()
            }
          }}
        />
      )}

      <div className="wpa-editor__foot">
        <span>Word count: {state.words}</span>
        <span>Tip: use Heading 2 / Heading 3 — they build the “Mundarija” table of contents.</span>
      </div>

      {picker ? (
        <MediaPicker storage={storage} title="Add image" button="Insert into post" onPick={insertImage} onClose={() => setPicker(false)} />
      ) : null}
    </div>
  )
}
