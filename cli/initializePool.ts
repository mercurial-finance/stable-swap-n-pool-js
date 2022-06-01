import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import {
  StableSwapNPool,
  STABLE_SWAP_N_POOL_PROGRAM_ID,
  SIMULATION_USER,
} from "../src";
import { url } from "../url";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TestSender } from "../tests/helpers";
import bs58 from "bs58";

const POOL_ACCOUNT = Keypair.generate();
const AMPLIFICATION_COEFFICIENT = 50;
const FEE_NUMERATOR = 4000000;
const ADMIN_FEE_NUMERATOR = 0;

async function initializePool() {
  const connection = new Connection(url, "confirmed");
  const payer = Keypair.fromSecretKey(bs58.decode(""));

  console.log(`poolAccount: ${POOL_ACCOUNT.publicKey.toBase58()}`);
  const [authority, nonce] = await PublicKey.findProgramAddress(
    [POOL_ACCOUNT.publicKey.toBuffer()],
    STABLE_SWAP_N_POOL_PROGRAM_ID
  );

  // Token with 6 decimals
  const tokenA = new Token(
    connection,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    TOKEN_PROGRAM_ID,
    payer
  );

  // Token with 6 decimals
  const tokenB = new Token(
    connection,
    new PublicKey("A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM"),
    TOKEN_PROGRAM_ID,
    payer
  );

  // Token with 6 decimals
  const tokenC = new Token(
    connection,
    new PublicKey("Dn4noZ5jgGfkntzcQSUZ8czkreiZ1ForXYoV2H8Dm7S1"),
    TOKEN_PROGRAM_ID,
    payer
  );

  // Token with 6 decimals
  const tokenD = new Token(
    connection,
    new PublicKey("EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o"),
    TOKEN_PROGRAM_ID,
    payer
  );

  const tokens = [tokenA, tokenB, tokenC, tokenD];
  const tokenMints = await Promise.all(
    tokens.map((token) => token.getMintInfo())
  );
  const precisionFactor = tokenMints.reduce(
    (acc, tokenInfo) => (tokenInfo.decimals > acc ? tokenInfo.decimals : acc),
    0
  );

  const tokenAccountA = await tokenA.createAccount(authority);
  console.log(`tokenAAccount: ${tokenAccountA.toBase58()}`);

  const tokenAccountB = await tokenB.createAccount(authority);
  console.log(`tokenBAccount: ${tokenAccountB.toBase58()}`);

  const tokenAccountC = await tokenC.createAccount(authority);
  console.log(`tokenCAccount: ${tokenAccountC.toBase58()}`);

  const tokenAccountD = await tokenD.createAccount(authority);
  console.log(`tokenDAccount: ${tokenAccountD.toBase58()}`);

  const tokenAccounts = [
    tokenAccountA,
    tokenAccountB,
    tokenAccountC,
    tokenAccountD,
  ];
  // The LP token has to match the precision factor.
  const poolLpToken = await Token.createMint(
    connection,
    payer,
    authority,
    null,
    precisionFactor,
    TOKEN_PROGRAM_ID
  );

  console.log(`lpMintAccount: ${poolLpToken.publicKey.toBase58()}`);

  await StableSwapNPool.create(
    connection,
    new TestSender(payer),
    POOL_ACCOUNT,
    authority,
    tokenAccounts,
    poolLpToken.publicKey,
    new PublicKey("MAdGGDepF35hFLYrqXxPtbJ6rcaw7jPCdHeBpVHZP9U"),
    nonce,
    AMPLIFICATION_COEFFICIENT,
    FEE_NUMERATOR,
    ADMIN_FEE_NUMERATOR,
    true,
    payer,
    SIMULATION_USER
  );
}

console.log(`Running ${initializePool.name}`);

initializePool();
