// pharos-social-graph / scripts/lib/rpc.js
// Tiny JSON-RPC client for Pharos (and any EVM chain). Zero deps.
// Uses native fetch (Node 18+).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadNetworks() {
  const path = join(__dirname, "..", "..", "assets", "networks.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

export function resolveRpcUrl(name = "atlantic-testnet", override) {
  if (override) return override;
  const nets = loadNetworks();
  const net = nets.networks.find((n) => n.name === name);
  if (!net) throw new Error(`unknown network: ${name}`);
  return net.rpcUrl;
}

/**
 * Low-level JSON-RPC call with retry + exponential backoff.
 * @param {string} url
 * @param {string} method
 * @param {Array} params
 * @param {{ retries?: number, timeoutMs?: number }} opts
 */
export async function rpc(url, method, params = [], opts = {}) {
  const { retries = 2, timeoutMs = 15_000 } = opts;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      clearTimeout(t);

      if (!res.ok) {
        // 5xx → retry, 4xx → fail fast
        if (res.status >= 500 && attempt < retries) {
          await sleep(200 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.error) {
        // Method-specific errors: rate limits, log limits, etc.
        throw new Error(json.error.message || "RPC error");
      }
      return json.result;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries) {
        await sleep(200 * Math.pow(2, attempt));
        continue;
      }
    }
  }
  throw new Error(`RPC ${method} failed after ${retries + 1} attempts: ${lastErr?.message}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ----- High-level helpers -----

export async function getBlockNumber(url) {
  const hex = await rpc(url, "eth_blockNumber");
  return parseInt(hex, 16);
}

export async function getCode(url, addr) {
  return rpc(url, "eth_getCode", [addr, "latest"]);
}

export async function isContract(url, addr) {
  const code = await getCode(url, addr);
  return code && code !== "0x" && code !== "0x0";
}

/**
 * Paginated eth_getLogs. Batches by block range to stay under the
 * ~10k-result cap most RPCs enforce.
 */
export async function* getLogsPaged(url, baseFilter, opts = {}) {
  const {
    pageSize = 500,        // blocks per page
    maxResults = 50_000,      // safety cap per filter
    sleepMs = 50,             // throttle between pages
  } = opts;

  const latest = await getBlockNumber(url);
  const toBlock = baseFilter.toBlock === "latest" || baseFilter.toBlock == null
    ? latest
    : parseInt(baseFilter.toBlock, 16) || parseInt(baseFilter.toBlock);
  const fromBlock = parseInt(baseFilter.fromBlock, 16) || parseInt(baseFilter.fromBlock);

  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const pageTo = Math.min(cursor + pageSize - 1, toBlock);
    const filter = {
      ...baseFilter,
      fromBlock: "0x" + cursor.toString(16),
      toBlock: "0x" + pageTo.toString(16),
    };
    let logs;
    try {
      logs = await rpc(url, "eth_getLogs", [filter]);
    } catch (e) {
      // Some RPCs return "query returned more than X results" — split the page
      if (cursor === pageTo) throw e;
      // halve the page size
      const half = Math.floor((cursor + pageTo) / 2);
      const filterA = { ...filter, fromBlock: "0x" + cursor.toString(16), toBlock: "0x" + half.toString(16) };
      const filterB = { ...filter, fromBlock: "0x" + (half + 1).toString(16), toBlock: "0x" + pageTo.toString(16) };
      logs = [
        ...(await rpc(url, "eth_getLogs", [filterA]).catch(() => [])),
        ...(await rpc(url, "eth_getLogs", [filterB]).catch(() => [])),
      ];
    }
    if (logs && logs.length) yield logs;
    if (sleepMs) await sleep(sleepMs);
    cursor = pageTo + 1;
    if (cursor - fromBlock > maxResults) break;
  }
}
