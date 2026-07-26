"use client";

import { useState, useEffect } from "react";
import DocsSidebar from "@/components/DocsSidebar";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface DocFile {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  children?: DocFile[];
}

interface DocContent {
  content: string;
  lastModified: string;
  size: number;
}

const WELCOME_CONTENT = `# Documentacion del Kit

Bienvenido al centro de documentacion del **WhatsApp AI Agent Kit**.

## Guias de Inicio Rapido

- **[01-instalar](?doc=01-instalar.md)** - Instalacion en macOS y Windows
- **[02-conectar-whatsapp](?doc=02-conectar-whatsapp.md)** - Conexion via QR
- **[03-personalizar-prompt](?doc=03-personalizar-prompt.md)** - Personalizacion del agente
- **[04-configurar-tools](?doc=04-configurar-tools.md)** - Configuracion de herramientas
- **[05-cloudflare-access](?doc=05-cloudflare-access.md)** - Proteccion del dashboard
- **[06-deploy-hostinger](?doc=06-deploy-hostinger.md)** - Despliegue en produccion
- **[07-errores-comunes](?doc=07-errores-comunes.md)** - Solucion de problemas
- **[08-whatsapp-coexistence](?doc=08-whatsapp-coexistence.md)** - Coexistencia WhatsApp

## Arquitectura y Sistema

- **architecture** - Arquitectura del sistema
- **architecture-system** - Arquitectura tecnica detallada
- **servers-config** - Configuracion de servidores Docker

## Planeacion y Admin

- **admin/AI-BOS-IMPLEMENTATION-MASTER-MAP)** - Mapa maestro de implementacion
- **admin/AI-BOS-IMPLEMENTATION-PROMPTS)** - Prompts operacionales por fase

## Referencia

- **roadmap** - Hoja de ruta del proyecto
- **changelog** - Historial de cambios
- **security** - Modelo de seguridad
- **testing** - Estrategia de pruebas
`;

export default function DocsPage() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => setFiles(data.files));
  }, []);

  useEffect(() => {
    if (!selectedDoc) {
      setDocContent(null);
      return;
    }

    setLoading(true);
    fetch(`/api/docs/read?path=${encodeURIComponent(selectedDoc)}`)
      .then((res) => res.json())
      .then((data) => {
        setDocContent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDoc]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const doc = params.get("doc");
    if (doc) setSelectedDoc(doc);
  }, []);

  const flatFiles = files.flatMap(function flatten(f: DocFile): DocFile[] {
    if (f.isDirectory) return f.children?.flatMap(flatten) ?? [];
    return [f];
  });

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <DocsSidebar
        files={files}
        selectedPath={selectedDoc}
        onSelect={setSelectedDoc}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-navy-800 border-b border-navy-500 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-navy-300 hover:text-ai-green-light transition-colors"
              title="Volver al Dashboard"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </a>
            <h1 className="font-geist text-lg font-bold text-navy-200">
              {selectedDoc
                ? selectedDoc.split("/").pop()?.replace(/\.md$/, "").replace(/-/g, " ")
                : "Documentacion"}
            </h1>
          </div>
          {selectedDoc && (
            <div className="flex items-center gap-2 text-xs text-navy-400">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              {docContent?.lastModified &&
                new Date(docContent.lastModified).toLocaleDateString("es-ES")}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-ai-green-light animate-pulse">
                <span className="material-symbols-outlined text-[24px]">hourglass_empty</span>
                <span className="text-sm">Cargando documento...</span>
              </div>
            </div>
          ) : selectedDoc && docContent ? (
            <article className="max-w-4xl mx-auto px-6 md:px-10 py-8">
              <MarkdownRenderer content={docContent.content} />
            </article>
          ) : (
            <div className="max-w-4xl mx-auto px-6 md:px-10 py-8">
              <MarkdownRenderer content={WELCOME_CONTENT} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
