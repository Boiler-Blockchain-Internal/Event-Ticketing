import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { network } from 'hardhat'
import { keccak256, toHex } from 'viem'
import PassmarkModule from '../ignition/modules/Passmark.ts'

const { viem, ignition } = await network.create()
const [admin, issuer, alice, bob, stranger] = await viem.getWalletClients()

const EVENT = 1n
const HASH = keccak256(toHex('boiler-blockchain-fall-kickoff'))

async function setup() {
  const pass = await viem.deployContract('Passmark', [admin.account.address])
  await pass.write.registerEvent([EVENT, issuer.account.address])
  const as = (wallet: typeof admin) =>
    viem.getContractAt('Passmark', pass.address, { client: { wallet } })
  return { pass, asIssuer: await as(issuer), asAlice: await as(alice), asStranger: await as(stranger) }
}

describe('Passmark', () => {
  it('issuer mints a locked credential with on-chain proof', async () => {
    const { pass, asIssuer } = await setup()
    await viem.assertions.emitWithArgs(
      asIssuer.write.mint([alice.account.address, EVENT, HASH]),
      pass,
      'CredentialMinted',
      [1n, alice.account.address, EVENT, HASH],
    )
    assert.equal((await pass.read.ownerOf([1n])).toLowerCase(), alice.account.address)
    assert.deepEqual(await pass.read.credentials([1n]), [EVENT, HASH])
    assert.equal(await pass.read.locked([1n]), true)
    assert.equal(await pass.read.supportsInterface(['0xb45a3c0e']), true)
  })

  it('admin can mint for any event', async () => {
    const { pass } = await setup()
    await pass.write.mint([alice.account.address, EVENT, HASH])
    assert.equal(await pass.read.balanceOf([alice.account.address]), 1n)
  })

  it('blocks holder transfers by default', async () => {
    const { pass, asIssuer, asAlice } = await setup()
    await asIssuer.write.mint([alice.account.address, EVENT, HASH])
    await viem.assertions.revertWithCustomErrorWithArgs(
      asAlice.write.transferFrom([alice.account.address, bob.account.address, 1n]),
      pass,
      'TransferLocked',
      [1n],
    )
  })

  it('transfer flag lets holders move credentials, and can be turned back off', async () => {
    const { pass, asIssuer, asAlice } = await setup()
    await asIssuer.write.mint([alice.account.address, EVENT, HASH])
    await viem.assertions.emitWithArgs(asIssuer.write.setTransferable([EVENT, true]), pass, 'TransferableSet', [EVENT, true])
    assert.equal(await pass.read.locked([1n]), false)
    await asAlice.write.transferFrom([alice.account.address, bob.account.address, 1n])
    assert.equal((await pass.read.ownerOf([1n])).toLowerCase(), bob.account.address)

    await asIssuer.write.setTransferable([EVENT, false])
    await viem.assertions.revertWithCustomError(
      viem.getContractAt('Passmark', pass.address, { client: { wallet: bob } }).then((c) =>
        c.write.transferFrom([bob.account.address, alice.account.address, 1n]),
      ),
      pass,
      'TransferLocked',
    )
  })

  it('revoke burns the credential', async () => {
    const { pass, asIssuer } = await setup()
    await asIssuer.write.mint([alice.account.address, EVENT, HASH])
    await viem.assertions.emitWithArgs(asIssuer.write.revoke([1n]), pass, 'CredentialRevoked', [1n, EVENT])
    await viem.assertions.revertWithCustomError(pass.read.ownerOf([1n]), pass, 'ERC721NonexistentToken')
    assert.deepEqual(await pass.read.credentials([1n]), [0n, `0x${'0'.repeat(64)}`])
  })

  it('reissue moves the same credential to a new holder under a new id', async () => {
    const { pass, asIssuer } = await setup()
    await asIssuer.write.mint([alice.account.address, EVENT, HASH])
    await viem.assertions.emitWithArgs(
      asIssuer.write.reissue([1n, bob.account.address]),
      pass,
      'CredentialReissued',
      [1n, 2n, bob.account.address],
    )
    await viem.assertions.revertWithCustomError(pass.read.ownerOf([1n]), pass, 'ERC721NonexistentToken')
    assert.equal((await pass.read.ownerOf([2n])).toLowerCase(), bob.account.address)
    assert.deepEqual(await pass.read.credentials([2n]), [EVENT, HASH])
    assert.equal(await pass.read.locked([2n]), true)
  })

  it('rejects non-issuers on every issuer action', async () => {
    const { pass, asIssuer, asStranger } = await setup()
    await asIssuer.write.mint([alice.account.address, EVENT, HASH])
    for (const call of [
      asStranger.write.mint([stranger.account.address, EVENT, HASH]),
      asStranger.write.revoke([1n]),
      asStranger.write.reissue([1n, stranger.account.address]),
      asStranger.write.setTransferable([EVENT, true]),
    ]) {
      await viem.assertions.revertWithCustomErrorWithArgs(call, pass, 'NotIssuer', [EVENT, stranger.account.address])
    }
    await viem.assertions.revertWithCustomError(
      asStranger.write.registerEvent([2n, stranger.account.address]),
      pass,
      'AccessControlUnauthorizedAccount',
    )
  })

  it('an issuer cannot act on another org\'s event', async () => {
    const { pass, asIssuer } = await setup()
    await pass.write.registerEvent([2n, bob.account.address])
    await viem.assertions.revertWithCustomErrorWithArgs(
      asIssuer.write.mint([alice.account.address, 2n, HASH]),
      pass,
      'NotIssuer',
      [2n, issuer.account.address],
    )
  })

  it('rejects unknown and duplicate events', async () => {
    const { pass } = await setup()
    await viem.assertions.revertWithCustomErrorWithArgs(pass.write.mint([alice.account.address, 9n, HASH]), pass, 'UnknownEvent', [9n])
    await viem.assertions.revertWithCustomErrorWithArgs(pass.write.registerEvent([EVENT, bob.account.address]), pass, 'EventExists', [EVENT])
  })

  it('deploys via Hardhat Ignition module and grants admin role to account 0 by default', async () => {
    const { passmark } = await ignition.deploy(PassmarkModule)
    const defaultAdminRole = await passmark.read.DEFAULT_ADMIN_ROLE()
    const hasAdmin = await passmark.read.hasRole([defaultAdminRole, admin.account.address])
    assert.equal(hasAdmin, true)
  })

  it('deploys via Hardhat Ignition module with an explicit admin parameter', async () => {
    const { passmark } = await ignition.deploy(PassmarkModule, {
      parameters: { Passmark: { admin: issuer.account.address } },
    })
    const defaultAdminRole = await passmark.read.DEFAULT_ADMIN_ROLE()
    assert.equal(await passmark.read.hasRole([defaultAdminRole, issuer.account.address]), true)
  })
})
