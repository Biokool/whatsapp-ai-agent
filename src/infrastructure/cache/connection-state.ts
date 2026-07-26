import { getRedis } from "./redis";
import type { ConnectionStatus } from "@/core/types/database";

const CONNECTION_KEY = "whatsapp:connection";

export interface ConnectionState {
  status: ConnectionStatus;
  qr_string: string | null;
  phone: string | null;
}

const DEFAULT_STATE: ConnectionState = {
  status: "disconnected",
  qr_string: null,
  phone: null,
};

export async function getConnectionState(): Promise<ConnectionState> {
  const redis = getRedis();
  const data = await redis.get(CONNECTION_KEY);
  if (!data) return DEFAULT_STATE;
  try {
    return JSON.parse(data) as ConnectionState;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function setConnectionState(input: Partial<ConnectionState>): Promise<void> {
  const current = await getConnectionState();
  const next: ConnectionState = {
    status: input.status ?? current.status,
    qr_string: "qr_string" in input ? (input.qr_string ?? null) : current.qr_string,
    phone: "phone" in input ? (input.phone ?? null) : current.phone,
  };
  const redis = getRedis();
  await redis.set(CONNECTION_KEY, JSON.stringify(next));
}

export async function resetConnectionState(): Promise<void> {
  const redis = getRedis();
  await redis.set(CONNECTION_KEY, JSON.stringify(DEFAULT_STATE));
}
