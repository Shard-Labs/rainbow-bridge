const {
  nearAPI,
  maybeCreateAccount,
  verifyAccount
} = require('rainbow-bridge-utils')

class DeployNearNFTContract {
  static async execute ({
    nearNetworkId,
    nearMasterAccount,
    nearMasterSk,
    nearNodeUrl,
    nearNftAccount,
    nearNftSk,
    nearClientInitBalance,
    nearNftContractPath
  }) {
    if (!nearNftSk) {
      console.log(
        'Key to call Near NFT contract is not specified. Reusing master key.'
      )
      nearNftSk = nearMasterSk
    }
    const nearNftPk = nearAPI.KeyPair.fromString(nearNftSk).getPublicKey()

    const keyStore = new nearAPI.keyStores.InMemoryKeyStore()
    await keyStore.setKey(
      nearNetworkId,
      nearMasterAccount,
      nearAPI.KeyPair.fromString(nearMasterSk)
    )

    await keyStore.setKey(
      nearNetworkId,
      nearNftAccount,
      nearAPI.KeyPair.fromString(nearNftSk)
    )

    const near = await nearAPI.connect({
      nodeUrl: nearNodeUrl,
      networkId: nearNetworkId,
      masterAccount: nearMasterAccount,
      deps: {
        keyStore: keyStore
      }
    })

    console.log('Creating accounts and deploying the contracts.')
    await verifyAccount(near, nearMasterAccount)
    await maybeCreateAccount(
      near,
      nearMasterAccount,
      nearNftAccount,
      nearNftPk,
      nearClientInitBalance,
      nearNftContractPath
    )
    await verifyAccount(near, nearNftAccount)

    const nearMAccount = new nearAPI.Account(near.connection, nearMasterAccount)
    const nearNftContract = new nearAPI.Contract(nearMAccount, nearNftAccount, {
      viewMethods: [],
      changeMethods: ['new']
    })

    try {
      await nearNftContract.new({})
    } catch (e) {
      console.log('Error')
    }

    console.log('Contract deployed!!')
    return {
      nearNftAccount
    }
  }
}

exports.DeployNearNFTContract = DeployNearNFTContract
