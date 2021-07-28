import { Token } from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'
import { TransactionSignerAndSender } from '../src'
import { sleep } from '../src/helpers/sleep'

export async function createTokenAccountAndMintSome(
  token: Token,
  authority: Signer,
  owner: PublicKey,
  amount: number
): Promise<PublicKey> {
  const associatedTokenAccount = (await token.getOrCreateAssociatedAccountInfo(owner)).address
  await token.mintTo(associatedTokenAccount, authority, [], amount)
  return associatedTokenAccount
}

export class TestSender implements TransactionSignerAndSender {
  constructor(private userKeypair: Keypair) {}

  get userPublicKey() {
    return this.userKeypair.publicKey
  }

  send(connection: Connection, instructions: TransactionInstruction[], signers: Signer[]) {
    const transaction = new Transaction({ feePayer: this.userPublicKey })
    transaction.instructions = [...instructions]
    return sendAndConfirmTransaction(connection, transaction, [this.userKeypair, ...signers])
  }
}

export async function newAccountWithLamports(connection: Connection, lamports: number = 1000000): Promise<Keypair> {
  const keypair = new Keypair()

  let retries = 30
  await connection.requestAirdrop(keypair.publicKey, lamports)
  for (;;) {
    await sleep(500)
    if (lamports == (await connection.getBalance(keypair.publicKey))) {
      return keypair
    }
    if (--retries <= 0) {
      break
    }
  }
  throw new Error(`Airdrop of ${lamports} failed`)
}
