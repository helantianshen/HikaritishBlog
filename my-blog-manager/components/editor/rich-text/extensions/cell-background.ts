import { Extension } from "@tiptap/core";

export const CellBackground = Extension.create({
  name: "cellBackground",
  addGlobalAttributes() {
    return [{
      types: ["tableCell", "tableHeader"],
      attributes: {
        backgroundColor: {
          default: null,
          parseHTML: (element: HTMLElement) => (
            element.style.backgroundColor
            || element.getAttribute("data-bg-color")
            || null
          ),
          renderHTML: (attributes: Record<string, string | null>) => (
            attributes.backgroundColor
              ? {
                  "data-bg-color": attributes.backgroundColor,
                  style: `background-color: ${attributes.backgroundColor}`,
                }
              : {}
          ),
        },
      },
    }];
  },
});
