import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { InlineNameInput } from "./inline-name-input";

afterEach(cleanup);

it("shows the localized name without persisting it when focus leaves an unchanged field", () => {
  const rename = vi.fn();
  render(
    <InlineNameInput
      name="To Do"
      displayName="לביצוע"
      label="שם העמודה"
      onRename={rename}
    />,
  );
  const input = screen.getByRole("textbox");
  expect(input).toHaveValue("לביצוע");
  fireEvent.focus(input);
  expect(input).toHaveValue("לביצוע");
  fireEvent.blur(input);
  expect(input).toHaveValue("לביצוע");
  expect(rename).not.toHaveBeenCalled();
});

it("persists only the name the user actually edits", async () => {
  const rename = vi.fn().mockResolvedValue(true);
  render(
    <InlineNameInput
      name="Done"
      displayName="הושלם"
      label="שם העמודה"
      onRename={rename}
    />,
  );
  const input = screen.getByRole("textbox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "Approved by Adam" } });
  fireEvent.blur(input);
  await waitFor(() => expect(rename).toHaveBeenCalledWith("Approved by Adam"));
});

it("keeps a read-only localized name visible on focus", () => {
  render(
    <InlineNameInput
      name="Done"
      displayName="הושלם"
      label="שם העמודה"
      readOnly
      onRename={vi.fn()}
    />,
  );
  const input = screen.getByRole("textbox");
  fireEvent.focus(input);
  expect(input).toHaveValue("הושלם");
});
