import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "messages.db");

// ============================================================
// Tipos
// ============================================================

export type ConversationMode = "AI" | "HUMAN";
export type MessageRole = "user" | "assistant" | "human";
export type ConnectionStatus = "disconnected" | "qr" | "connecting" | "connected";

export interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  jid: string | null;
  mode: ConversationMode;
  last_message_at: number | null;
  created_at: number;
}

export interface ConversationListItem extends Conversation {
  last_message_preview: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  created_at: number;
}

export interface ConnectionState {
  id: number;
  status: ConnectionStatus;
  qr_string: string | null;
  phone: string | null;
  updated_at: number;
}

export interface OutboxItem {
  id: number;
  conversation_id: number;
  phone: string;
  content: string;
  sent: number;
  created_at: number;
}

// ============================================================
// Inicialización PEREZOSA (lazy) de la base de datos.
//
// La conexión, el esquema y los statements NO se crean al importar este módulo,
// sino la primera vez que se usa de verdad (primera llamada a una función).
//
// Esto es CLAVE: `next build` importa las rutas API (que importan este módulo)
// en ~10 workers en paralelo. Si abriéramos y escribiéramos la DB al importar,
// esos workers chocarían inicializando el WAL del mismo archivo a la vez y el
// build fallaría con "database is locked" (SQLITE_BUSY) — un fallo no determinista
// que el `busy_timeout` no cubre del todo. Con init perezoso, importar el módulo
// NO toca la DB: solo la tocan el bot y el servidor cuando atienden de verdad.
// (ver errores-sesion.md #15)
// ============================================================

