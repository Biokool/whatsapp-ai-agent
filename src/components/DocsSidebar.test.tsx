import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import DocsSidebar from "./DocsSidebar";

const FILES = [
  {
    name: "docs",
    relativePath: "docs",
    isDirectory: true,
    children: [
      { name: "01-introduccion.md", relativePath: "docs/01-introduccion.md", isDirectory: false },
      { name: "02-instalacion.md", relativePath: "docs/02-instalacion.md", isDirectory: false },
    ],
  },
  { name: "README.md", relativePath: "README.md", isDirectory: false },
];

describe("DocsSidebar", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    onSelect.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders directories and file items without crashing", () => {
    render(
      <DocsSidebar
        files={FILES}
        selectedPath={null}
        onSelect={onSelect}
        isOpen
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText("docs")).toBeInTheDocument();
    expect(screen.getByText("01-introduccion.md")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
  });

  it("highlights the selected file and fires onSelect on click", () => {
    render(
      <DocsSidebar
        files={FILES}
        selectedPath="docs/02-instalacion.md"
        onSelect={onSelect}
        isOpen
        onToggle={vi.fn()}
      />
    );
    const button = screen.getByRole("button", { name: /02-instalacion\.md/ });
    expect(button.className).toContain("bg-ai-green-low");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("docs/02-instalacion.md");
  });
});
