"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@heroui/react";
import { Bold, Italic, Strikethrough, ListUl, ListOl } from "@gravity-ui/icons";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || "Write something...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[150px] p-4 text-foreground bg-default-50 rounded-b-xl border-x border-b border-divider",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col w-full rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent transition-shadow">
      <div className="flex items-center gap-1 p-2 bg-default-100 border border-divider rounded-t-xl border-b-0">
        <Button
          isIconOnly
          size="sm"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          onPress={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          onPress={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant={editor.isActive("strike") ? "secondary" : "ghost"}
          onPress={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <div className="w-px h-4 bg-divider mx-1" />
        <Button
          isIconOnly
          size="sm"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          onPress={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListUl className="w-4 h-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          onPress={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOl className="w-4 h-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
