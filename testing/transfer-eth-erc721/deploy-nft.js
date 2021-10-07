const {
  nearAPI,
  remove0x,
  verifyAccount
} = require('rainbow-bridge-utils')
const { BN } = require('ethereumjs-util')

class DeployNFT {
  static async execute ({
    nftName,
    ethErc721Address,
    nearNodeUrl,
    nearNetworkId,
    nearMasterAccount,
    nearMasterSk,
    nearNftFactoryAccount,
    nearNftFactorySk
  }) {
    // use init near instead
    if (!nearNftFactorySk) {
      console.log(
        'Secret key for not fungible token is not specified. Reusing master secret key.'
      )
      nearNftFactorySk = nearMasterSk
    }

    const keyStore = new nearAPI.keyStores.InMemoryKeyStore()
    await keyStore.setKey(
      nearNetworkId,
      nearMasterAccount,
      nearAPI.KeyPair.fromString(nearMasterSk)
    )
    await keyStore.setKey(
      nearNetworkId,
      nearNftFactoryAccount,
      nearAPI.KeyPair.fromString(nearNftFactorySk)
    )
    const near = await nearAPI.connect({
      nodeUrl: nearNodeUrl,
      networkId: nearNetworkId,
      masterAccount: nearMasterAccount,
      deps: { keyStore: keyStore }
    })

    await verifyAccount(near, nearMasterAccount)
    await verifyAccount(near, nearNftFactoryAccount)

    console.log('Adding nft ' + nftName + ' at ' + ethErc721Address)

    const nftFactoryContract = new nearAPI.Contract(
      new nearAPI.Account(near.connection, nearNftFactoryAccount),
      nearNftFactoryAccount,
      {
        changeMethods: ['deploy_bridge_token'],
        viewMethods: ['get_nft_token_account_id']
      }
    )

    try {
      // Try initializing the contract.
      await nftFactoryContract.deploy_bridge_token(
        {
          address: remove0x(ethErc721Address)
        },
        // TODO update
        new BN('300000000000000'),
        new BN('5000000000000000000000000')
      )
    } catch (err) {
      console.log(
          `Failed to initialize the token ${nftName} contract: ${err}`
      )
      process.exit(1)
    }
    console.log(`${nftName} deployed`)

    return {
      nearNftFactorySk,
      nearNftAccount: remove0x(ethErc721Address) + '.' + nearNftFactoryAccount,
      ethErc721Address
    }
  }
}

module.exports = { DeployNFT }
