import { SwapState } from './state'
import { SwapInstruction, STABLE_SWAP_N_POOL_PROGRAM_ID } from './instructions'
import { loadAccount } from './helpers/loadAccount'
import { Connection, TransactionSignature, TransactionInstruction, Transaction, Signer } from '@solana/web3.js'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { AccountLayout, ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { sleep } from './helpers/sleep'

export { STABLE_SWAP_N_POOL_PROGRAM_ID } from './instructions'

export const SIMULATION_USER = new PublicKey('2YbB88p9EBTJijsxAkmaUjenTXJnmrJvp6MRyT5LiBiM')

export const FEE_DENOMINATOR = Math.pow(10, 10)

// Allows usage by any mechanism that will sign as the fee payer, and monitor the transaction
export interface TransactionSignerAndSender {
  userPublicKey: PublicKey
  send: (
    connection: Connection,
    instructions: TransactionInstruction[],
    signers: Signer[]
  ) => Promise<TransactionSignature>
}

interface SimulationTokenAccounts {
  tokenAccounts: PublicKey[]
  tokenAccountLP: PublicKey
}

/**
 * Our main swap
 */
export class StableSwapNPool {
  /**
   * Create a StableSwapNPool object attached to the specific Vault pool
   *
   * @param connection The connection to use
   * @param poolAccount The pool account
   * @param poolTokenMint The pool token mint
   * @param authority The authority over the vault and accounts
   * @param tokenAccounts: The vault pool token accounts
   * @param tokenMints: The vault pool token mints
   */
  constructor(
    public connection: Connection,
    public poolAccount: PublicKey,
    public poolTokenMint: PublicKey,
    public authority: PublicKey,
    public amplificationCoefficient: number,
    public feeNumerator: number,
    public adminFeeNumerator: number,
    public precisionFactor: number,
    public precisionMultiplier: number[],
    public addLiquidityEnabled: boolean,
    public tokenAccounts: PublicKey[],
    public tokenMints: PublicKey[],
    private simulationUser: PublicKey,
    private simulationTokenAccounts: SimulationTokenAccounts
  ) {}

  /**
   * Get the minimum balance for the token swap account to be rent exempt
   *
   * @return Number of lamports required
   */
  static async getMinBalanceRentForExemptSwapState(connection: Connection): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(SwapState.span)
  }

  /**
   * Create a new StableSwapNPool
   *
   * @param connection The connection to use
   * @param poolAccount The pool account
   * @param authority The authority over the pool and accounts
   * @param tokenAccounts: The pool token accounts
   * @param poolTokenMint The pool token mint
   * @param nonce The nonce used to generate the authority
   * @return The new StableSwapNPool
   */
  static async create(
    connection: Connection,
    sender: TransactionSignerAndSender,
    poolAccount: Keypair,
    authority: PublicKey,
    tokenAccounts: PublicKey[],
    poolTokenMint: PublicKey,
    adminTokenMint: PublicKey,
    nonce: number,
    amplificationCoefficient: number,
    feeNumerator: number,
    adminFeeNumerator: number,
    addLiquidityEnabled: boolean,
    simulationPayer: Signer,
    simulationUser: PublicKey
  ): Promise<StableSwapNPool> {
    const tokenMints = await Promise.all(
      tokenAccounts.map((tokenAccount) => StableSwapNPool.getTokenAccountMint(connection, tokenAccount))
    )

    await StableSwapNPool.setupSimulationUser(connection, simulationUser, tokenMints, poolTokenMint, simulationPayer)

    const minBalanceForRentExemption = await StableSwapNPool.getMinBalanceRentForExemptSwapState(connection)
    const instructions = [
      SystemProgram.createAccount({
        fromPubkey: sender.userPublicKey,
        newAccountPubkey: poolAccount.publicKey,
        lamports: minBalanceForRentExemption,
        space: SwapState.span,
        programId: STABLE_SWAP_N_POOL_PROGRAM_ID
      }),
      SwapInstruction.initialize(
        poolAccount.publicKey,
        authority,
        tokenAccounts,
        tokenMints,
        poolTokenMint,
        adminTokenMint,
        nonce,
        amplificationCoefficient,
        feeNumerator,
        adminFeeNumerator,
        {
          swapEnabled: true,
          addLiquidityEnabled: addLiquidityEnabled
        }
      )
    ]

    await sender.send(connection, instructions, [poolAccount])
    await sleep(2000)

    return StableSwapNPool.load(connection, poolAccount.publicKey, simulationUser)
  }

  static async load(connection: Connection, address: PublicKey, simulationUser: PublicKey): Promise<StableSwapNPool> {
    const data = await loadAccount(connection, address, STABLE_SWAP_N_POOL_PROGRAM_ID)
    const swapState = SwapState.decode(data)
    if (!swapState.isInitialized) {
      throw new Error(`Invalid vault state`)
    }

    // Hand manipulation of the underlying vec
    swapState.tokenAccounts = swapState.tokenAccounts.slice(0, swapState.tokenAccountsLength)

    const tokenMints = await Promise.all(
      swapState.tokenAccounts.map((tokenAccount) => StableSwapNPool.getTokenAccountMint(connection, tokenAccount))
    )

    const simulationTokenAccounts = await StableSwapNPool.setupSimulationUser(
      connection,
      simulationUser,
      tokenMints,
      swapState.poolMint
    )

    const [authority] = await PublicKey.findProgramAddress([address.toBuffer()], STABLE_SWAP_N_POOL_PROGRAM_ID)

    return new StableSwapNPool(
      connection,
      address,
      swapState.poolMint,
      authority,
      swapState.amplificationCoefficient,
      swapState.feeNumerator,
      swapState.adminFeeNumerator,
      swapState.precisionFactor,
      swapState.precisionMultipliers,
      swapState.adminSettings.addLiquidityEnabled,
      swapState.tokenAccounts,
      tokenMints,
      simulationUser,
      simulationTokenAccounts
    )
  }

  async addLiquidity(
    sender: TransactionSignerAndSender,
    userSourceTokenAccounts: PublicKey[],
    userLpTokenAccount: PublicKey,
    depositAmounts: number[],
    minMintAmount: number,
    instructions: TransactionInstruction[]
  ): Promise<TransactionResult<GetMintAmount>> {
    const ephemeralKeypair = new Keypair()
    instructions = instructions.concat([
      ...userSourceTokenAccounts.map((userSourceTokenAccount, i) =>
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          userSourceTokenAccount,
          ephemeralKeypair.publicKey,
          sender.userPublicKey,
          [],
          depositAmounts[i]
        )
      ),
      SwapInstruction.addLiquidity(
        this.poolAccount,
        this.authority,
        ephemeralKeypair.publicKey,
        this.tokenAccounts,
        this.poolTokenMint,
        userSourceTokenAccounts,
        userLpTokenAccount,
        depositAmounts,
        minMintAmount
      ),
      ...userSourceTokenAccounts.map((userSourceTokenAccount) =>
        Token.createRevokeInstruction(TOKEN_PROGRAM_ID, userSourceTokenAccount, sender.userPublicKey, [])
      )
    ])

    const txid = await sender.send(this.connection, instructions, [ephemeralKeypair])

    const result = findLogAndParse<GetMintAmount>(
      (await this.connection.getTransaction(txid))?.meta?.logMessages || [],
      'GetMintAmount'
    )

    return { txid, result }
  }

  async removeLiquidity(
    sender: TransactionSignerAndSender,
    userDestinationTokenAccounts: PublicKey[],
    userLpTokenAccount: PublicKey,
    unmintAmount: number,
    minimumAmounts: number[],
    instructions: TransactionInstruction[]
  ): Promise<TransactionResult<GetWithdrawalAmounts>> {
    const ephemeralKeypair = new Keypair()
    instructions = instructions.concat([
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        userLpTokenAccount,
        ephemeralKeypair.publicKey,
        sender.userPublicKey,
        [],
        unmintAmount
      ),
      SwapInstruction.removeLiquidity(
        this.poolAccount,
        this.authority,
        ephemeralKeypair.publicKey,
        this.tokenAccounts,
        this.poolTokenMint,
        userDestinationTokenAccounts,
        userLpTokenAccount,
        unmintAmount,
        minimumAmounts
      ),
      Token.createRevokeInstruction(TOKEN_PROGRAM_ID, userLpTokenAccount, sender.userPublicKey, [])
    ])

    const txid = await sender.send(this.connection, instructions, [ephemeralKeypair])

    const result = findLogAndParse<GetWithdrawalAmounts>(
      (await this.connection.getTransaction(txid))?.meta?.logMessages || [],
      'GetWithdrawalAmounts'
    )

    return { txid, result }
  }

  async removeLiquidityOneToken(
    sender: TransactionSignerAndSender,
    userDestinationTokenAccount: PublicKey,
    userLpTokenAccount: PublicKey,
    unmintAmount: number,
    minimumAmount: number,
    instructions: TransactionInstruction[]
  ): Promise<TransactionResult<GetWithdrawalAmount>> {
    const ephemeralKeypair = new Keypair()
    instructions = instructions.concat([
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        userLpTokenAccount,
        ephemeralKeypair.publicKey,
        sender.userPublicKey,
        [],
        unmintAmount
      ),
      SwapInstruction.removeLiquidityOneToken(
        this.poolAccount,
        this.authority,
        ephemeralKeypair.publicKey,
        this.tokenAccounts,
        this.poolTokenMint,
        userDestinationTokenAccount,
        userLpTokenAccount,
        unmintAmount,
        minimumAmount
      ),
      Token.createRevokeInstruction(TOKEN_PROGRAM_ID, userLpTokenAccount, sender.userPublicKey, [])
    ])

    const txid = await sender.send(this.connection, instructions, [ephemeralKeypair])

    const result = findLogAndParse<GetWithdrawalAmount>(
      (await this.connection.getTransaction(txid))?.meta?.logMessages || [],
      'GetWithdrawalAmount'
    )

    return { txid, result }
  }

  async exchange(
    sender: TransactionSignerAndSender,
    userSourceTokenAccount: PublicKey,
    userDestinationTokenAccount: PublicKey,
    inAmount: number,
    minimumOutAmount: number,
    instructions: TransactionInstruction[]
  ): Promise<TransactionResult<GetDyUnderlying>> {
    const cleanupInstructions: TransactionInstruction[] = []

    const ephemeralKeypair = new Keypair()
    instructions = instructions.concat([
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        userSourceTokenAccount,
        ephemeralKeypair.publicKey,
        sender.userPublicKey,
        [],
        inAmount
      ),
      SwapInstruction.exchange(
        this.poolAccount,
        this.authority,
        ephemeralKeypair.publicKey,
        this.tokenAccounts,
        userSourceTokenAccount,
        userDestinationTokenAccount,
        inAmount,
        minimumOutAmount
      ),
      Token.createRevokeInstruction(TOKEN_PROGRAM_ID, userSourceTokenAccount, sender.userPublicKey, [])
    ])

    const txid = await sender.send(this.connection, instructions.concat(cleanupInstructions), [ephemeralKeypair])

    const result = findLogAndParse<GetDyUnderlying>(
      (await this.connection.getTransaction(txid))?.meta?.logMessages || [],
      'GetDyUnderlying'
    )

    return { txid, result }
  }

  async getOutAmount(sourceTokenMint: PublicKey, destinationTokenMint: PublicKey, inAmount: number): Promise<number> {
    const kp1 = Keypair.generate()
    const kp2 = Keypair.generate()

    const balanceNeeded = await Token.getMinBalanceRentForExemptAccount(this.connection)

    // We use new fresh token accounts so we don't need the user to have any to simulate
    const instructions: TransactionInstruction[] = [
      SystemProgram.createAccount({
        fromPubkey: this.simulationUser,
        newAccountPubkey: kp1.publicKey,
        lamports: balanceNeeded,
        space: AccountLayout.span,
        programId: TOKEN_PROGRAM_ID
      }),
      Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, sourceTokenMint, kp1.publicKey, this.simulationUser),
      SystemProgram.createAccount({
        fromPubkey: this.simulationUser,
        newAccountPubkey: kp2.publicKey,
        lamports: balanceNeeded,
        space: AccountLayout.span,
        programId: TOKEN_PROGRAM_ID
      }),
      Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, destinationTokenMint, kp2.publicKey, this.simulationUser),
      SwapInstruction.exchange(
        this.poolAccount,
        this.authority,
        this.simulationUser,
        this.tokenAccounts,
        kp1.publicKey,
        kp2.publicKey,
        inAmount,
        0
      )
    ]

    const { value } = await this.connection.simulateTransaction(
      new Transaction({ feePayer: this.simulationUser }).add(...instructions)
    )
    return findLogAndParse<GetDyUnderlying>(value?.logs, 'GetDyUnderlying').dy
  }

  async getMintAmount(depositAmounts: number[]) {
    const instructions: TransactionInstruction[] = [
      SwapInstruction.addLiquidity(
        this.poolAccount,
        this.authority,
        this.simulationUser,
        this.tokenAccounts,
        this.poolTokenMint,
        this.simulationTokenAccounts.tokenAccounts,
        this.simulationTokenAccounts.tokenAccountLP,
        depositAmounts,
        0
      )
    ]

    const { value } = await this.connection.simulateTransaction(
      new Transaction({ feePayer: this.simulationUser }).add(...instructions)
    )
    return findLogAndParse<GetMintAmount>(value?.logs, 'GetMintAmount').mintAmount
  }

  async getWithdrawalAmounts(unmintAmount: number): Promise<GetWithdrawalAmounts> {
    const instructions: TransactionInstruction[] = [
      SwapInstruction.removeLiquidity(
        this.poolAccount,
        this.authority,
        this.simulationUser,
        this.tokenAccounts,
        this.poolTokenMint,
        this.simulationTokenAccounts.tokenAccounts,
        this.simulationTokenAccounts.tokenAccountLP,
        unmintAmount,
        [0, 0, 0]
      )
    ]

    const { value } = await this.connection.simulateTransaction(
      new Transaction({ feePayer: this.simulationUser }).add(...instructions)
    )
    const result = findLogAndParse<GetWithdrawalAmounts>(value?.logs, 'GetWithdrawalAmounts')
    return result
  }

  async getWithdrawalAmount(destinationTokenMint: PublicKey, unmintAmount: number): Promise<GetWithdrawalAmount> {
    const tokenIndex = this.tokenMints.findIndex((tokenMint) => destinationTokenMint.equals(tokenMint))
    if (tokenIndex < 0) {
      throw Error(`Failed to find ${destinationTokenMint.toBase58()} in tokenMints`)
    }
    const instructions: TransactionInstruction[] = [
      SwapInstruction.removeLiquidityOneToken(
        this.poolAccount,
        this.authority,
        this.simulationUser,
        this.tokenAccounts,
        this.poolTokenMint,
        this.simulationTokenAccounts.tokenAccounts[tokenIndex],
        this.simulationTokenAccounts.tokenAccountLP,
        unmintAmount,
        0
      )
    ]

    const { value } = await this.connection.simulateTransaction(
      new Transaction({ feePayer: this.simulationUser }).add(...instructions)
    )
    const result = findLogAndParse<GetWithdrawalAmount>(value?.logs, 'GetWithdrawalAmount')
    return result
  }

  async getVirtualPrice(): Promise<GetVirtualPrice> {
    const instructions: TransactionInstruction[] = [
      SwapInstruction.getVirtualPrice(
        this.poolAccount,
        this.authority,
        this.simulationUser,
        this.tokenAccounts,
        this.poolTokenMint
      )
    ]

    const { value } = await this.connection.simulateTransaction(
      new Transaction({ feePayer: this.simulationUser }).add(...instructions)
    )
    const result = findLogAndParse<GetVirtualPrice>(value?.logs, 'GetVirtualPrice')
    return result
  }

  /**
   * Setup simulation user, if payer is provided tries to create token accounts, otherwise assumes they are created
   */
  static async setupSimulationUser(
    connection: Connection,
    simulationUser: PublicKey,
    tokenMints: PublicKey[],
    poolTokenMint: PublicKey,
    payer?: Signer
  ): Promise<SimulationTokenAccounts> {
    if (payer) {
      // Fund the system program account to avoid early failures
      const transferIx = SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: simulationUser,
        lamports: 100_000_000
      })
      const signature = await connection.sendTransaction(new Transaction().add(transferIx), [payer], {
        skipPreflight: true
      })
      await connection.confirmTransaction(signature, 'confirmed')

      // Create necessary accounts if they do not exist
      const tokenAccounts = await Promise.all(
        tokenMints.map(async (tokenMint) => {
          const token = new Token(connection, tokenMint, TOKEN_PROGRAM_ID, payer)
          const accountInfo = await token.getOrCreateAssociatedAccountInfo(simulationUser)
          return accountInfo.address
        })
      )
      const tokenLP = new Token(connection, poolTokenMint, TOKEN_PROGRAM_ID, payer)

      return {
        tokenAccounts,
        tokenAccountLP: (await tokenLP.getOrCreateAssociatedAccountInfo(simulationUser)).address
      }
    } else {
      return {
        tokenAccounts: await Promise.all(
          tokenMints.map((tokenMint) =>
            Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, tokenMint, simulationUser)
          )
        ),
        tokenAccountLP: await Token.getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          poolTokenMint,
          simulationUser
        )
      }
    }
  }

  private static async getTokenAccountMint(connection: Connection, publicKey: PublicKey) {
    const accountInfoData = (await connection.getAccountInfo(publicKey))?.data
    if (!accountInfoData) {
      throw new Error(`Missing pool token account ${publicKey.toBase58()}`)
    }

    return new PublicKey(AccountLayout.decode(accountInfoData).mint)
  }
}

export interface GetDyUnderlying {
  dy: number
}

export interface GetWithdrawalAmounts {
  amounts: number[]
}

export interface GetWithdrawalAmount {
  dy: number
}

export interface GetMintAmount {
  mintAmount: number
}

export interface GetVirtualPrice {
  virtualPrice: number
}

export interface TransactionResult<T> {
  txid: TransactionSignature
  result: T
}

export function findLogAndParse<T>(logs: string[] | null, name: string): T {
  // State of the art solana methodology to consume return values
  const re = new RegExp(`${name}: (\\{.+\\})`, 'i')

  let result: T | undefined
  logs?.find((log) => {
    const match = log.match(re)
    if (match?.length === 2) {
      result = JSON.parse(match[1]) as T
    }

    return match
  })

  if (!result) {
    throw new Error(`Failed to find log in logs: ${logs}`)
  }
  return result
}
