/**
 * Editor WYSIWYG tipo Word (TipTap) reutilizable. Salida HTML (encaja con
 * `DocumentDraft.bodyHtml`). Barra de herramientas con formato básico. El lienzo
 * se estiliza como una hoja de papel para que se vea como el documento final.
 */
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Heading2, Heading3,
  Undo, Redo, Pilcrow,
} from 'lucide-react';

const btn = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
  border: '1px solid ' + (active ? 'var(--color-primary, #2563eb)' : '#e2e8f0'),
  background: active ? 'color-mix(in srgb, var(--color-primary, #2563eb) 12%, white)' : '#fff',
  color: active ? 'var(--color-primary, #2563eb)' : '#475569',
});
const sep: React.CSSProperties = { width: 1, height: 22, background: '#e2e8f0', margin: '0 0.25rem' };

export default function RichTextEditor({
  value,
  onChange,
  editable = true,
}: {
  value: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        style: 'outline:none; min-height: 60vh;',
      },
    },
  });

  // Sincroniza el contenido externo (p. ej. tras "Corregir con IA") sin romper el cursor.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return <div style={{ color: '#94a3b8', padding: '1rem' }}>Cargando editor…</div>;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {editable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', padding: '0.6rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
          <button type="button" title="Negrita" style={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
          <button type="button" title="Cursiva" style={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
          <button type="button" title="Subrayado" style={btn(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></button>
          <span style={sep} />
          <button type="button" title="Párrafo" style={btn(editor.isActive('paragraph'))} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={16} /></button>
          <button type="button" title="Título" style={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></button>
          <button type="button" title="Subtítulo" style={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></button>
          <span style={sep} />
          <button type="button" title="Lista" style={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></button>
          <button type="button" title="Lista numerada" style={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
          <span style={sep} />
          <button type="button" title="Izquierda" style={btn(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></button>
          <button type="button" title="Centrar" style={btn(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></button>
          <button type="button" title="Derecha" style={btn(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></button>
          <button type="button" title="Justificar" style={btn(editor.isActive({ textAlign: 'justify' }))} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={16} /></button>
          <span style={sep} />
          <button type="button" title="Deshacer" style={btn(false)} onClick={() => editor.chain().focus().undo().run()}><Undo size={16} /></button>
          <button type="button" title="Rehacer" style={btn(false)} onClick={() => editor.chain().focus().redo().run()}><Redo size={16} /></button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 820, background: '#fff', boxShadow: '0 1px 4px rgba(15,23,42,0.08)', borderRadius: 4, padding: '3rem 3.5rem', minHeight: '60vh' }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
