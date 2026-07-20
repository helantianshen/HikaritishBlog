"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { createLowlight, common } from "lowlight";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { countCodeLines, filterCodeLanguages } from "./node-view-utils";

const availableLanguages = [
  "text",
  ...createLowlight(common).listLanguages(),
].sort();

export default function CodeBlockNodeView({ node, updateAttributes }: NodeViewProps) {
  const nodeLanguage = String(node.attrs.language || "cpp");
  const [languageDraft, setLanguageDraft] = useState(nodeLanguage);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setLanguageOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const languages = useMemo(
    () => filterCodeLanguages(availableLanguages, languageOpen ? languageDraft : nodeLanguage),
    [languageDraft, languageOpen, nodeLanguage],
  );
  const lines = countCodeLines(node.textContent);

  const updateLanguage = (value: string) => {
    setLanguageDraft(value);
    updateAttributes({ language: value });
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <NodeViewWrapper
      ref={rootRef}
      className="code-block-node relative my-6 overflow-visible rounded-[1.5rem] bg-[#282c34] text-[#abb2bf] shadow-inner"
    >
      <div
        className="flex h-11 items-center gap-2 rounded-t-[1.5rem] border-b border-white/10 bg-black/15 px-5"
        contentEditable={false}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="relative ml-auto">
          <input
            value={languageOpen ? languageDraft : nodeLanguage}
            onFocus={() => {
              setLanguageDraft(nodeLanguage);
              setLanguageOpen(true);
            }}
            onChange={(event) => {
              updateLanguage(event.target.value);
              setLanguageOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setLanguageOpen(false);
            }}
            aria-label="代码语言"
            spellCheck={false}
            className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-right text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-indigo-400/60"
          />
          {languageOpen && (
            <div className="absolute right-0 top-full z-[90] mt-1 max-h-52 w-36 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-2xl">
              {languages.length ? languages.map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    updateLanguage(item);
                    setLanguageOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-300 hover:bg-indigo-500 hover:text-white"
                >
                  {item}
                </button>
              )) : (
                <p className="px-3 py-2 text-[10px] text-slate-500">无匹配语言</p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={copyCode}
          aria-label="复制代码"
          title={copied ? "已复制" : "复制代码"}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] overflow-hidden rounded-b-[1.5rem]">
        <div
          className="select-none border-r border-white/10 bg-black/10 py-5 text-right font-mono text-xs leading-6 text-slate-600"
          contentEditable={false}
        >
          {Array.from({ length: lines }, (_, index) => (
            <span key={index} className="block pr-3">{index + 1}</span>
          ))}
        </div>
        <pre className="m-0 overflow-x-auto rounded-none bg-transparent p-5 shadow-none">
          <NodeViewContent as={"code" as "div"} className="block min-w-full font-mono text-sm leading-6" />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
