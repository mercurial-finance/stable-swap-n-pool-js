import { PublicKey, Connection } from "@solana/web3.js";
import { url } from "../url";
import { SIMULATION_USER, StableSwapNPool } from "../src/";

const poolAddress = process.argv.slice(2)[0];
if (!poolAddress) {
  throw Error("Please provide a pool address");
}

const poolAccount = new PublicKey(poolAddress);

async function initializePool() {
  const connection = new Connection(url, "confirmed");

  console.log(`poolAccount: ${poolAccount.toBase58()}`);

  const stableSwapNPool = await StableSwapNPool.load(
    connection,
    poolAccount,
    SIMULATION_USER
  );
  console.log(`LP Token Mint: ${stableSwapNPool.poolTokenMint.toBase58()}`);
}

console.log(`Running ${initializePool.name}`);

initializePool();
