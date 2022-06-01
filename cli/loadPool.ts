import { PublicKey, Connection } from "@solana/web3.js";
import { url } from "../url";
import { SIMULATION_USER, StableSwapNPool } from "../src/";

const POOL_ACCOUNT = new PublicKey(
  "2msq2uyvceBzoQXkJnjVqWAvjdPpXBGT4NzaZMJE6bqW"
);

async function initializePool() {
  const connection = new Connection(url, "confirmed");

  console.log(`poolAccount: ${POOL_ACCOUNT.toBase58()}`);

  const stableSwapNPool = await StableSwapNPool.load(
    connection,
    POOL_ACCOUNT,
    SIMULATION_USER
  );
  console.log(`precisionFactor: ${stableSwapNPool.precisionFactor}`);
  console.log(`precisionMultiplier: ${stableSwapNPool.precisionMultiplier}`);
}

console.log(`Running ${initializePool.name}`);

initializePool();
