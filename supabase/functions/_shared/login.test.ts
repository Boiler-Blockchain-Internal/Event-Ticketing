import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { CITADEL_ISSUER, ISSUER, uncompressed, verifyLogin } from './login.ts'

const now = 1_800_000_000_000
const wallet = privateKeyToAccount(generatePrivateKey())
// Tokens carry the compressed key: 02/03 (y parity) + x.
const compressed = (pub: string) => `0${(BigInt(`0x${pub.slice(-2)}`) & 1n) + 2n}${pub.slice(4, 68)}`

const b64url = (b: ArrayBuffer | Uint8Array) => Buffer.from(b as Uint8Array).toString('base64url')
const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const jwks = async () => ({ keys: [{ ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' }] })

async function token(claims: object, kid = 'k1') {
  const body = `${b64url(Buffer.from(JSON.stringify({ alg: 'ES256', kid })))}.${b64url(Buffer.from(JSON.stringify(claims)))}`
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(body))
  return `${body}.${b64url(sig)}`
}
const good = {
  iss: ISSUER, aud: 'client-1', exp: now / 1000 + 600, email: 'Priya@Purdue.edu', name: 'Priya S.',
  wallets: [{ type: 'web3auth_app_key', curve: 'secp256k1', public_key: compressed(wallet.publicKey) }],
}

test('decompresses secp256k1 keys of both parities', () => {
  for (let i = 0; i < 8; i++) {
    const pub = privateKeyToAccount(generatePrivateKey()).publicKey
    assert.equal(uncompressed(compressed(pub)), pub)
  }
})

test('valid token yields email, name and the wallet address', async () => {
  assert.deepEqual(await verifyLogin(await token(good), 'client-1', now, jwks), {
    email: 'priya@purdue.edu', name: 'Priya S.', address: wallet.address.toLowerCase(),
  })
})

test('validates Web3Auth v11 Citadel issuer tokens', async () => {
  const citadelToken = await token({
    iss: CITADEL_ISSUER, aud: 'client-1', exp: now / 1000 + 600, email: 'citadel@purdue.edu', name: 'Citadel User',
    wallets: [{ type: 'web3auth_app_key', curve: 'secp256k1', public_key: compressed(wallet.publicKey) }],
  })
  assert.deepEqual(await verifyLogin(citadelToken, 'client-1', now, jwks), {
    email: 'citadel@purdue.edu', name: 'Citadel User', address: wallet.address.toLowerCase(),
  })
})

test('validates Web3Auth v11 bare web3auth.io issuer tokens with ethereum address claim', async () => {
  const citadelToken = await token({
    iss: 'web3auth.io', aud: 'client-1', exp: now / 1000 + 600, email: 'citadel-attendee@purdue.edu', name: 'Citadel Attendee',
    wallets: [{ address: wallet.address, type: 'ethereum' }],
  })
  assert.deepEqual(await verifyLogin(citadelToken, 'client-1', now, jwks), {
    email: 'citadel-attendee@purdue.edu', name: 'Citadel Attendee', address: wallet.address.toLowerCase(),
  })
})

test('rejects other projects, other issuers, expired, unknown keys and tampering', async () => {
  const v = async (t: string) => verifyLogin(t, 'client-1', now, jwks)
  assert.equal(await v(await token({ ...good, aud: 'client-2' })), null)
  assert.equal(await v(await token({ ...good, iss: 'https://evil.example' })), null)
  assert.equal(await v(await token({ ...good, exp: now / 1000 - 1 })), null)
  assert.equal(await v(await token(good, 'other-kid')), null)
  assert.equal(await v(await token({ ...good, wallets: [] })), null)
  const [h, , s] = (await token(good)).split('.')
  assert.equal(await v(`${h}.${b64url(Buffer.from(JSON.stringify({ ...good, email: 'x@evil.com' })))}.${s}`), null)
  assert.equal(await v('not.a.jwt'), null)
})

test('rejects an unverified wallet submitted with a valid identity token', async () => {
  const tokenNoWallet = await token({ iss: ISSUER, aud: 'client-1', exp: now / 1000 + 600, sub: 'user_123', email: 'ben@purdue.edu' })
  const result = await verifyLogin(tokenNoWallet, 'client-1', now, jwks, { address: wallet.address, name: 'Ben H.' })
  assert.equal(result, null)
})

test('validates token with verifierId fallback for email', async () => {
  const tokenVerifierId = await token({
    iss: ISSUER, aud: 'client-1', exp: now / 1000 + 600, verifierId: 'ben@purdue.edu',
    wallets: [{ type: 'web3auth_app_key', curve: 'secp256k1', public_key: compressed(wallet.publicKey) }],
  })
  const result = await verifyLogin(tokenVerifierId, 'client-1', now, jwks)
  assert.deepEqual(result, {
    email: 'ben@purdue.edu',
    name: null,
    address: wallet.address.toLowerCase(),
  })
})

test('rejects a body address that differs from the verified wallet', async () => {
  const stranger = privateKeyToAccount(generatePrivateKey())
  assert.equal(await verifyLogin(await token(good), 'client-1', now, jwks, { address: stranger.address }), null)
})
test('ignores untrusted body email and rejects extra JWT segments', async () => {
  const t = await token(good)
  const login = await verifyLogin(t, 'client-1', now, jwks, { email: 'attacker@example.com' })
  assert.equal(login?.email, 'priya@purdue.edu')
  assert.equal(await verifyLogin(t + '.extra', 'client-1', now, jwks), null)
})
