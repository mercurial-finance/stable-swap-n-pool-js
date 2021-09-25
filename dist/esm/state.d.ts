import { PublicKey } from '@solana/web3.js';
import { Layout } from '@project-serum/borsh';
import BN from 'bn.js';
export declare const MAX_N_COINS = 4;
export interface AdminSettings {
    swapEnabled: boolean;
    addLiquidityEnabled: boolean;
}
export interface SwapState {
    version: number;
    isInitialized: boolean;
    nonce: number;
    amplificationCoefficient: BN;
    feeNumerator: BN;
    adminFeeNumerator: BN;
    precisionFactor: BN;
    precisionMultipliers: BN[];
    tokenAccountsLength: number;
    tokenAccounts: PublicKey[];
    poolMint: PublicKey;
    adminTokenMint: PublicKey;
    adminSettings: AdminSettings;
}
export declare const AdminSettings: Layout<AdminSettings>;
export declare const SwapState: Layout<SwapState>;
//# sourceMappingURL=state.d.ts.map