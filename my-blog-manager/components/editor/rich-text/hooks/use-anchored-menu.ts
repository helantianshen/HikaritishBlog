"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";

export interface Point {
  left: number;
  top: number;
}

export interface Size {
  width: number;
  height: number;
}

export function clampMenuPosition(
  point: Point,
  panel: Size,
  viewport: Size,
  gutter = 8,
): Point {
  return {
    left: Math.max(gutter, Math.min(point.left, viewport.width - panel.width - gutter)),
    top: Math.max(gutter, Math.min(point.top, viewport.height - panel.height - gutter)),
  };
}

export function useAnchoredEditorMenu(
  editor: Editor,
  resolvePosition: () => Point | null,
): Point | null {
  const resolverRef = useRef(resolvePosition);
  const [position, setPosition] = useState<Point | null>(null);

  useEffect(() => {
    resolverRef.current = resolvePosition;
  }, [resolvePosition]);

  useEffect(() => {
    const update = () => setPosition(resolverRef.current());
    const close = () => setPosition(null);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [editor]);

  return position;
}
