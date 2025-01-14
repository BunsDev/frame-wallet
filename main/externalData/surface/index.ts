import log from 'electron-log'
import createPylon, { Unsubscribable } from '@framelabs/pylon-api-client'
import { formatUnits } from 'ethers/lib/utils'

import Networks from './networks'
import { handleBalanceUpdate } from '../balances/processor'
import { updateCollections, updateItems } from '../inventory/processor'

import type {
  Inventory,
  InventoryAsset,
  InventoryCollection,
  Media,
  TokenBalance
} from '../../store/state/types'

type Subscription = Unsubscribable & { unsubscribables: Unsubscribable[]; collectionItems: CollectionItem[] }

type ItemCollection = {
  contract: string
  chainId: number
  name: string
  description: string
  media: Media
  hideByDefault: boolean
}

type CollectionMetdata = ItemCollection & {
  ownedItems: string[]
}

type BalanceItem = {
  contract: string
  media: Media
  name: string
  symbol: string
  chainId: number
  decimals: number
  amount: string
  hideByDefault: boolean
}

interface CollectionItem {
  link: string
  chainId: number
  contract: string
  tokenId: string
  name: string
  media: Media
  description: string
}

const toMeta = (collection: CollectionMetdata) => ({
  name: collection.name,
  description: collection.description,
  media: collection.media,
  chainId: collection.chainId,
  external_url: '',
  tokens: collection.ownedItems,
  hideByDefault: collection.hideByDefault
})

const toInventoryCollection = (collection: CollectionMetdata) => ({
  meta: toMeta(collection),
  items: []
})

const toTokenBalance = (b: BalanceItem) => ({
  address: b.contract.toLowerCase(),
  chainId: b.chainId,
  name: b.name || '',
  symbol: b.symbol,
  balance: b.amount,
  decimals: b.decimals || 18,
  displayBalance: formatUnits(b.amount, b.decimals),
  media: b.media,
  hideByDefault: b.hideByDefault
})

const toInventoryAsset = (item: CollectionItem): InventoryAsset => ({
  name: item.name,
  tokenId: item.tokenId,
  media: item.media || {},
  contract: item.contract,
  ...(item.link && { externalLink: item.link })
})

const Surface = () => {
  const Pylon = createPylon('wss://api.pylon.link')
  const subscriptions: Record<string, Subscription> = {}
  const networks = Networks()

  const subscribe = async (addr: string) => {
    const address = addr.toLowerCase()

    log.debug('Subscribing to Pylon data', { address })

    const fallback = setTimeout(() => {
      log.warn('Failed to get data from Pylon, falling back to scan', { address })

      networks.update(address, [])
    }, 5_000)

    const onStopped = () => {
      log.verbose(`Subscription to ${address} stopped`)

      networks.update(address, [])
      delete subscriptions[address]
    }

    const onError = (err: Error) => {
      log.error(`Received error for subscription to ${address}`, err)
    }

    const sub = Pylon.accounts.subscribe(address, {
      onStarted() {
        log.debug('Subscribed to Pylon data', { address })
      },
      onData: (data) => {
        if (!data.length || !data[0]) return

        const [{ chainData: chains }] = data
        log.debug(`Got update from Pylon surface for account ${address}`, { chains })
        clearTimeout(fallback)

        const chainIds: number[] = []
        const balances: TokenBalance[] = []
        const inventory: Inventory = {}

        Object.entries(chains).forEach(([chainId, chain]) => {
          if (!chain) {
            log.verbose(`Missing data for chain ${chainId}`, { address })
            return
          }

          const { balances: chainBalances, inventory: chainInventory } = chain
          if (chainBalances) {
            log.debug(`Balances for chain ${chainId}`, { balances: Object.keys(chainBalances).length })
            chainIds.push(Number(chainId))
            Object.values(chainBalances).forEach((balance) => balances.push(toTokenBalance(balance)))
          }

          if (chainInventory) {
            Object.entries(chainInventory).forEach(([collection, inventoryData]) => {
              if (inventoryData) {
                inventory[collection.toLowerCase()] = toInventoryCollection(inventoryData)
              }
            })
          }
        })

        handleBalanceUpdate(address, balances, chainIds, 'snapshot')
        updateCollections(address, inventory)
        networks.update(address, chainIds)
      },
      onError,
      onStopped
    })

    subscriptions[address] = { ...sub, unsubscribables: [], collectionItems: [] }
  }

  const unsubscribe = async (address: string) => {
    log.verbose('Unsubscribing from Pylon data', { address })

    const subscription = subscriptions[address]
    if (!subscription) return

    subscription.unsubscribables.forEach((u) => u.unsubscribe())
    subscription.unsubscribe()
    delete subscriptions[address]
    networks.update(address, [])
  }

  const stop = () => {
    Object.keys(subscriptions).forEach((address) => {
      unsubscribe(address)
    })
  }

  const close = () => {
    networks.close()
  }

  const updateSubscribers = (addresses: string[]) => {
    const removed = Object.keys(subscriptions).filter((address) => !addresses.includes(address))
    const added = addresses.filter((address) => !subscriptions[address])

    log.verbose('Updating surface subscribers', { addresses, added, removed })

    removed.forEach(unsubscribe)
    added.forEach(subscribe)
  }

  const subscribeToItems = (addr: string, items: CollectionItem[]) => {
    const account = addr.toLowerCase()

    if (!subscriptions[account]) return

    const sub = Pylon.items.subscribe(items, {
      onStarted() {
        log.debug(`Created subscription to items`, { account, items })
      },
      onData: (data) => {
        log.debug('Received update for items', { account })

        if (!data.length) return
        const assets = data.map(toInventoryAsset)
        updateItems(account, assets)
      },
      onError: (err) => {
        log.error('Error subscribing to items', { account, items, err })
      }
    })

    subscriptions[account].unsubscribables.push(sub)
    subscriptions[account].collectionItems.push(...items)
  }

  setInterval(() => {
    const subscribers = Object.entries(subscriptions).map(([address, { collectionItems }]) => ({
      collectionItems,
      address
    }))

    if (!subscribers.length) return

    Object.keys(subscriptions).forEach(unsubscribe)
    subscribers.forEach(({ address, collectionItems }) => {
      subscribe(address)

      if (collectionItems.length > 0) {
        subscribeToItems(address, collectionItems)
      }
    })
  }, 1000 * 60 * 4)

  return {
    stop,
    updateSubscribers,
    networks,
    close,
    subscribeToItems
  }
}

const surface = Surface()
export default surface
