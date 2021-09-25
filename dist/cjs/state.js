"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapState = exports.AdminSettings = exports.MAX_N_COINS = void 0;
const borsh_1 = require("@project-serum/borsh");
const buffer_layout_1 = require("buffer-layout");
exports.MAX_N_COINS = 4;
exports.AdminSettings = (0, buffer_layout_1.struct)([(0, borsh_1.bool)('swapEnabled'), (0, borsh_1.bool)('addLiquidityEnabled')]);
// SwapState is always the latest
exports.SwapState = (0, buffer_layout_1.struct)([
    (0, buffer_layout_1.u8)('version'),
    (0, borsh_1.bool)('isInitialized'),
    (0, buffer_layout_1.u8)('nonce'),
    (0, borsh_1.u64)('amplificationCoefficient'),
    (0, borsh_1.u64)('feeNumerator'),
    (0, borsh_1.u64)('adminFeeNumerator'),
    (0, buffer_layout_1.u32)('tokenAccountsLength'),
    (0, borsh_1.u64)('precisionFactor'),
    (0, borsh_1.array)((0, borsh_1.u64)(), exports.MAX_N_COINS, 'precisionMultipliers'),
    (0, borsh_1.array)((0, borsh_1.publicKey)(), exports.MAX_N_COINS, 'tokenAccounts'),
    (0, borsh_1.publicKey)('poolMint'),
    (0, borsh_1.publicKey)('adminTokenMint'),
    exports.AdminSettings.replicate('adminSettings')
]);
//# sourceMappingURL=state.js.map