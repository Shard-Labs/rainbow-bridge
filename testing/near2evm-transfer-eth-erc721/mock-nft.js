const {
  nearAPI,
  verifyAccount
} = require('rainbow-bridge-utils')
const BN = require('bn.js')

class MockNFT {
  static async execute ({
    tokenId,
    action,
    nearRecipientAccount,
    nearNetworkId,
    nearMasterAccount,
    nearMasterSk,
    nearNodeUrl,
    nearNftAccount
  }) {
    const nearSenderAccountId = nearMasterAccount
    let nearSenderSK

    if (!nearSenderSK) {
      nearSenderSK = nearMasterSk
    }

    const keyStore = new nearAPI.keyStores.InMemoryKeyStore()
    await keyStore.setKey(
      nearNetworkId,
      nearMasterAccount,
      nearAPI.KeyPair.fromString(nearMasterSk)
    )

    await keyStore.setKey(
      nearNetworkId,
      nearSenderAccountId,
      nearAPI.KeyPair.fromString(nearSenderSK)
    )

    const near = await nearAPI.connect({
      nodeUrl: nearNodeUrl,
      networkId: nearNetworkId,
      masterAccount: nearSenderAccountId,
      deps: {
        keyStore: keyStore
      }
    })

    const nearMAccount = new nearAPI.Account(near.connection, nearMasterAccount)
    await verifyAccount(near, nearMasterAccount)

    const nearNftContract = new nearAPI.Contract(nearMAccount, nearNftAccount, {
      viewMethods: ['nft_token'],
      changeMethods: ['nft_mint', 'nft_approve']
    })

    if (action === 'add') {
      try {
        await nearNftContract.nft_mint(
          {
            token_id: tokenId,
            receiver_id: nearMasterAccount
          },
          new BN('300000000000000'),
          new BN('6000000000000000000000000')
        )
        console.log(`Token id ${tokenId} created.`)
      } catch (error) {
        console.log(error)
      }
    } else if (action === 'get') {
      const token = await nearNftContract.nft_token({
        token_id: tokenId
      })
      console.log('Token:', token)
    } else if (action === 'approve') {
      await nearNftContract.nft_approve(
        {
          token_id: tokenId,
          account_id: nearRecipientAccount
        },
        new BN('300000000000000'),
        new BN('6000000000000000000000000')
      )
      console.log(`Token id ${tokenId} was approved to ${nearRecipientAccount}`)
    }
    return {
      nearSenderAccountId
    }
  }
}

exports.MockNFT = MockNFT
