import { PublicKey } from '@solana/web3.js'
import { array, bool, Layout, publicKey, u64 } from '@project-serum/borsh'
import { struct, u32, u8 } from 'buffer-layout'

export const MAX_N_COINS = 4

export interface AdminSettings {
  swapEnabled: boolean
  addLiquidityEnabled: boolean
}

export interface SwapStateV1 {
  version: number
  isInitialized: boolean
  nonce: number
  amplificationCoefficient: number
  feeNumerator: number
  adminFeeNumerator: number
  tokenAccountsLength: number
  tokenAccounts: PublicKey[]
  poolMint: PublicKey
  adminTokenMint: PublicKey
  adminSettings: AdminSettings
}

export interface SwapState {
  version: number
  isInitialized: boolean
  nonce: number
  amplificationCoefficient: number
  feeNumerator: number
  adminFeeNumerator: number
  precisionFactor: number
  precisionMultipliers: number[]
  tokenAccountsLength: number
  tokenAccounts: PublicKey[]
  poolMint: PublicKey
  adminTokenMint: PublicKey
  adminSettings: AdminSettings
}

export const AdminSettings: Layout<AdminSettings> = struct([bool('swapEnabled'), bool('addLiquidityEnabled')])

export const SwapStateV1: Layout<SwapStateV1> = struct([
  u8('version'),
  bool('isInitialized'),
  u8('nonce'),
  u64('amplificationCoefficient'),
  u64('feeNumerator'),
  u64('adminFeeNumerator'),
  u32('tokenAccountsLength'),
  array(publicKey(), MAX_N_COINS, 'tokenAccounts'),
  publicKey('poolMint'),
  publicKey('adminTokenMint'),
  AdminSettings.replicate('adminSettings')
])

// SwapState is always the latest
export const SwapState: Layout<SwapState> = struct([
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
])
