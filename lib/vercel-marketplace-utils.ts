export interface MarketplaceMetadataField {
  name: string
  title: string
  description?: string
  type: 'string' | 'number' | 'integer' | 'boolean'
  required: boolean
  enum?: Array<string | number | boolean>
  default?: string | number | boolean
}

export interface MarketplaceBillingPlan {
  id: string
  name: string
  cost?: string
  disabled?: boolean
  paymentMethodRequired: boolean
  initialCharge?: string
  minimumAmount?: string
  maximumAmount?: string
  preauthorizationAmount?: number
  quote?: Array<{ amount?: string }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isZeroAmount(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^\$?0+(?:\.0+)?$/.test(value.trim())
  )
}

export function isClearlyFreePlan(plan: MarketplaceBillingPlan): boolean {
  if (
    plan.disabled === true ||
    plan.paymentMethodRequired !== false ||
    !isZeroAmount(plan.cost)
  ) {
    return false
  }

  for (const amount of [
    plan.initialCharge,
    plan.minimumAmount,
    plan.maximumAmount,
  ]) {
    if (amount !== undefined && !isZeroAmount(amount)) return false
  }

  if (
    plan.preauthorizationAmount !== undefined &&
    plan.preauthorizationAmount !== 0
  ) {
    return false
  }

  return !plan.quote?.some(
    (line) => line.amount !== undefined && !isZeroAmount(line.amount),
  )
}

export function getMarketplaceMetadataFields(schema: unknown): {
  fields: MarketplaceMetadataField[]
  supported: boolean
} {
  if (!isRecord(schema)) return { fields: [], supported: true }
  const properties = isRecord(schema.properties) ? schema.properties : {}
  const required = Array.isArray(schema.required)
    ? schema.required.filter((name): name is string => typeof name === 'string')
    : []
  const fields: MarketplaceMetadataField[] = []
  let supported = true

  for (const [name, property] of Object.entries(properties)) {
    if (!isRecord(property)) {
      if (required.includes(name)) supported = false
      continue
    }
    const type = property.type
    if (
      type !== 'string' &&
      type !== 'number' &&
      type !== 'integer' &&
      type !== 'boolean'
    ) {
      if (required.includes(name)) supported = false
      continue
    }
    const enumValues = Array.isArray(property.enum)
      ? property.enum.filter(
          (value): value is string | number | boolean =>
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean',
        )
      : undefined
    fields.push({
      name,
      title: typeof property.title === 'string' ? property.title : name,
      description:
        typeof property.description === 'string'
          ? property.description
          : undefined,
      type,
      required: required.includes(name),
      enum: enumValues,
      default:
        typeof property.default === 'string' ||
        typeof property.default === 'number' ||
        typeof property.default === 'boolean'
          ? property.default
          : undefined,
    })
  }

  return { fields, supported }
}

export function validateMarketplaceMetadata(
  fields: MarketplaceMetadataField[],
  input: unknown,
): Record<string, string> {
  if (!isRecord(input)) {
    throw new Error('Marketplace metadata must be an object.')
  }

  const allowedNames = new Set(fields.map((field) => field.name))
  if (Object.keys(input).some((name) => !allowedNames.has(name))) {
    throw new Error('Marketplace metadata contains an unsupported field.')
  }

  const result: Record<string, string> = {}
  for (const field of fields) {
    const value = input[field.name] ?? field.default
    if (value === undefined || value === '') {
      if (field.required) {
        throw new Error(`The ${field.title} field is required.`)
      }
      continue
    }

    let normalized: string
    if (field.type === 'string') {
      if (typeof value !== 'string') {
        throw new Error(`${field.title} must be text.`)
      }
      normalized = value
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') {
        throw new Error(`${field.title} must be true or false.`)
      }
      normalized = String(value)
    } else {
      const numberValue =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim()
            ? Number(value)
            : Number.NaN
      if (
        !Number.isFinite(numberValue) ||
        (field.type === 'integer' && !Number.isInteger(numberValue))
      ) {
        throw new Error(`${field.title} must be a valid ${field.type}.`)
      }
      normalized = String(numberValue)
    }

    if (
      field.enum?.length &&
      !field.enum.some((entry) => String(entry) === normalized)
    ) {
      throw new Error(`${field.title} must use one of the listed values.`)
    }
    result[field.name] = normalized
  }

  return result
}
