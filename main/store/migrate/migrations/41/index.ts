import { z } from 'zod'

import { v38 as ChainsSchema } from '../../../state/types/chains'
import { v37 as ChainMetaSchema } from '../../../state/types/chainMeta'

function baseMainnet() {
  const chain = {
    id: 8453,
    type: 'ethereum',
    layer: 'rollup',
    isTestnet: false,
    name: 'Base',
    explorer: 'https://basescan.org',
    connection: {
      primary: {
        on: true,
        current: 'pylon',
        status: 'loading',
        connected: false,
        custom: ''
      },
      secondary: {
        on: false,
        current: 'custom',
        status: 'loading',
        connected: false,
        custom: ''
      }
    },
    on: false
  } as const

  const metadata = {
    blockHeight: 0,
    gas: {
      fees: null,
      price: {
        selected: 'standard',
        levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
      }
    },
    nativeCurrency: {
      symbol: 'ETH',
      usd: {
        price: 0,
        change24hr: 0
      },
      icon: '',
      name: 'Ether',
      decimals: 18
    },
    icon: 'https://frame.nyc3.cdn.digitaloceanspaces.com/baseiconcolor.png',
    primaryColor: 'accent8' // Base
  } as const

  return { chain, metadata }
}

const StateSchema = z
  .object({
    main: z
      .object({
        networks: ChainsSchema,
        networksMeta: ChainMetaSchema
      })
      .passthrough()
  })
  .passthrough()

const migrate = (initial: unknown) => {
  const state = StateSchema.parse(initial)
  const usingBase = '8453' in state.main.networks.ethereum

  if (!usingBase) {
    const { chain, metadata } = baseMainnet()
    state.main.networks.ethereum[8453] = chain
    state.main.networksMeta.ethereum[8453] = metadata
  }

  return state
}

export default {
  version: 41,
  migrate
}
