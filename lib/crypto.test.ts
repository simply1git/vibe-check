import { expect, test, describe } from 'vitest'
import { hashPin } from './crypto'

describe('Crypto Utilities', () => {
  test('hashPin produces consistent hash for same input', async () => {
    const pin = '1234'
    const salt = 'random-uuid-salt'
    const hash1 = await hashPin(pin, salt)
    const hash2 = await hashPin(pin, salt)
    expect(hash1).toBe(hash2)
  })

  test('hashPin produces different hash for different salts', async () => {
    const pin = '1234'
    const salt1 = 'salt-1'
    const salt2 = 'salt-2'
    const hash1 = await hashPin(pin, salt1)
    const hash2 = await hashPin(pin, salt2)
    expect(hash1).not.toBe(hash2)
  })

  test('hashPin produces different hash for different pins', async () => {
    const salt = 'constant-salt'
    const hash1 = await hashPin('1234', salt)
    const hash2 = await hashPin('5678', salt)
    expect(hash1).not.toBe(hash2)
  })
})
