import { markInputRule } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";

export const CustomBold = Bold.extend({
  addInputRules() {
    return [markInputRule({ find: /(?:\*\*|__)([^*_]+)(?:\*\*|__)\s$/, type: this.type })];
  },
});

export const CustomItalic = Italic.extend({
  addInputRules() {
    return [markInputRule({ find: /(?<=^|[^*_])(?:\*|_)([^*_]+)(?:\*|_)\s$/, type: this.type })];
  },
});

export const CustomStrike = Strike.extend({
  addInputRules() {
    return [markInputRule({ find: /(?:~~)([^~]+)(?:~~)\s$/, type: this.type })];
  },
});

export const CustomUnderline = Underline.extend({
  addInputRules() {
    return [markInputRule({ find: /(?:~)([^~]+)(?:~)\s$/, type: this.type })];
  },
});

export const CustomCode = Code.extend({
  excludes: "",
  addInputRules() {
    return [markInputRule({ find: /(?<=^|[^`])(?:`)([^`]+)(?:`)\s$/, type: this.type })];
  },
});
