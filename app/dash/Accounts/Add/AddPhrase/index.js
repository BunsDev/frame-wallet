import React from 'react'

import { AddHotAccount } from '../Components'
import { utils } from 'ethers'

export default function AddPhrase({ accountData }) {
  return (
    <AddHotAccount
      {...{
        title: 'Seed Phrase',
        summary: 'A phrase account uses a list of words to backup and restore your account',
        svgName: 'seedling',
        intro: 'Add Phrase Account',
        accountData,
        createSignerMethod: 'createFromPhrase',
        newAccountType: 'seed',
        isValidSecret: utils.isValidMnemonic
      }}
    />
  )
}