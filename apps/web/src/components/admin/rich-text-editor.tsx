"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { cn } from "@/lib/utils";

const tool =
  "border-input bg-surface hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium focus-visible:outline-2 aria-pressed:bg-ink aria-pressed:text-surface";

/**
 * A small rich-text editor for descriptions: bold, italic, headings, lists, links. It only produces the tags
 * the shop already allows (the shop cleans the HTML again before showing it). Loaded on demand, only on the
 * screens that edit descriptions.
 */
export function RichTextEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  label: string;
}) {
  const [linkText, setLinkText] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
        class:
          "min-h-40 px-3 py-2 focus:outline-none [&_a]:text-brand [&_a]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc space-y-2",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  if (!editor) return <p className="text-muted-foreground">Loading editor</p>;

  const toggle = (name: string, run: () => void, attrs?: Record<string, unknown>) => ({
    type: "button" as const,
    className: cn(tool),
    "aria-pressed": editor.isActive(name, attrs),
    onClick: run,
  });

  const applyLink = () => {
    const href = linkText.trim();
    if (!/^https?:\/\/\S+$|^mailto:\S+$|^tel:\S+$/i.test(href)) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkText("");
    setLinkOpen(false);
  };

  return (
    <div className="border-input bg-surface rounded-md border">
      <div
        className="border-input flex flex-wrap gap-1 border-b p-2"
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        <button
          {...toggle("bold", () => editor.chain().focus().toggleBold().run())}
          aria-label="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          {...toggle("italic", () => editor.chain().focus().toggleItalic().run())}
          aria-label="Italic"
        >
          <em>I</em>
        </button>
        <button
          {...toggle("heading", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), {
            level: 2,
          })}
          aria-label="Heading"
        >
          H2
        </button>
        <button
          {...toggle("heading", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), {
            level: 3,
          })}
          aria-label="Subheading"
        >
          H3
        </button>
        <button
          {...toggle("bulletList", () => editor.chain().focus().toggleBulletList().run())}
          aria-label="Bulleted list"
        >
          • List
        </button>
        <button
          {...toggle("orderedList", () => editor.chain().focus().toggleOrderedList().run())}
          aria-label="Numbered list"
        >
          1. List
        </button>
        <button
          {...toggle("link", () =>
            editor.isActive("link") ? editor.chain().focus().unsetLink().run() : setLinkOpen(true),
          )}
          aria-label={editor.isActive("link") ? "Remove link" : "Add link"}
        >
          Link
        </button>
        <button
          type="button"
          className={tool}
          aria-label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          Undo
        </button>
      </div>
      {linkOpen && (
        <div className="border-input flex gap-2 border-b p-2">
          <label htmlFor="rte-link" className="sr-only">
            Link address
          </label>
          <input
            id="rte-link"
            value={linkText}
            onChange={(event) => setLinkText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://..."
            className="border-input min-h-11 flex-1 rounded-md border px-3"
          />
          <button type="button" className={tool} onClick={applyLink}>
            Apply
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
