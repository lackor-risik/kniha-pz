'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useRef, useState } from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Napíšte text...' }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                HTMLAttributes: {
                    class: 'rich-text-image',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'rich-text-link',
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'rich-text-content',
            },
        },
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const addImageFromUrl = useCallback(() => {
        const url = window.prompt('URL obrázka:');
        if (url && editor) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !editor) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/uploads', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Chyba pri nahrávaní obrázka');
                return;
            }

            editor.chain().focus().setImage({ src: data.url }).run();
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Chyba pri nahrávaní obrázka');
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [editor]);

    const addLink = useCallback(() => {
        const url = window.prompt('URL odkazu:');
        if (url && editor) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    }, [editor]);

    const removeLink = useCallback(() => {
        if (editor) {
            editor.chain().focus().unsetLink().run();
        }
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="rich-text-editor">
            <div className="rich-text-toolbar">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
                    title="Tučné"
                >
                    <strong>B</strong>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
                    title="Kurzíva"
                >
                    <em>I</em>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
                    title="Prečiarknuté"
                >
                    <s>S</s>
                </button>

                <span className="toolbar-divider" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
                    title="Nadpis"
                >
                    H
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                    title="Odrážkový zoznam"
                >
                    •
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                    title="Číslovaný zoznam"
                >
                    1.
                </button>

                <span className="toolbar-divider" />

                <button
                    type="button"
                    onClick={addLink}
                    className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
                    title="Pridať odkaz"
                >
                    🔗
                </button>
                {editor.isActive('link') && (
                    <button
                        type="button"
                        onClick={removeLink}
                        className="toolbar-btn"
                        title="Odstrániť odkaz"
                    >
                        ✕
                    </button>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="toolbar-btn"
                    title="Nahrať obrázok"
                    disabled={uploading}
                >
                    {uploading ? '⏳' : '📤'}
                </button>
                <button
                    type="button"
                    onClick={addImageFromUrl}
                    className="toolbar-btn"
                    title="Vložiť obrázok z URL"
                >
                    🖼️
                </button>

                <span className="toolbar-divider" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
                    title="Citácia"
                >
                    &ldquo;
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="toolbar-btn"
                    title="Horizontálna čiara"
                >
                    —
                </button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
