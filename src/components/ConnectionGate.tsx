"use client";

import QRScreen from "./QRScreen";
import Dashboard from "./Dashboard";
import { useConnection } from "@/hooks/use-connection";

export default function ConnectionGate() {
  const { data, isLoading, error } = useConnection();

  const status = data?.status ?? "unknown";
  const qrPng = data?.qrPng ?? null;
  const phone = data?.phone ?? null;

  if (status === "connected") {
    return <Dashboard phone={phone} />;
  }

  return <QRScreen status={status} qrPng={qrPng} />;
}
