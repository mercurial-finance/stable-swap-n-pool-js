"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapInstruction = exports.SwapInstructionLayout = exports.STABLE_SWAP_N_POOL_PROGRAM_ID = void 0;
// Inspired from https://github.com/project-serum/serum-ts/blob/master/packages/token/src/instructions.ts
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("@project-serum/borsh");
const spl_token_1 = require("@solana/spl-token");
const bn_js_1 = __importDefault(require("bn.js"));
const state_1 = require("./state");
exports.STABLE_SWAP_N_POOL_PROGRAM_ID = new web3_js_1.PublicKey('MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky');
const swapInstructions = [
    (0, borsh_1.struct)([
        (0, borsh_1.u8)('nonce'),
        (0, borsh_1.u8)('nCoins'),
        (0, borsh_1.u64)('amplificationCoefficient'),
        (0, borsh_1.u64)('feeNumerator'),
        (0, borsh_1.u64)('adminFeeNumerator'),
        state_1.AdminSettings.replicate('adminSettings')
    ], 'initialize'),
    (0, borsh_1.struct)([(0, borsh_1.vec)((0, borsh_1.u64)(), 'depositAmounts'), (0, borsh_1.u64)('minMintAmount')], 'addLiquidity'),
    (0, borsh_1.struct)([(0, borsh_1.u64)('unmintAmount'), (0, borsh_1.vec)((0, borsh_1.u64)(), 'minimumAmounts')], 'removeLiquidity'),
    (0, borsh_1.struct)([(0, borsh_1.u64)('unmintAmount'), (0, borsh_1.u64)('minimumOutAmount')], 'removeLiquidityOneToken'),
    (0, borsh_1.struct)([(0, borsh_1.u64)('inAmount'), (0, borsh_1.u64)('minimumOutAmount')], 'exchange'),
    (0, borsh_1.struct)([], 'getVirtualPrice')
];
exports.SwapInstructionLayout = (0, borsh_1.rustEnum)(swapInstructions);
function encodeSwapInstructionData(instruction) {
    const b = Buffer.alloc(1000); // Because we have vec, we cannot infer a correct max span
    const span = exports.SwapInstructionLayout.encode(instruction, b);
    return b.slice(0, span);
}
class SwapInstruction {
    static initialize(swapInfo, authority, tokenAccounts, tokenMints, poolTokenMint, adminTokenMint, nonce, amplificationCoefficient, feeNumerator, adminFeeNumerator, adminSettings) {
        const keys = [
            { pubkey: swapInfo, isSigner: true, isWritable: true },
            { pubkey: authority, isSigner: false, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: false })),
            ...tokenMints.map((tokenMint) => ({ pubkey: tokenMint, isSigner: false, isWritable: false })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true },
            { pubkey: adminTokenMint, isSigner: false, isWritable: true }
        ];
        return new web3_js_1.TransactionInstruction({
            programId: exports.STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                initialize: {
                    nonce,
                    nCoins: tokenAccounts.length,
                    amplificationCoefficient: new bn_js_1.default(amplificationCoefficient),
                    feeNumerator: new bn_js_1.default(feeNumerator),
                    adminFeeNumerator: new bn_js_1.default(adminFeeNumerator),
                    adminSettings
                }
            })
        });
    }
    static addLiquidity(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint, sourceTokenAccounts, userLpTokenAccount, depositAmounts, minMintAmount) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: false },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true },
            ...sourceTokenAccounts.map((sourceTokenAccount) => ({
                pubkey: sourceTokenAccount,
                isSigner: false,
                isWritable: true
            })),
            { pubkey: userLpTokenAccount, isSigner: false, isWritable: true }
        ];
        return new web3_js_1.TransactionInstruction({
            programId: exports.STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                addLiquidity: {
                    depositAmounts: depositAmounts.map((i) => new bn_js_1.default(i)),
                    minMintAmount: new bn_js_1.default(minMintAmount)
                }
            })
        });
    }
    static removeLiquidity(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint, destinationTokenAccounts, userLpTokenAccount, unmintAmount, minimumAmounts) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: false },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true },
            ...destinationTokenAccounts.map((destinationTokenAccount) => ({
                pubkey: destinationTokenAccount,
                isSigner: false,
                isWritable: true
            })),
            { pubkey: userLpTokenAccount, isSigner: false, isWritable: true }
        ];
        return new web3_js_1.TransactionInstruction({
            programId: exports.STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                removeLiquidity: {
                    unmintAmount: new bn_js_1.default(unmintAmount),
                    minimumAmounts: minimumAmounts.map((i) => new bn_js_1.default(i))
                }
            })
        });
    }
    static removeLiquidityOneToken(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint, destinationTokenAccount, userLpTokenAccount, unmintAmount, minimumOutAmount) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: true },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true },
            { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
            { pubkey: userLpTokenAccount, isSigner: false, isWritable: true }
        ];
        return new web3_js_1.TransactionInstruction({
            programId: exports.STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                removeLiquidityOneToken: {
                    unmintAmount: new bn_js_1.default(unmintAmount),
                    minimumOutAmount: new bn_js_1.default(minimumOutAmount)
                }
            })
        });
    }
    static exchange(swapInfo, authority, userTransferAuthority, tokenAccounts, userSourceTokenAccount, userDestinationTokenAccount, inAmount, minimumOutAmount) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: true },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
            { pubkey: userDestinationTokenAccount, isSigner: false, isWritable: true }
        ];
        return new web3_js_1.TransactionInstruction({
            programId: exports.STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                exchange: {
                    inAmount: new bn_js_1.default(inAmount),
                    minimumOutAmount: new bn_js_1.default(minimumOutAmount)
                }
            })
        });
    }
    static getVirtualPrice(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: true },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true }
        ];
        return new web3_js_1.TransactionInstruction({
            programId: exports.STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                getVirtualPrice: {}
            })
        });
    }
}
exports.SwapInstruction = SwapInstruction;
//# sourceMappingURL=instructions.js.map