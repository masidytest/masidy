import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isClearlyFreePlan,
  validateMarketplaceMetadata,
} from './vercel-marketplace-utils'

test('only accepts a zero-cost plan without payment or overage', () => {
  assert.equal(
    isClearlyFreePlan({
      id: 'free',
      name: 'Free',
      cost: '$0.00',
      paymentMethodRequired: false,
    }),
    true,
  )
  assert.equal(
    isClearlyFreePlan({
      id: 'paid',
      name: 'Paid',
      cost: '$5.00',
      paymentMethodRequired: false,
    }),
    false,
  )
  assert.equal(
    isClearlyFreePlan({
      id: 'metered',
      name: 'Free with usage charges',
      cost: '0',
      maximumAmount: '10.00',
      paymentMethodRequired: false,
    }),
    false,
  )
  assert.equal(
    isClearlyFreePlan({
      id: 'payment-required',
      name: 'Free trial',
      cost: '0',
      paymentMethodRequired: true,
    }),
    false,
  )
})

test('validates and serializes supported Marketplace metadata', () => {
  const fields = [
    {
      name: 'region',
      title: 'Region',
      type: 'string' as const,
      required: true,
      enum: ['iad1', 'sfo1'],
    },
    {
      name: 'replicas',
      title: 'Replicas',
      type: 'integer' as const,
      required: false,
    },
    {
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean' as const,
      required: false,
    },
  ]

  assert.deepEqual(
    validateMarketplaceMetadata(fields, {
      region: 'iad1',
      replicas: '2',
      enabled: false,
    }),
    { region: 'iad1', replicas: '2', enabled: 'false' },
  )
  assert.throws(
    () => validateMarketplaceMetadata(fields, { region: 'fra1' }),
    /listed values/,
  )
  assert.throws(
    () => validateMarketplaceMetadata(fields, { region: 'iad1', extra: 'x' }),
    /unsupported field/,
  )
})
