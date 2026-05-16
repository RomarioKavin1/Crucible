import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ethers } from "ethers";

export interface StorageConfig {
  indexerUrl: string;
  rpcUrl: string;
  privateKey: string;
}

function defaultConfig(
  network: "galileo" | "mainnet",
  privateKeyOverride?: string,
  requirePrivateKey = true
): StorageConfig {
  const indexerUrl =
    network === "galileo"
      ? process.env["OG_GALILEO_INDEXER"] ?? "https://indexer-storage-testnet-turbo.0g.ai"
      // 0G mainnet's storage indexer. The "-turbo" variant doesn't seem to
      // exist as a separate endpoint on mainnet — using the canonical one.
      : process.env["OG_MAINNET_INDEXER"] ?? "https://indexer-storage.0g.ai";
  const rpcUrl =
    network === "galileo"
      ? process.env["OG_GALILEO_RPC"] ?? "https://evmrpc-testnet.0g.ai"
      : process.env["OG_MAINNET_RPC"] ?? "https://evmrpc.0g.ai";
  const privateKey = privateKeyOverride ?? process.env["DEPLOYER_PRIVATE_KEY"] ?? "";
  if (requirePrivateKey && !privateKey) {
    throw new Error("Missing private key for storage uploads (pass explicitly or set DEPLOYER_PRIVATE_KEY)");
  }
  return { indexerUrl, rpcUrl, privateKey };
}

/** Upload an in-memory byte buffer to 0G Storage. Returns the Merkle root hash and the on-chain tx hash. */
export async function uploadBytes(
  data: Uint8Array,
  network: "galileo" | "mainnet" = "galileo",
  privateKey?: string
): Promise<{ rootHash: string; txHash: string }> {
  const cfg = defaultConfig(network, privateKey);
  const indexer = new Indexer(cfg.indexerUrl);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const signer = new ethers.Wallet(cfg.privateKey, provider);

  const memData = new MemData(data);
  const [tree, treeErr] = await memData.merkleTree();
  if (treeErr !== null) throw new Error(`merkleTree: ${treeErr}`);
  const rootHash = tree!.rootHash();

  const [tx, uploadErr] = await indexer.upload(memData, cfg.rpcUrl, signer);
  if (uploadErr !== null) throw new Error(`upload: ${uploadErr}`);

  // tx may be { rootHash, txHash } (single) or { rootHashes, txHashes } (fragmented).
  // Trace.jsonl files are well under 4GB so we expect the single-upload shape.
  const single = tx as { rootHash?: string; txHash?: string };
  return {
    rootHash: single.rootHash ?? rootHash!,
    txHash: single.txHash ?? "",
  };
}

/** Download by root hash. Public read — no signer required. Uses Node fs internally (not browser-safe). */
export async function downloadBytes(
  rootHash: string,
  network: "galileo" | "mainnet" = "galileo"
): Promise<Uint8Array> {
  const cfg = defaultConfig(network, undefined, /* requirePrivateKey */ false);
  const tmp = await mkdtemp(path.join(tmpdir(), "og-download-"));
  const fp = path.join(tmp, "blob.bin");
  try {
    const indexer = new Indexer(cfg.indexerUrl);
    const err = await indexer.download(rootHash, fp, true /* withProof */);
    if (err !== null) throw new Error(`download: ${err}`);
    return new Uint8Array(await readFile(fp));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
