// To connect to a public cluster, set `export LIVE=1` in your
// environment. By default, `LIVE=1` will connect to the devnet cluster.

import { clusterApiUrl } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const url = process.env.RPC_URL || clusterApiUrl("mainnet-beta", false);
