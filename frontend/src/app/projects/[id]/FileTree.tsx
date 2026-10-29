"use client";

import { useState } from "react";

export type FileEntry = {
  name: string; // relative path, e.g. "ESP/esft0001.p" or just "esft0001.p"
  content: string;
  lines: number;
};

type TreeNode =
  | { type: "dir"; name: string; path: string; children: TreeNode[] }
  | { type: "file"; name: string; fullPath: string; entry: FileEntry };

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: Record<string, any> = {};
  for (const f of files) {
    const parts = f.name.replace(/\\/g, "/").split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = { __dir: true, __children: {} };
      cur = cur[parts[i]].__children;
    }
    cur[parts[parts.length - 1]] = { __entry: f };
  }

  function toNodes(obj: Record<string, any>, prefix = ""): TreeNode[] {
    return Object.entries(obj)
      .map(([key, val]) => {
        if (val.__dir) {
          const p = prefix ? `${prefix}/${key}` : key;
          return { type: "dir" as const, name: key, path: p, children: toNodes(val.__children, p) };
        }
        return { type: "file" as const, name: key, fullPath: val.__entry.name, entry: val.__entry as FileEntry };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }
  return toNodes(root);
}

function countFiles(nodes: TreeNode[]): number {
  return nodes.reduce((n, node) => n + (node.type === "file" ? 1 : countFiles(node.children)), 0);
}

function isFlat(files: FileEntry[]) {
  return files.every((f) => !f.name.includes("/"));
}

export default function FileTree({
  files,
  selectedFile,
  onSelect,
  fileMeta,
}: {
  files: FileEntry[];
  selectedFile: string | null;
  onSelect: (name: string) => void;
  fileMeta: (name: string) => { displayDate?: string; isChanged?: boolean; label?: string } | null;
}) {
  const flat = isFlat(files);

  // All top-level dirs start expanded
  const topDirs = flat ? [] : [...new Set(files.map((f) => f.name.split("/")[0]))];
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(topDirs));

  function toggle(p: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  if (flat) {
    return (
      <ul className="space-y-1">
        {files.map((file) => {
          const meta = fileMeta(file.name);
          return (
            <li key={file.name}>
              <button
                onClick={() => onSelect(file.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedFile === file.name ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                }`}
              >
                <span className="font-mono block">{file.name}</span>
                <span className="text-xs text-gray-400">{file.lines} linhas</span>
                {meta?.displayDate && (
                  <span className={`text-xs block mt-0.5 ${meta.isChanged ? "text-yellow-600" : "text-gray-400"}`}>
                    {meta.label} {new Date(meta.displayDate).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const tree = buildTree(files);

  function renderNodes(nodes: TreeNode[], depth = 0): React.ReactNode {
    return nodes.map((node) => {
      if (node.type === "dir") {
        const open = expanded.has(node.path);
        return (
          <li key={node.path}>
            <button
              onClick={() => toggle(node.path)}
              className="flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <svg
                className={`w-3.5 h-3.5 shrink-0 transition-transform text-gray-400 ${open ? "rotate-90" : ""}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M7 5l6 5-6 5V5z" />
              </svg>
              <svg className="w-4 h-4 shrink-0 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span>{node.name}</span>
              <span className="text-xs text-gray-400 font-normal">({countFiles(node.children)})</span>
            </button>
            {open && (
              <ul className="pl-4 border-l border-gray-100 ml-3 mt-0.5 space-y-0.5">
                {renderNodes(node.children, depth + 1)}
              </ul>
            )}
          </li>
        );
      }

      // file node
      const meta = fileMeta(node.fullPath);
      return (
        <li key={node.fullPath}>
          <button
            onClick={() => onSelect(node.fullPath)}
            className={`w-full text-left pl-2 pr-2 py-1.5 rounded-lg text-sm transition ${
              selectedFile === node.fullPath ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            }`}
          >
            <span className="font-mono block">{node.name}</span>
            <span className="text-xs text-gray-400">{node.entry.lines} linhas</span>
            {meta?.displayDate && (
              <span className={`text-xs block mt-0.5 ${meta.isChanged ? "text-yellow-600" : "text-gray-400"}`}>
                {meta.label} {new Date(meta.displayDate).toLocaleDateString("pt-BR")}
              </span>
            )}
          </button>
        </li>
      );
    });
  }

  return <ul className="space-y-0.5">{renderNodes(tree)}</ul>;
}
