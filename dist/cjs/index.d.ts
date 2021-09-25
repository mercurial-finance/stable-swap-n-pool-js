import { Connection, TransactionSignature, TransactionInstruction, Signer } from '@solana/web3.js';
import { Keypair, PublicKey } from '@solana/web3.js';
export { STABLE_SWAP_N_POOL_PROGRAM_ID } from './instructions';
export declare const SIMULATION_USER: PublicKey;
export declare const FEE_DENOMINATOR: number;
export interface TransactionSignerAndSender {
    userPublicKey: PublicKey;
    send: (connection: Connection, instructions: TransactionInstruction[], signers: Signer[]) => Promise<TransactionSignature>;
}
interface SimulationTokenAccounts {
    tokenAccounts: PublicKey[];
    tokenAccountLP: PublicKey;
}
/**
 * Our main swap
 */
export declare class StableSwapNPool {
    connection: Connection;
    poolAccount: PublicKey;
    poolTokenMint: PublicKey;
    authority: PublicKey;
    amplificationCoefficient: number;
    feeNumerator: number;
    adminFeeNumerator: number;
    precisionFactor: number;
    precisionMultiplier: number[];
    addLiquidityEnabled: boolean;
    tokenAccounts: PublicKey[];
    tokenMints: PublicKey[];
    private simulationUser;
    private simulationTokenAccounts;
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
    constructor(connection: Connection, poolAccount: PublicKey, poolTokenMint: PublicKey, authority: PublicKey, amplificationCoefficient: number, feeNumerator: number, adminFeeNumerator: number, precisionFactor: number, precisionMultiplier: number[], addLiquidityEnabled: boolean, tokenAccounts: PublicKey[], tokenMints: PublicKey[], simulationUser: PublicKey, simulationTokenAccounts: SimulationTokenAccounts);
    /**
     * Get the minimum balance for the token swap account to be rent exempt
     *
     * @return Number of lamports required
     */
    static getMinBalanceRentForExemptSwapState(connection: Connection): Promise<number>;
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
    static create(connection: Connection, sender: TransactionSignerAndSender, poolAccount: Keypair, authority: PublicKey, tokenAccounts: PublicKey[], poolTokenMint: PublicKey, adminTokenMint: PublicKey, nonce: number, amplificationCoefficient: number, feeNumerator: number, adminFeeNumerator: number, addLiquidityEnabled: boolean, simulationPayer: Signer, simulationUser: PublicKey): Promise<StableSwapNPool>;
    static load(connection: Connection, address: PublicKey, simulationUser: PublicKey): Promise<StableSwapNPool>;
    addLiquidity(sender: TransactionSignerAndSender, userSourceTokenAccounts: PublicKey[], userLpTokenAccount: PublicKey, depositAmounts: number[], minMintAmount: number, instructions: TransactionInstruction[]): Promise<TransactionResult<GetMintAmount>>;
    removeLiquidity(sender: TransactionSignerAndSender, userDestinationTokenAccounts: PublicKey[], userLpTokenAccount: PublicKey, unmintAmount: number, minimumAmounts: number[], instructions: TransactionInstruction[]): Promise<TransactionResult<GetWithdrawalAmounts>>;
    removeLiquidityOneToken(sender: TransactionSignerAndSender, userDestinationTokenAccount: PublicKey, userLpTokenAccount: PublicKey, unmintAmount: number, minimumAmount: number, instructions: TransactionInstruction[]): Promise<TransactionResult<GetWithdrawalAmount>>;
    exchange(sender: TransactionSignerAndSender, userSourceTokenAccount: PublicKey, userDestinationTokenAccount: PublicKey, inAmount: number, minimumOutAmount: number, instructions: TransactionInstruction[]): Promise<TransactionResult<GetDyUnderlying>>;
    getOutAmount(sourceTokenMint: PublicKey, destinationTokenMint: PublicKey, inAmount: number): Promise<number>;
    getMintAmount(depositAmounts: number[]): Promise<number>;
    getWithdrawalAmounts(unmintAmount: number): Promise<GetWithdrawalAmounts>;
    getWithdrawalAmount(destinationTokenMint: PublicKey, unmintAmount: number): Promise<GetWithdrawalAmount>;
    getVirtualPrice(): Promise<GetVirtualPrice>;
    /**
     * Setup simulation user, if payer is provided tries to create token accounts, otherwise assumes they are created
     */
    static setupSimulationUser(connection: Connection, simulationUser: PublicKey, tokenMints: PublicKey[], poolTokenMint: PublicKey, payer?: Signer): Promise<SimulationTokenAccounts>;
    private static getTokenAccountMint;
}
export interface GetDyUnderlying {
    dy: number;
}
export interface GetWithdrawalAmounts {
    amounts: number[];
}
export interface GetWithdrawalAmount {
    dy: number;
}
export interface GetMintAmount {
    mintAmount: number;
}
export interface GetVirtualPrice {
    virtualPrice: number;
}
export interface TransactionResult<T> {
    txid: TransactionSignature;
    result: T;
}
export declare function findLogAndParse<T>(logs: string[] | null, name: string): T;
//# sourceMappingURL=index.d.ts.map