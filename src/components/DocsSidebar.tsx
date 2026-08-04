"use client";

import {
  Folder,
  Download,
  MessagesSquare,
  Pencil,
  Wrench,
  ShieldCheck,
  CloudUpload,
  Bug,
  Smartphone,
  GitBranch,
  Map,
  History,
  Shield,
  BadgeCheck,
  FileText,
  X,
  Menu,
  BookOpen,
  Home,
  type LucideIcon,
} from "lucide-react";

interface DocFile {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  children?: DocFile[];
}

interface DocsSidebarProps {
  files: DocFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function getIcon(name: string, isDir: boolean): LucideIcon {
  if (isDir) return Folder;
  if (name.startsWith("01-")) return Download;
  if (name.startsWith("02-")) return MessagesSquare;
  if (name.startsWith("03-")) return Pencil;
  if (name.startsWith("04-")) return Wrench;
  if (name.startsWith("05-")) return ShieldCheck;
  if (name.startsWith("06-")) return CloudUpload;
  if (name.startsWith("07-")) return Bug;
  if (name.startsWith("08-")) return Smartphone;
  if (name.includes("architecture")) return GitBranch;
  if (name.includes("roadmap")) return Map;
  if (name.includes("changelog")) return History;
  if (name.includes("security")) return Shield;
  if (name.includes("testing")) return BadgeCheck;
  if (name.includes("admin")) return ShieldCheck;
  return FileText;
}

function TreeItem({
  file,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  file: DocFile;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const isSelected = file.relativePath === selectedPath;

  if (file.isDirectory) {
    return (
      <div>
        <div className="flex items-center gap-2 px-3 py-1.5 text-text-subtle text-xs font-semibold uppercase tracking-wider">
          <Folder className="w-4 h-4 shrink-0" />
          <span className="truncate">{file.name}</span>
        </div>
        <div className="ml-2">
          {file.children?.map((child) => (
            <TreeItem
              key={child.relativePath}
              file={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  const icon = getIcon(file.name, false);

  return (
    <button
      onClick={() => onSelect(file.relativePath)}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
        isSelected
          ? "bg-ai-green-low text-ai-green border border-ai-green/30"
          : "text-text-subtle hover:bg-surface-hover hover:text-primary border border-transparent"
      }`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      {icon({ className: "w-[18px] h-[18px] shrink-0" })}
      <span className="truncate">{file.name}</span>
    </button>
  );
}

export default function DocsSidebar({
  files,
  selectedPath,
  onSelect,
  isOpen,
  onToggle,
}: DocsSidebarProps) {
  return (
    <>
      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-50 bg-surface-hover text-primary p-2 rounded-lg border border-border"
      >
        {isOpen ? <X className="w-[20px] h-[20px]" /> : <Menu className="w-[20px] h-[20px]" />}
      </button>

      {isOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={onToggle} />}

      <aside
        className={`fixed md:static top-0 left-0 h-full w-72 bg-surface border-r border-border flex flex-col z-40 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-ai-green" />
            <h2 className="font-display text-lg font-bold text-primary">Documentacion</h2>
          </div>
          <p className="text-xs text-text-faint mt-1">{files.length} archivos</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <button
            onClick={() => onSelect("")}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all mb-2 ${
              !selectedPath
                ? "bg-ai-green-low text-ai-green border border-ai-green/30"
                : "text-text-subtle hover:bg-surface-hover hover:text-primary border border-transparent"
            }`}
          >
            <Home className="w-[18px] h-[18px] shrink-0" />
            <span>Inicio</span>
          </button>

          {files.map((file) => (
            <TreeItem
              key={file.relativePath}
              file={file}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
