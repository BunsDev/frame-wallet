import React from 'react'
import styled from 'styled-components'

import { DisplayFiatPrice, DisplayValue } from '../../../../../resources/Components/DisplayValue'
import RingIcon from '../../../../../resources/Components/RingIcon'
import useStore from '../../../../../resources/Hooks/useStore'
import { NATIVE_CURRENCY } from '../../../../../resources/constants'
import { chainUsesEth } from '../../../../../resources/utils/chains'

const displayName = (name = '') => (name.length > 24 ? name.slice(0, 22) + '..' : name)

const AccountOverlay = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.02;
  pointer-events: none;
  background: ${({ color }) => `linear-gradient(90deg, transparent 0%, ${color} 20%, transparent 100%)`};
`

const displayChain = (name = '') => {
  if (name.length > 14) {
    return name.slice(0, 12).trim() + '..'
  }
  return name
}

const Balance = ({ symbol = '', balance, i, scanning, chainId, address }) => {
  const isNative = address === NATIVE_CURRENCY

  const chain = useStore('main.networks.ethereum', chainId)
  const chainColor = useStore('main.networksMeta.ethereum', chainId, 'primaryColor')

  const customTokens = useStore('main.tokens.custom')
  const isCustom = customTokens.some((token) => token.chainId === chainId && token.address === address)

  const displaySymbol = symbol.substring(0, 10)
  const {
    media = { source: '', cdn: {} }, //This is necessary as CurrencyBalances populated by the scanner do not have media...
    priceChange,
    decimals,
    balance: balanceValue,
    usdRate: currencyRate
  } = balance

  const change = parseFloat(priceChange)
  const direction = change < 0 ? -1 : change > 0 ? 1 : 0
  let priceChangeClass = `signerBalanceCurrentPriceChange ${
    direction === 1
      ? 'signerBalanceCurrentPriceChangeUp'
      : direction === -1
      ? 'signerBalanceCurrentPriceChangeDown'
      : ''
  }`
  let name = balance.name
  if (name.length > 21) name = name.substr(0, 19) + '..'

  const displayPriceChange = () => (priceChange ? `(${direction === 1 ? '+' : ''}${priceChange}%)` : '')

  const { name: chainName = '', isTestnet = false } = chain
  const isEth = isNative && chainUsesEth(chainId)

  return (
    <div className={'signerBalance'} key={symbol}>
      {scanning && <div className='signerBalanceLoading' style={{ animationDelay: `${0.15 * i}s` }} />}
      <div className='signerBalanceInner' style={{ opacity: !scanning ? 1 : 0 }}>
        <AccountOverlay color={chainColor ? `var(--${chainColor})` : ''} />
        <div className='signerBalanceIcon'>
          <RingIcon
            thumb={true}
            frozen={isCustom ? false : true}
            media={!isEth && media}
            svgName={isEth && 'eth'}
            alt={symbol.toUpperCase()}
            color={chainColor ? `var(--${chainColor})` : ''}
          />
        </div>
        <div className='signerBalanceChain'>
          <span style={{ color: chainColor ? `var(--${chainColor})` : '' }}>{displayChain(chainName)}</span>
          <span>{displayName(name)}</span>
        </div>
        <div className='signerBalanceMain'>
          <div style={{ letterSpacing: '1px' }}>{displaySymbol}</div>
          <div className='signerBalanceCurrencyLine' />
          <div>
            <DisplayValue type='ether' value={balanceValue} valueDataParams={{ decimals }} />
          </div>
        </div>
        <div className='signerBalancePrice'>
          <div className='signerBalanceOk'>
            <span className='signerBalanceCurrentPrice'>
              <DisplayFiatPrice decimals={decimals} currencyRate={currencyRate} isTestnet={isTestnet} />
            </span>
            <span className={priceChangeClass}>
              <span>{displayPriceChange()}</span>
            </span>
          </div>
          <DisplayValue
            type='fiat'
            value={balanceValue}
            valueDataParams={{ decimals, currencyRate, isTestnet }}
            currencySymbol='$'
            displayDecimals={false}
          />
        </div>
      </div>
    </div>
  )
}

export default Balance