function build() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // PRAGMA WAL: permite que bot y dashboard lean/escriban el mismo archivo a la vez.
  db.pragma("journal_mode = WAL");
  // busy_timeout: red de seguridad en runtime. Si bot y dashboard coinciden
  // escribiendo, esperar hasta 5s a que se libere el lock en vez de fallar al
  // instante con SQLITE_BUSY. (El problema del build se resuelve con el init perezoso.)
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      jid TEXT,
      mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
      last_message_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv
      ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS connection_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      status TEXT CHECK(status IN ('disconnected','qr','connecting','connected'))
        NOT NULL DEFAULT 'disconnected',
      qr_string TEXT,
      phone TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    INSERT OR IGNORE INTO connection_state (id, status) VALUES (1, 'disconnected');

    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      content TEXT NOT NULL,
      sent INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_pending
      ON outbox(sent, created_at);
  `);

  // Migración: columna `jid` en conversations. Guarda la dirección completa del contacto
  // (p.ej. <numero>@s.whatsapp.net o <lid>@lid) para poder responderle por el dominio correcto.
  // En DBs creadas con versiones anteriores la tabla ya existe sin esta columna; la añadimos si falta.
  const cols = db.prepare("PRAGMA table_info(conversations)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "jid")) {
    db.exec("ALTER TABLE conversations ADD COLUMN jid TEXT");
  }

  // --- Conversations ---
  const stmtGetConvByPhone = db.prepare<[string], Conversation>(
    "SELECT * FROM conversations WHERE phone = ?"
  );
  const stmtInsertConv = db.prepare(
    "INSERT INTO conversations (phone, name, jid) VALUES (?, ?, ?)"
  );
  const stmtUpdateConvName = db.prepare(
    "UPDATE conversations SET name = ? WHERE id = ? AND (name IS NULL OR name = '')"
  );
  const stmtUpdateConvJid = db.prepare(
    "UPDATE conversations SET jid = ? WHERE id = ?"
  );
  const stmtGetConvById = db.prepare<[number], Conversation>(
    "SELECT * FROM conversations WHERE id = ?"
  );
  const stmtListConvs = db.prepare<[], ConversationListItem>(`
    SELECT
      c.*,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_preview
    FROM conversations c
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
  `);
  const stmtSetMode = db.prepare("UPDATE conversations SET mode = ? WHERE id = ?");

  // --- Messages ---
  const stmtInsertMessage = db.prepare(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
  );
  const stmtUpdateLastMessageAt = db.prepare(
    "UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?"
  );
  const stmtGetMessages = db.prepare<[number, number], Message>(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  const insertMessageTx = db.transaction(
    (conversationId: number, role: MessageRole, content: string): number => {
      const info = stmtInsertMessage.run(conversationId, role, content);
      stmtUpdateLastMessageAt.run(conversationId);
      return info.lastInsertRowid as number;
    }
  );

  // --- Connection state ---
  const stmtGetConnState = db.prepare<[], ConnectionState>(
    "SELECT * FROM connection_state WHERE id = 1"
  );
  const stmtUpdateConnAll = db.prepare(`
    UPDATE connection_state
    SET status = ?, qr_string = ?, phone = ?, updated_at = unixepoch()
    WHERE id = 1
  `);

  // --- Outbox ---
  const stmtEnqueueOutbox = db.prepare(
    "INSERT INTO outbox (conversation_id, phone, content) VALUES (?, ?, ?)"
  );
  const stmtGetPendingOutbox = db.prepare<[number], OutboxItem>(
    "SELECT * FROM outbox WHERE sent = 0 ORDER BY created_at ASC LIMIT ?"
  );
  const stmtMarkOutboxSent = db.prepare("UPDATE outbox SET sent = 1 WHERE id = ?");

  // --- Borrado de conversaciones (atómico) ---
  const stmtDeleteMessages = db.prepare(
    "DELETE FROM messages WHERE conversation_id = ?"
  );
  const stmtDeletePendingOutbox = db.prepare(
    "DELETE FROM outbox WHERE conversation_id = ? AND sent = 0"
  );
  const stmtDeleteConv = db.prepare("DELETE FROM conversations WHERE id = ?");
  const deleteConversationTx = db.transaction((conversationId: number): void => {
    stmtDeleteMessages.run(conversationId);
    stmtDeletePendingOutbox.run(conversationId);
    stmtDeleteConv.run(conversationId);
  });

  return {
    db,
    stmtGetConvByPhone,
    stmtInsertConv,
    stmtUpdateConvName,
    stmtUpdateConvJid,
    stmtGetConvById,
    stmtListConvs,
    stmtSetMode,
    stmtGetMessages,
    insertMessageTx,
    stmtGetConnState,
    stmtUpdateConnAll,
    stmtEnqueueOutbox,
    stmtGetPendingOutbox,
    stmtMarkOutboxSent,
    deleteConversationTx,
  };
}

let _ctx: ReturnType<typeof build> | null = null;

/** Devuelve el contexto de la DB, inicializándolo de forma perezosa la primera vez. */
function ctx(): ReturnType<typeof build> {
  if (!_ctx) {
    _ctx = build();
  }
  return _ctx;
}

// ============================================================
// Conversations
// ============================================================

export function getOrCreateConversation(
  phone: string,
  name?: string,
  jid?: string
): Conversation {
  const c = ctx();
  const existing = c.stmtGetConvByPhone.get(phone);
  if (existing) {
    if (name && (!existing.name || existing.name === "")) {
      c.stmtUpdateConvName.run(name, existing.id);
      existing.name = name;
    }
    // Mantener el jid al día (backfill de filas antiguas y cambios de dirección).
    if (jid && existing.jid !== jid) {
      c.stmtUpdateConvJid.run(jid, existing.id);
      existing.jid = jid;
    }
    return existing;
  }
  const info = c.stmtInsertConv.run(phone, name ?? null, jid ?? null);
  return {
    id: info.lastInsertRowid as number,
    phone,
    name: name ?? null,
    jid: jid ?? null,
    mode: "AI",
    last_message_at: null,
    created_at: Math.floor(Date.now() / 1000),
  };
}

export function getConversationById(id: number): Conversation | null {
  return ctx().stmtGetConvById.get(id) ?? null;
}

export function listConversations(): ConversationListItem[] {
  return ctx().stmtListConvs.all();
}

export function setMode(conversationId: number, mode: ConversationMode): void {
  ctx().stmtSetMode.run(mode, conversationId);
}

// ============================================================
// Messages
// ============================================================

export function insertMessage(
  conversationId: number,
  role: MessageRole,
  content: string
): number {
  return ctx().insertMessageTx(conversationId, role, content);
}

export function getMessages(conversationId: number, limit = 50): Message[] {
  return ctx().stmtGetMessages.all(conversationId, limit).reverse();
}

export function getRecentHistory(conversationId: number, limit = 20): Message[] {
  // Consulta DESC + reverse en JS, mucho más eficiente que ORDER BY ASC sobre toda la tabla
  return ctx().stmtGetMessages.all(conversationId, limit).reverse();
}

// ============================================================
// Connection state
// ============================================================

export function getConnectionState(): ConnectionState {
  return ctx().stmtGetConnState.get() as ConnectionState;
}

interface SetConnectionInput {
  status?: ConnectionStatus;
  qr_string?: string | null;
  phone?: string | null;
}

/**
 * Actualiza el estado de conexión.
 * IMPORTANTE: Preserva los campos no provistos.
 * Solo pasar null EXPLÍCITO borra un campo.
 * Si pasas {status: 'connecting'}, qr_string y phone NO se tocan.
 */
export function setConnectionState(input: SetConnectionInput): void {
  const current = getConnectionState();
  const next = {
    status: input.status ?? current.status,
    qr_string: "qr_string" in input ? input.qr_string : current.qr_string,
    phone: "phone" in input ? input.phone : current.phone,
  };
  ctx().stmtUpdateConnAll.run(next.status, next.qr_string, next.phone);
}

// ============================================================
// Outbox (mensajes humanos que el bot debe enviar)
// ============================================================

export function enqueueOutbox(
  conversationId: number,
  phone: string,
  content: string
): number {
  const info = ctx().stmtEnqueueOutbox.run(conversationId, phone, content);
  return info.lastInsertRowid as number;
}

export function getPendingOutbox(limit = 20): OutboxItem[] {
  return ctx().stmtGetPendingOutbox.all(limit);
}

export function markOutboxSent(id: number): void {
  ctx().stmtMarkOutboxSent.run(id);
}

// ============================================================
// Borrado de conversaciones (atómico)
// ============================================================

export function deleteConversation(conversationId: number): void {
  ctx().deleteConversationTx(conversationId);
}

// ============================================================
// Health Check & Diagnostics
// ============================================================

export interface DatabaseHealth {
  status: "healthy" | "degraded" | "unhealthy";
  path: string;
  sizeBytes: number;
  walMode: boolean;
  foreignKeys: boolean;
  conversations: number;
  messages: number;
  outboxPending: number;
  uptime: number;
}

/**
 * Check database health and return diagnostics
 */
export function checkDatabaseHealth(): DatabaseHealth {
  const c = ctx();

  // Get database file size
  let sizeBytes = 0;
  try {
    const stats = fs.statSync(DB_PATH);
    sizeBytes = stats.size;
  } catch {
    // File might not exist yet
  }

  // Check PRAGMA settings
  const journalMode = c.db.pragma("journal_mode", { simple: true }) as string;
  const foreignKeys = c.db.pragma("foreign_keys", { simple: true }) as number;

  // Get counts
  const convCount = c.db.prepare("SELECT COUNT(*) as count FROM conversations").get() as { count: number };
  const msgCount = c.db.prepare("SELECT COUNT(*) as count FROM messages").get() as { count: number };
  const outboxCount = c.db.prepare("SELECT COUNT(*) as count FROM outbox WHERE sent = 0").get() as { count: number };

  // Determine health status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (journalMode !== "wal") {
    status = "degraded"; // Not using WAL mode
  }

  if (outboxCount.count > 100) {
    status = "degraded"; // Outbox backlog
  }

  return {
    status,
    path: DB_PATH,
    sizeBytes,
    walMode: journalMode === "wal",
    foreignKeys: foreignKeys === 1,
    conversations: convCount.count,
    messages: msgCount.count,
    outboxPending: outboxCount.count,
    uptime: process.uptime(),
  };
}

/**
 * Create a backup of the database
 * Returns the backup file path
 */
export function backupDatabase(): { success: boolean; backupPath?: string; error?: string } {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(DATA_DIR, `messages-backup-${timestamp}.db`);

    // Use SQLite's backup API
    ctx().db.backup(backupPath);

    return { success: true, backupPath };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): Record<string, unknown> {
  const c = ctx();

  const pageCount = c.db.pragma("page_count", { simple: true }) as number;
  const pageSize = c.db.pragma("page_size", { simple: true }) as number;
  const freelistCount = c.db.pragma("freelist_count", { simple: true }) as number;

  return {
    pageCount,
    pageSize,
    freelistCount,
    sizeBytes: pageCount * pageSize,
    freelistBytes: freelistCount * pageSize,
    fragmentationPercent: pageCount > 0 ? ((freelistCount / pageCount) * 100).toFixed(2) : "0",
  };
}
