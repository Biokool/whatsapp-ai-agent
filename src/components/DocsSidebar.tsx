"use client";

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

function getIcon(name: string, isDir: boolean): string {
  if (isDir) return "folder";
  if (name.startsWith("01-")) return "download";
  if (name.startsWith("02-")) return "chat";
  if (name.startsWith("03-")) return "edit";
  if (name.startsWith("04-")) return "build";
  if (name.startsWith("05-")) return "security";
  if (name.startsWith("06-")) return "cloud_upload";
  if (name.startsWith("07-")) return "bug_report";
  if (name.startsWith("08-")) return "devices";
  if (name.includes("architecture")) return "account_tree";
  if (name.includes("roadmap")) return "map";
  if (name.includes("changelog")) return "history";
  if (name.includes("security")) return "shield";
  if (name.includes("testing")) return "verified";
  if (name.includes("admin")) return "admin_panel_settings";
  return "description";
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
        <div className="flex items-center gap-2 px-3 py-1.5 text-navy-300 text-xs font-semibold uppercase tracking-wider">
          <span className="material-symbols-outlined text-[16px]">folder</span>
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

  return (
    <button
      onClick={() => onSelect(file.relativePath)}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
        isSelected
          ? "bg-ai-green/10 text-ai-green-light border border-ai-green/30"
          : "text-navy-300 hover:bg-navy-700 hover:text-navy-200 border border-transparent"
      }`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      <span className="material-symbols-outlined text-[18px] shrink-0">
        {getIcon(file.name, false)}
      </span>
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
        className="md:hidden fixed top-4 left-4 z-50 bg-navy-700 text-navy-200 p-2 rounded-lg border border-navy-500"
      >
        <span className="material-symbols-outlined text-[20px]">{isOpen ? "close" : "menu"}</span>
      </button>

      {isOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={onToggle} />}

      <aside
        className={`fixed md:static top-0 left-0 h-full w-72 bg-navy-900 border-r border-navy-500 flex flex-col z-40 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-navy-500">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-ai-green-light text-[24px]">
              menu_book
            </span>
            <h2 className="font-geist text-lg font-bold text-navy-200">Documentacion</h2>
          </div>
          <p className="text-xs text-navy-400 mt-1">{files.length} archivos</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <button
            onClick={() => onSelect("")}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all mb-2 ${
              !selectedPath
                ? "bg-ai-green/10 text-ai-green-light border border-ai-green/30"
                : "text-navy-300 hover:bg-navy-700 hover:text-navy-200 border border-transparent"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
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
