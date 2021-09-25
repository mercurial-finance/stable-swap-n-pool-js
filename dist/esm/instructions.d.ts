import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { EnumLayout } from '@project-serum/borsh';
import BN from 'bn.js';
import { AdminSettings } from './state';
export declare const STABLE_SWAP_N_POOL_PROGRAM_ID: PublicKey;
declare type SwapInstructionLayout = {
    initialize: {
        nonce: number;
        nCoins: number;
        amplificationCoefficient: BN;
        feeNumerator: BN;
        adminFeeNumerator: BN;
        adminSettings: AdminSettings;
    };
} | {
    addLiquidity: {
        depositAmounts: BN[];
        minMintAmount: BN;
    };
} | {
    removeLiquidity: {
        unmintAmount: BN;
        minimumAmounts: BN[];
    };
} | {
    removeLiquidityOneToken: {
        unmintAmount: BN;
        minimumOutAmount: BN;
    };
} | {
    exchange: {
        inAmount: BN;
        minimumOutAmount: BN;
    };
} | {
    getVirtualPrice: Record<string, never>;
} | {
    setAdminSettingSwap: {
        enabled: boolean;
    };
} | {
    setAdminSettingAddLiquidity: {
        enabled: boolean;
    };
};
export declare const SwapInstructionLayout: EnumLayout<SwapInstructionLayout>;
export declare class SwapInstruction {
    static initialize(swapInfo: PublicKey, authority: PublicKey, tokenAccounts: PublicKey[], tokenMints: PublicKey[], poolTokenMint: PublicKey, adminTokenMint: PublicKey, nonce: number, amplificationCoefficient: number, feeNumerator: number, adminFeeNumerator: number, adminSettings: AdminSettings): TransactionInstruction;
    static addLiquidity(swapInfo: PublicKey, authority: PublicKey, userTransferAuthority: PublicKey, tokenAccounts: PublicKey[], poolTokenMint: PublicKey, sourceTokenAccounts: PublicKey[], userLpTokenAccount: PublicKey, depositAmounts: number[], minMintAmount: number): TransactionInstruction;
    static removeLiquidity(swapInfo: PublicKey, authority: PublicKey, userTransferAuthority: PublicKey, tokenAccounts: PublicKey[], poolTokenMint: PublicKey, destinationTokenAccounts: PublicKey[], userLpTokenAccount: PublicKey, unmintAmount: number, minimumAmounts: number[]): TransactionInstruction;
    static removeLiquidityOneToken(swapInfo: PublicKey, authority: PublicKey, userTransferAuthority: PublicKey, tokenAccounts: PublicKey[], poolTokenMint: PublicKey, destinationTokenAccount: PublicKey, userLpTokenAccount: PublicKey, unmintAmount: number, minimumOutAmount: number): TransactionInstruction;
    static exchange(swapInfo: PublicKey, authority: PublicKey, userTransferAuthority: PublicKey, tokenAccounts: PublicKey[], userSourceTokenAccount: PublicKey, userDestinationTokenAccount: PublicKey, inAmount: number, minimumOutAmount: number): TransactionInstruction;
    static getVirtualPrice(swapInfo: PublicKey, authority: PublicKey, userTransferAuthority: PublicKey, tokenAccounts: PublicKey[], poolTokenMint: PublicKey): TransactionInstruction;
}
export {};
//# sourceMappingURL=instructions.d.ts.map