import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Biokool - Lead Monitor",
  description: "Panel de control del agente de IA conectado a WhatsApp",
};

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('biokool-theme');var c='scheme-light-dark';if(s==='light'||s==='dark'){c='scheme-'+s;}var d=document.documentElement;d.classList.add(c);}catch(e){document.documentElement.classList.add('scheme-light-dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={archivo.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
