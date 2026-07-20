import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../ToastProvider";
import RichTextEditor, { type RichTextEditorHandle } from "../../RichTextEditor";

describe("RichTextEditor integration", () => {
  it("keeps the existing shell and wires the enhanced editor state", async () => {
    const ref = createRef<RichTextEditorHandle>();
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          ref={ref}
          title="保留的标题"
          setTitle={vi.fn()}
          initialContent="<p>hello</p>"
          onOpenImageTool={vi.fn()}
        />
      </ToastProvider>,
    );

    expect(screen.getByPlaceholderText("文章大标题...")).toHaveValue("保留的标题");
    expect(screen.getByTitle("正文")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector(".ProseMirror")).toBeInTheDocument());
    expect(screen.getByLabelText("正文字符统计")).toHaveTextContent("5 字");
    expect(ref.current?.getContent()).toContain("<p>hello</p>");
  });

  it("round-trips legacy block images without losing percentage width or styling", async () => {
    const ref = createRef<RichTextEditorHandle>();
    const legacyImage = '<img src="/legacy.png" style="width: 25%; height: auto; display: block; margin: 2rem auto; border-radius: 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.15);">';
    render(
      <ToastProvider>
        <RichTextEditor
          ref={ref}
          title=""
          setTitle={vi.fn()}
          initialContent={legacyImage}
          onOpenImageTool={vi.fn()}
        />
      </ToastProvider>,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    const html = ref.current?.getContent() || "";
    expect(html).toContain('src="/legacy.png"');
    expect(html).toContain("width: 25%");
    expect(html).toContain("display: block");
    expect(html).not.toContain("<p><img");
  });
});
