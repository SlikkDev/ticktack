import TaskItem from "@tiptap/extension-task-item";
import type { NodeViewProps } from "@tiptap/react";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
} from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { proseDirection } from "@/components/editor/prose-direction";
import { Checkbox } from "@/components/ui/checkbox";

function TaskItemNodeView({ editor, node, updateAttributes }: NodeViewProps) {
  const { t, i18n } = useTranslation();
  const checked = Boolean(node.attrs.checked);
  const isEditable = useEditorState({
    editor,
    selector: ({ editor }) => editor.isEditable,
  });

  return (
    <NodeViewWrapper
      as="li"
      dir={proseDirection(node.textContent, i18n.dir())}
      data-type="taskItem"
      data-checked={checked ? "true" : "false"}
    >
      <div contentEditable={false} className="kaneo-task-item-checkbox">
        <Checkbox
          checked={checked}
          disabled={!isEditable}
          aria-label={
            checked
              ? t("tasks:detail.editor.checkbox.markIncomplete")
              : t("tasks:detail.editor.checkbox.markComplete")
          }
          onCheckedChange={(value) => {
            if (!editor.isEditable) return;
            updateAttributes({ checked: value === true });
          }}
        />
      </div>
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
}

export const TaskItemWithCheckbox = TaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNodeView);
  },
});
