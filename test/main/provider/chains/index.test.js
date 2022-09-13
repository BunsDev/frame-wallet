import { createChainsObserver, createOriginChainObserver, getActiveChains } from '../../../../main/provider/chains'
import store from '../../../../main/store'

jest.mock('../../../../main/store', () => jest.fn())

const ether = {
  name: 'Ether',
  symbol: 'ETH',
  icon: 'https://assets.coingecko.com/coins/images/ethereum.png',
  decimals: 18
}

const chains = {
  '1': {
    name: 'Ethereum Mainnet',
    id: 1,
    explorer: 'https://etherscan.io',
    on: true
  },
  '4': {
    name: 'Ethereum Testnet Rinkeby',
    id: 4,
    explorer: 'https://rinkeby.etherscan.io',
    on: true
  },
  '137': {
    name: 'Polygon',
    id: 137,
    on: false
  }
}

const chainMeta = {
  '1': {
    nativeCurrency: ether
  },
  '4': {
    nativeCurrency: {
      ...ether, name: 'Rinkeby Ether'
    }
  },
  '137': { nativeCurrency: {} }
}

beforeEach(() => {
  setChains(chains, chainMeta)
})

describe('#getActiveChains', () => {
  it('returns all chains that are active', () => {
    expect(getActiveChains().map(chain => chain.chainId)).toEqual([1, 4])
  })

  it('returns an EVM chain object', () => {
    const mainnet = getActiveChains().find(chain => chain.chainId === 1)

    expect(mainnet).toStrictEqual({
      chainId: 1,
      networkId: 1,
      name: 'Ethereum Mainnet',
      icon: [{ url: 'https://assets.coingecko.com/coins/images/ethereum.png' }],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      explorers: [{
        url: 'https://etherscan.io'
      }]
    })
  })
})

describe('#createChainsObserver', () => {
  const handler = { chainsChanged: jest.fn() }
  let observer

  beforeEach(() => {
    observer = createChainsObserver(handler)

    handler.chainsChanged = jest.fn()
  })

  it('invokes the handler with EVM chain objects', () => {
    const optimism = { name: 'Optimism', id: 10, explorer: 'https://optimistic.etherscan.io', on: true }

    setChains({ ...chains, '10': optimism}, { ...chainMeta, '10': { nativeCurrency: ether }})

    observer()

    expect(handler.chainsChanged).toHaveBeenCalledWith([
      {
        chainId: 1,
        networkId: 1,
        name: 'Ethereum Mainnet',
        icon: [{ url: 'https://assets.coingecko.com/coins/images/ethereum.png' }],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        },
        explorers: [{
          url: 'https://etherscan.io'
        }]
      }, {
        chainId: 4,
        networkId: 4,
        name: 'Ethereum Testnet Rinkeby',
        icon: [{ url: 'https://assets.coingecko.com/coins/images/ethereum.png' }],
        nativeCurrency: {
          name: 'Rinkeby Ether',
          symbol: 'ETH',
          decimals: 18
        },
        explorers: [{
          url: 'https://rinkeby.etherscan.io'
        }]
      }, {
        chainId: 10,
        networkId: 10,
        name: 'Optimism',
        icon: [{ url: 'https://assets.coingecko.com/coins/images/ethereum.png' }],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        },
        explorers: [{
          url: 'https://optimistic.etherscan.io'
        }]
      }])
  })

  it('invokes the handler when a chain is added', () => {
    const optimism = { name: 'Optimism', id: 10, explorer: 'https://optimistic.etherscan.io', on: true }

    setChains({ ...chains, '10': optimism}, { ...chainMeta, '10': { nativeCurrency: ether }})

    observer()

    const changedChains = handler.chainsChanged.mock.calls[0][0]
    expect(changedChains.map(c => c.chainId)).toEqual([1, 4, 10])
  })
  
  it('invokes the handler when a chain is removed', () => {
    const { '4': rinkeby, ...remaining } = chains
    setChains(remaining)

    observer()

    const changedChains = handler.chainsChanged.mock.calls[0][0]
    expect(changedChains.map(c => c.chainId)).toEqual([1])
  })
  
  it('invokes the handler when a chain is activated', () => {
    const { '137': { ...polygon } } = chains
    polygon.on = true

    setChains({ ...chains, '137': polygon })

    observer()

    const changedChains = handler.chainsChanged.mock.calls[0][0]
    expect(changedChains.map(c => c.chainId)).toEqual([1, 4, 137])
  })
  
  it('invokes the handler when a chain is deactivated', () => {
    const { '4': { ...rinkeby } } = chains
    rinkeby.on = false

    setChains({ ...chains, '4': rinkeby })

    observer()

    const changedChains = handler.chainsChanged.mock.calls[0][0]
    expect(changedChains.map(c => c.chainId)).toEqual([1])
  })
  
  it('invokes the handler when a chain name changes', () => {
    const { '4': { ...rinkeby } } = chains
    rinkeby.name = 'Rink-a-Bee'

    setChains({ ...chains, '4': rinkeby })

    observer()

    const changedChains = handler.chainsChanged.mock.calls[0][0]
    expect(changedChains.map(c => c.chainId)).toEqual([1, 4])
  })

  it('does not invoke the handler when no chains have changed', () => {
    observer()

    expect(handler.chainsChanged).not.toHaveBeenCalled()
  })
})

describe('#createOriginChainObserver', () => {
  const handler = { chainChanged: jest.fn(), networkChanged: jest.fn() }
  let observer

  const originId = '8073729a-5e59-53b7-9e69-5d9bcff94087'
  const frameTestOrigin = {
    name: 'test.frame',
    chain: { id: 137, type: 'ethereum' }
  }

  beforeEach(() => {
    setOrigins({ [originId]: frameTestOrigin })

    observer = createOriginChainObserver(handler)

    handler.chainChanged = jest.fn()
    handler.networkChanged = jest.fn()

    // invoke the observer once in order to set the known origins
    observer()
  })

  it('invokes the handler when the chain has changed for a known origin', () => {
    const updatedOrigin = { ...frameTestOrigin, chain: { ...frameTestOrigin.chain, id: 42161 } }
    setOrigins({ [originId]: updatedOrigin })

    observer()

    expect(handler.chainChanged).toHaveBeenCalledWith(42161, originId)
    expect(handler.networkChanged).toHaveBeenCalledWith(42161, originId)
  })

  it('does not invoke the handler the first time an origin is seen', () => {
    const newOrigin = { name: 'send.eth', chain: { type: 'ethereum', id: 4 } }
    setOrigins({ 'some-id': newOrigin })

    observer()

    expect(handler.chainChanged).not.toHaveBeenCalled()
    expect(handler.networkChanged).not.toHaveBeenCalled()
  })
})

// helper functions

function setChains (chainState, chainMetaState = chainMeta) {
  store.mockImplementation(node => {
    if (node === 'main.networks.ethereum') {
      return chainState
    }

    if (node === 'main.networksMeta.ethereum') {
      return chainMetaState
    }

    throw new Error('unexpected store access!')
  })
}

function setOrigins (originState) {
  store.mockImplementation(node => {
    expect(node).toBe('main.origins')
    return originState
  })
}