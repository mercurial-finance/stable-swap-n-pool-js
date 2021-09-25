import { array, bool, publicKey, u64 } from '@project-serum/borsh';
import { struct, u32, u8 } from 'buffer-layout';
export const MAX_N_COINS = 4;
export const AdminSettings = struct([bool('swapEnabled'), bool('addLiquidityEnabled')]);
// SwapState is always the latest
export const SwapState = struct([
    u8('version'),
    bool('isInitialized'),
    u8('nonce'),
    u64('amplificationCoefficient'),
    u64('feeNumerator'),
    u64('adminFeeNumerator'),
    u32('tokenAccountsLength'),
    u64('precisionFactor'),
    array(u64(), MAX_N_COINS, 'precisionMultipliers'),
    array(publicKey(), MAX_N_COINS, 'tokenAccounts'),
    publicKey('poolMint'),
    publicKey('adminTokenMint'),
    AdminSettings.replicate('adminSettings')
]);
//# sourceMappingURL=state.js.map