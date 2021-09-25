// Inspired from https://github.com/project-serum/serum-ts/blob/master/packages/token/src/instructions.ts
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { rustEnum, u64, struct, u8, vec } from '@project-serum/borsh';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { AdminSettings } from './state';
export const STABLE_SWAP_N_POOL_PROGRAM_ID = new PublicKey('MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky');
const swapInstructions = [
    struct([
        u8('nonce'),
        u8('nCoins'),
        u64('amplificationCoefficient'),
        u64('feeNumerator'),
        u64('adminFeeNumerator'),
        AdminSettings.replicate('adminSettings')
    ], 'initialize'),
    struct([vec(u64(), 'depositAmounts'), u64('minMintAmount')], 'addLiquidity'),
    struct([u64('unmintAmount'), vec(u64(), 'minimumAmounts')], 'removeLiquidity'),
    struct([u64('unmintAmount'), u64('minimumOutAmount')], 'removeLiquidityOneToken'),
    struct([u64('inAmount'), u64('minimumOutAmount')], 'exchange'),
    struct([], 'getVirtualPrice')
];
export const SwapInstructionLayout = rustEnum(swapInstructions);
function encodeSwapInstructionData(instruction) {
    const b = Buffer.alloc(1000); // Because we have vec, we cannot infer a correct max span
    const span = SwapInstructionLayout.encode(instruction, b);
    return b.slice(0, span);
}
export class SwapInstruction {
    static initialize(swapInfo, authority, tokenAccounts, tokenMints, poolTokenMint, adminTokenMint, nonce, amplificationCoefficient, feeNumerator, adminFeeNumerator, adminSettings) {
        const keys = [
            { pubkey: swapInfo, isSigner: true, isWritable: true },
            { pubkey: authority, isSigner: false, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: false })),
            ...tokenMints.map((tokenMint) => ({ pubkey: tokenMint, isSigner: false, isWritable: false })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true },
            { pubkey: adminTokenMint, isSigner: false, isWritable: true }
        ];
        return new TransactionInstruction({
            programId: STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                initialize: {
                    nonce,
                    nCoins: tokenAccounts.length,
                    amplificationCoefficient: new BN(amplificationCoefficient),
                    feeNumerator: new BN(feeNumerator),
                    adminFeeNumerator: new BN(adminFeeNumerator),
                    adminSettings
                }
            })
        });
    }
    static addLiquidity(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint, sourceTokenAccounts, userLpTokenAccount, depositAmounts, minMintAmount) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
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
        return new TransactionInstruction({
            programId: STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                addLiquidity: {
                    depositAmounts: depositAmounts.map((i) => new BN(i)),
                    minMintAmount: new BN(minMintAmount)
                }
            })
        });
    }
    static removeLiquidity(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint, destinationTokenAccounts, userLpTokenAccount, unmintAmount, minimumAmounts) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
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
        return new TransactionInstruction({
            programId: STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                removeLiquidity: {
                    unmintAmount: new BN(unmintAmount),
                    minimumAmounts: minimumAmounts.map((i) => new BN(i))
                }
            })
        });
    }
    static removeLiquidityOneToken(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint, destinationTokenAccount, userLpTokenAccount, unmintAmount, minimumOutAmount) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true },
            { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
            { pubkey: userLpTokenAccount, isSigner: false, isWritable: true }
        ];
        return new TransactionInstruction({
            programId: STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                removeLiquidityOneToken: {
                    unmintAmount: new BN(unmintAmount),
                    minimumOutAmount: new BN(minimumOutAmount)
                }
            })
        });
    }
    static exchange(swapInfo, authority, userTransferAuthority, tokenAccounts, userSourceTokenAccount, userDestinationTokenAccount, inAmount, minimumOutAmount) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
            { pubkey: userDestinationTokenAccount, isSigner: false, isWritable: true }
        ];
        return new TransactionInstruction({
            programId: STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                exchange: {
                    inAmount: new BN(inAmount),
                    minimumOutAmount: new BN(minimumOutAmount)
                }
            })
        });
    }
    static getVirtualPrice(swapInfo, authority, userTransferAuthority, tokenAccounts, poolTokenMint) {
        const keys = [
            { pubkey: swapInfo, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: false, isWritable: false },
            { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
            ...tokenAccounts.map((tokenAccount) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
            { pubkey: poolTokenMint, isSigner: false, isWritable: true }
        ];
        return new TransactionInstruction({
            programId: STABLE_SWAP_N_POOL_PROGRAM_ID,
            keys,
            data: encodeSwapInstructionData({
                getVirtualPrice: {}
            })
        });
    }
}
//# sourceMappingURL=instructions.js.map