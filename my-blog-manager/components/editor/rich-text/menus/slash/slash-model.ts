import {
  BLOCK_COMMANDS,
  type BlockCommand,
  type BlockCommandGroup,
  type BlockCommandId,
} from "../../commands/block-commands";

export interface SlashGroup {
  id: BlockCommandGroup;
  label: string;
  commands: BlockCommand[];
}

const GROUPS: readonly {
  id: BlockCommandGroup;
  label: string;
  commandIds: readonly BlockCommandId[];
}[] = [
  {
    id: "basic",
    label: "基础",
    commandIds: [
      "paragraph",
      "heading1",
      "heading2",
      "heading3",
      "codeBlock",
      "quote",
      "horizontalRule",
    ],
  },
  { id: "common", label: "常用", commandIds: ["table", "image"] },
  {
    id: "list",
    label: "列表",
    commandIds: ["bulletList", "orderedList", "taskList"],
  },
  { id: "danger", label: "", commandIds: ["clearFormatting"] },
];

export function filterSlashGroups(query: string): SlashGroup[] {
  const normalized = query.trim().toLowerCase();
  const commandsById = new Map(BLOCK_COMMANDS.map((command) => [command.id, command]));

  return GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    commands: group.commandIds
      .map((id) => commandsById.get(id))
      .filter((command): command is BlockCommand => Boolean(command))
      .filter((command) => {
        if (!normalized) return true;
        const searchable = [
          command.label,
          command.description,
          ...command.searchTerms,
        ].join(" ").toLowerCase();
        return searchable.includes(normalized);
      }),
  })).filter((group) => group.commands.length > 0);
}
