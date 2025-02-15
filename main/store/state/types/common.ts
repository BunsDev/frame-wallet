import { z } from 'zod'

const prefixedHexRegex = new RegExp('^0x[a-fA-F0-9]+$')
const addressRegex = new RegExp('^0x[a-fA-F0-9]{40}$')

export const ChainIdSchema = z.coerce.number()
export const AddressSchema = z.string().regex(addressRegex)
export const HexStringSchema = z.string().regex(prefixedHexRegex)

export type HexString = z.infer<typeof HexStringSchema>
