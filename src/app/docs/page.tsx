"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
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

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <DocsSidebar
        files={files}
        selectedPath={selectedDoc}
        onSelect={setSelectedDoc}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-text-subtle hover:text-ai-green transition-colors"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="w-[20px] h-[20px]" />
            </Link>
            <h1 className="font-display text-lg font-bold text-primary">
              {selectedDoc
                ? selectedDoc.split("/").pop()?.replace(/\.md$/, "").replace(/-/g, " ")
                : "Documentacion"}
            </h1>
          </div>
          {selectedDoc && (
            <div className="flex items-center gap-2 text-xs text-text-faint">
              <Clock className="w-[16px] h-[16px]" />
              {docContent?.lastModified &&
                new Date(docContent.lastModified).toLocaleDateString("es-ES")}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-ai-green animate-pulse">
                <Loader2 className="w-[24px] h-[24px] animate-spin" />
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
