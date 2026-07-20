"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { clampImageWidth } from "./node-view-utils";

interface ResizeState {
  startX: number;
  startWidth: number;
  maxWidth: number;
}

export default function ImageNodeView({
  editor,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const imageRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;
      setLiveWidth(clampImageWidth(
        resize.startWidth + event.clientX - resize.startX,
        resize.maxWidth,
      ));
    };

    const handlePointerUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      setLiveWidth((width) => {
        if (width !== null && width !== node.attrs.width) {
          updateAttributes({ width });
        }
        return null;
      });
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [node.attrs.width, updateAttributes]);

  const handleResizeStart = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const editorWidth = editor.view.dom.clientWidth || 800;
    const currentWidth = imageRef.current?.getBoundingClientRect().width
      || Number(node.attrs.width)
      || Math.min(500, editorWidth);
    resizeRef.current = {
      startX: event.clientX,
      startWidth: currentWidth,
      maxWidth: editorWidth,
    };
    setLiveWidth(currentWidth);
  };

  const storedWidth = typeof node.attrs.width === "number"
    ? `${node.attrs.width}px`
    : String(node.attrs.width || "100%");
  const width = liveWidth === null ? storedWidth : `${liveWidth}px`;
  const alignment = String(node.attrs.alignment || "center");
  const margin = alignment === "left"
    ? "2rem auto 2rem 0"
    : alignment === "right"
      ? "2rem 0 2rem auto"
      : "2rem auto";

  return (
    <NodeViewWrapper as="div" className="image-block-wrapper block max-w-full">
      <div
        ref={imageRef}
        className={`group/image relative block max-w-full ${
          selected ? "outline outline-2 outline-offset-4 outline-indigo-500" : ""
        }`}
        style={{ width, margin }}
        contentEditable={false}
      >
        {/* A Tiptap NodeView must render the authored image URL directly. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={String(node.attrs.src || "")}
          alt={String(node.attrs.alt || "")}
          className="m-0 block h-auto w-full max-w-full rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
          draggable={false}
        />
        <button
          type="button"
          aria-label="调整图片宽度"
          title="拖动调整图片宽度"
          onPointerDown={handleResizeStart}
          className="absolute right-1 top-1/2 h-12 w-2 -translate-y-1/2 cursor-ew-resize rounded-full bg-indigo-500/80 opacity-0 shadow-lg transition-opacity duration-150 group-hover/image:opacity-100 focus:opacity-100"
        />
      </div>
    </NodeViewWrapper>
  );
}
