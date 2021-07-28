import { Keypair, Connection, PublicKey, Signer } from '@solana/web3.js'
import { url } from '../url'
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { findLogAndParse, GetDyUnderlying, StableSwapNPool } from '../src'
import { STABLE_SWAP_N_POOL_PROGRAM_ID } from '../src/instructions'
import assert, { AssertionError } from 'assert'
import { createTokenAccountAndMintSome, TestSender, newAccountWithLamports } from './helpers'

const TOKEN_MINT_DECIMALS = 6
const POOL_ACCOUNT = Keypair.generate()

interface TestTokens {
  authority: Signer
  tokens: Token[]
  poolLpToken: Token
}

interface StableSwapNPoolTestHarness {
  originalStableSwapNPool: StableSwapNPool
  testTokens: TestTokens
}

const SIMULATION_USER = new PublicKey('2YbB88p9EBTJijsxAkmaUjenTXJnmrJvp6MRyT5LiBiM')

describe('StableSwapNPool', function () {
  // @ts-ignore
  this.timeout(30000)
  const connection = new Connection(url, 'confirmed')
  let _stableSwapNPoolTestHarness: StableSwapNPoolTestHarness | Error | undefined

  function waitForStableSwapNPoolTestHarness(): StableSwapNPoolTestHarness {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      // Throw because pre-test failed or wait for harness
      if (_stableSwapNPoolTestHarness instanceof Error) {
        throw _stableSwapNPoolTestHarness
      } else if (_stableSwapNPoolTestHarness) {
        return _stableSwapNPoolTestHarness
      }
    }
    throw new Error('What happened')
  }

  // https://mochajs.org/#working-with-promises so we don't need the weird connection provider
  before(async () => {
    const version = await connection.getVersion()
    console.log('Connection to cluster established:', url, version)
  })

  it('creates the StableSwapNPool', async () => {
    async function createStableSwapNPool() {
      const payer = await newAccountWithLamports(connection, 1000000000)

      const tokenA = await Token.createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        TOKEN_MINT_DECIMALS,
        TOKEN_PROGRAM_ID
      )
      const tokenB = await Token.createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        TOKEN_MINT_DECIMALS,
        TOKEN_PROGRAM_ID
      )
      const tokenC = await Token.createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        TOKEN_MINT_DECIMALS,
        TOKEN_PROGRAM_ID
      )

      const [authority, nonce] = await PublicKey.findProgramAddress(
        [POOL_ACCOUNT.publicKey.toBuffer()],
        STABLE_SWAP_N_POOL_PROGRAM_ID
      )

      const amplificationCoefficient = 2000
      const feeNumerator = 4000000
      const adminFeeNumerator = 0

      const tokenAccountA = await tokenA.createAccount(authority)
      const tokenAccountB = await tokenB.createAccount(authority)
      const tokenAccountC = await tokenC.createAccount(authority)
      const tokenAccounts = [tokenAccountA, tokenAccountB, tokenAccountC]

      const poolLpToken = await Token.createMint(connection, payer, authority, null, 6, TOKEN_PROGRAM_ID)

      const adminToken = await Token.createMint(connection, payer, payer.publicKey, null, 0, TOKEN_PROGRAM_ID)

      const stableSwapNPool = await StableSwapNPool.create(
        connection,
        new TestSender(payer),
        POOL_ACCOUNT,
        authority,
        tokenAccounts,
        poolLpToken.publicKey,
        adminToken.publicKey,
        nonce,
        amplificationCoefficient,
        feeNumerator,
        adminFeeNumerator,
        true,
        payer,
        SIMULATION_USER
      )

      const tokens = [tokenA, tokenB, tokenC]
      _stableSwapNPoolTestHarness = {
        originalStableSwapNPool: stableSwapNPool,
        testTokens: {
          authority: payer,
          tokens,
          poolLpToken
        }
      }

      assert(POOL_ACCOUNT.publicKey.equals(stableSwapNPool.poolAccount))
      assert(tokenAccountA.equals(stableSwapNPool.tokenAccounts[0]))
      assert(tokenAccountB.equals(stableSwapNPool.tokenAccounts[1]))
      assert(tokenAccountC.equals(stableSwapNPool.tokenAccounts[2]))
    }

    await createStableSwapNPool().catch((err) => {
      if (!(err instanceof AssertionError)) {
        _stableSwapNPoolTestHarness = err
      }
      throw err
    })
    if (!_stableSwapNPoolTestHarness) {
      _stableSwapNPoolTestHarness = new Error('Missing vaultTestHarness')
    }
  })

  it('load should return correct StableSwapNPool', async () => {
    const testHarness = waitForStableSwapNPoolTestHarness()
    const originalStableSwapNPool = testHarness.originalStableSwapNPool

    const stableSwapNPool = await StableSwapNPool.load(connection, originalStableSwapNPool.poolAccount, SIMULATION_USER)

    // Assert loaded vault is equivalent to the original vault
    assert(originalStableSwapNPool.authority.equals(stableSwapNPool.authority))
    assert(originalStableSwapNPool.tokenAccounts[0].equals(stableSwapNPool.tokenAccounts[0]))
    assert(originalStableSwapNPool.tokenAccounts[1].equals(stableSwapNPool.tokenAccounts[1]))
    assert(originalStableSwapNPool.tokenAccounts[2].equals(stableSwapNPool.tokenAccounts[2]))
  })

  it('allows adding liquidity without LP account', async () => {
    const user = await newAccountWithLamports(connection, 1000000000)
    const vaultTestHarness = waitForStableSwapNPoolTestHarness()

    const vault = await StableSwapNPool.load(
      connection,
      vaultTestHarness.originalStableSwapNPool.poolAccount,
      SIMULATION_USER
    )

    const liquidity = 10000_000_000
    const userTokenAAccount = await createTokenAccountAndMintSome(
      vaultTestHarness.testTokens.tokens[0],
      vaultTestHarness.testTokens.authority,
      user.publicKey,
      liquidity
    )
    const userTokenBAccount = await createTokenAccountAndMintSome(
      vaultTestHarness.testTokens.tokens[1],
      vaultTestHarness.testTokens.authority,
      user.publicKey,
      liquidity
    )
    const userTokenCAccount = await createTokenAccountAndMintSome(
      vaultTestHarness.testTokens.tokens[2],
      vaultTestHarness.testTokens.authority,
      user.publicKey,
      liquidity
    )
    const userLpTokenAccount = await vaultTestHarness.testTokens.poolLpToken.createAssociatedTokenAccount(
      user.publicKey
    )

    await vault.addLiquidity(
      new TestSender(user),
      [userTokenAAccount, userTokenBAccount, userTokenCAccount],
      userLpTokenAccount,
      [liquidity, liquidity, liquidity],
      0, // TODO: This value to be roughly derived from inAmounts for the test
      []
    )

    const userLpTokenAccountInfo = await vaultTestHarness.testTokens.poolLpToken.getOrCreateAssociatedAccountInfo(
      user.publicKey
    )
    assert.strictEqual(30000000000, userLpTokenAccountInfo.amount.toNumber())

    const userTokenAAccountInfo = await vaultTestHarness.testTokens.tokens[0].getAccountInfo(userTokenAAccount)
    const userTokenBAccountInfo = await vaultTestHarness.testTokens.tokens[1].getAccountInfo(userTokenBAccount)
    const userTokenCAccountInfo = await vaultTestHarness.testTokens.tokens[2].getAccountInfo(userTokenCAccount)
    assert.strictEqual(0, userTokenAAccountInfo.amount.toNumber())
    assert.strictEqual(0, userTokenBAccountInfo.amount.toNumber())
    assert.strictEqual(0, userTokenCAccountInfo.amount.toNumber())
  })

  it('allows adding liquidity with LP account and exchange', async () => {
    const user = await newAccountWithLamports(connection, 1000000000)
    const testHarness = waitForStableSwapNPoolTestHarness()

    const stableSwapNPool = await StableSwapNPool.load(
      connection,
      testHarness.originalStableSwapNPool.poolAccount,
      SIMULATION_USER
    )

    const liquidity = 10000_000_000
    const userTokenAAccount = await createTokenAccountAndMintSome(
      testHarness.testTokens.tokens[0],
      testHarness.testTokens.authority,
      user.publicKey,
      liquidity
    )
    const userTokenBAccount = await createTokenAccountAndMintSome(
      testHarness.testTokens.tokens[1],
      testHarness.testTokens.authority,
      user.publicKey,
      liquidity
    )
    const userTokenCAccount = await createTokenAccountAndMintSome(
      testHarness.testTokens.tokens[2],
      testHarness.testTokens.authority,
      user.publicKey,
      liquidity
    )

    const firstUserLpTokenAccount = await testHarness.testTokens.poolLpToken.createAssociatedTokenAccount(
      user.publicKey
    )

    await stableSwapNPool.addLiquidity(
      new TestSender(user),
      [userTokenAAccount, userTokenBAccount, userTokenCAccount],
      firstUserLpTokenAccount,
      [liquidity, liquidity, liquidity],
      0, // TODO: This value to be roughly derived from inAmounts for the test
      []
    )

    const userLpTokenAccountInfo = await testHarness.testTokens.poolLpToken.getAccountInfo(firstUserLpTokenAccount)
    assert.strictEqual(30000000000, userLpTokenAccountInfo.amount.toNumber())

    const userTokenAAccountInfo = await testHarness.testTokens.tokens[0].getAccountInfo(userTokenAAccount)
    const userTokenBAccountInfo = await testHarness.testTokens.tokens[1].getAccountInfo(userTokenBAccount)
    const userTokenCAccountInfo = await testHarness.testTokens.tokens[2].getAccountInfo(userTokenCAccount)
    assert.strictEqual(0, userTokenAAccountInfo.amount.toNumber())
    assert.strictEqual(0, userTokenBAccountInfo.amount.toNumber())
    assert.strictEqual(0, userTokenCAccountInfo.amount.toNumber())

    // Arrange exchange
    const secondUser = await newAccountWithLamports(connection, 1000000000)

    const inAmount = 10_000_000
    const margin = 100
    const secondUserTokenBAccount = await createTokenAccountAndMintSome(
      testHarness.testTokens.tokens[1],
      testHarness.testTokens.authority,
      secondUser.publicKey,
      inAmount + margin
    )
    const secondUserTokenDAccount = await createTokenAccountAndMintSome(
      testHarness.testTokens.tokens[2],
      testHarness.testTokens.authority,
      secondUser.publicKey,
      0
    )

    await stableSwapNPool.exchange(
      new TestSender(secondUser),
      secondUserTokenBAccount,
      secondUserTokenDAccount,
      inAmount,
      0, // TODO: Add rough slippage tolerance
      []
    )

    // Assert exchange
    const secondUserTokenBAccountInfo = await testHarness.testTokens.tokens[1].getAccountInfo(secondUserTokenBAccount)
    const secondUserTokenDAccountInfo = await testHarness.testTokens.tokens[2].getAccountInfo(secondUserTokenDAccount)

    assert.strictEqual(margin, secondUserTokenBAccountInfo.amount.toNumber())
    assert(secondUserTokenDAccountInfo.amount.toNumber() > inAmount - 5_000_000)
  })

  it('allows to removeLiquidityOneToken', async () => {
    const user = await newAccountWithLamports(connection, 1000000000)
    const testHarness = waitForStableSwapNPoolTestHarness()
    const stableSwapNPool = await StableSwapNPool.load(
      connection,
      testHarness.originalStableSwapNPool.poolAccount,
      SIMULATION_USER
    )

    const liquidity = 10000_000_000
    const userTokenAAccount = await testHarness.testTokens.tokens[0].createAssociatedTokenAccount(user.publicKey)
    const userTokenBAccount = await createTokenAccountAndMintSome(
      testHarness.testTokens.tokens[1],
      testHarness.testTokens.authority,
      user.publicKey,
      liquidity
    )
    const userTokenCAccount = await testHarness.testTokens.tokens[2].createAssociatedTokenAccount(user.publicKey)

    const firstUserLpTokenAccount = await testHarness.testTokens.poolLpToken.createAssociatedTokenAccount(
      user.publicKey
    )

    await stableSwapNPool.addLiquidity(
      new TestSender(user),
      [userTokenAAccount, userTokenBAccount, userTokenCAccount],
      firstUserLpTokenAccount,
      [0, liquidity, 0],
      0,
      []
    )

    await stableSwapNPool.removeLiquidityOneToken(
      new TestSender(user),
      userTokenBAccount,
      firstUserLpTokenAccount,
      (await testHarness.testTokens.poolLpToken.getAccountInfo(firstUserLpTokenAccount)).amount.toNumber(),
      0,
      []
    )
  })

  it('allows to getOutAmount', async () => {
    const testHarness = waitForStableSwapNPoolTestHarness()
    const stableSwapNPool = await StableSwapNPool.load(
      connection,
      testHarness.originalStableSwapNPool.poolAccount,
      SIMULATION_USER
    )

    const inAmount = 1_000000
    const outAmount = await stableSwapNPool.getOutAmount(
      testHarness.testTokens.tokens[1].publicKey,
      testHarness.testTokens.tokens[0].publicKey,
      inAmount
    )

    // Only check by 20% margin that the number is sensible
    assert(Math.abs(outAmount - inAmount) / inAmount < 0.2, `${outAmount} within 20% of ${inAmount}`)
  })

  it('allows to getMintAmount', async () => {
    const testHarness = waitForStableSwapNPoolTestHarness()
    const vault = await StableSwapNPool.load(
      connection,
      testHarness.originalStableSwapNPool.poolAccount,
      SIMULATION_USER
    )
    const mintAmount = await vault.getMintAmount([10_000000, 20_000000, 30_000000])

    assert.strictEqual(59993567, mintAmount)
  })

  it('allows to getWithdrawalAmounts', async () => {
    const testHarness = waitForStableSwapNPoolTestHarness()
    const vault = await StableSwapNPool.load(
      connection,
      testHarness.originalStableSwapNPool.poolAccount,
      SIMULATION_USER
    )
    const withdrawalAmounts = await vault.getWithdrawalAmounts(10 * 10 ** 6)

    assert.strictEqual(3333333, withdrawalAmounts.amounts[0])
    assert.strictEqual(3335571, withdrawalAmounts.amounts[1])
    assert.strictEqual(3331667, withdrawalAmounts.amounts[2])
  })

  it('allows to getVirtualPrice', async () => {
    const testHarness = waitForStableSwapNPoolTestHarness()
    const vault = await StableSwapNPool.load(
      connection,
      testHarness.originalStableSwapNPool.poolAccount,
      SIMULATION_USER
    )
    const vaultSettings = await vault.getVirtualPrice()

    assert.strictEqual(1000057, vaultSettings.virtualPrice)
  })
})

describe('findLogAndParse', () => {
  const name = 'GetDyUnderlying'

  it('should return expected GetDyUnderlying when present', () => {
    const logs = [
      'Program log: Noise',
      'Program log: Noisy: {"potatoe": 1}',
      'Program blob: GetDyUnderlying: {"dy": 1239085412123}',
      'Some more, the end'
    ]

    const result = findLogAndParse<GetDyUnderlying>(logs, name)
    assert.strictEqual(result.dy, 1239085412123)
  })

  it('should throw if log is not present', () => {
    const logs = ['Program log: Some stuff', 'More stuff that is not what we need']

    assert.throws(() => findLogAndParse(logs, name))
  })

  it('should throw if logs is null', () => {
    assert.throws(() => findLogAndParse(null, name))
  })
})
