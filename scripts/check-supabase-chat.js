const URL = "https://mvbynpfvxcpvuoazkaxc.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function get(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

(async () => {
  console.log("=== CONVERSATIONS ===");
  try { console.log(JSON.stringify(await get("conversations?select=*"), null, 2)); }
  catch (e) { console.log("ERR:", e.message); }

  console.log("\n=== MESSAGES (last 15) ===");
  try { console.log(JSON.stringify(await get("messages?select=*&order=created_at.desc&limit=15"), null, 2)); }
  catch (e) { console.log("ERR:", e.message); }

  console.log("\n=== OUTBOX (last 10) ===");
  try { console.log(JSON.stringify(await get("outbox?select=*&order=created_at.desc&limit=10"), null, 2)); }
  catch (e) { console.log("ERR:", e.message); }
})();
