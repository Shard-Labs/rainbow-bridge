const {
  nearAPI,
  maybeCreateAccount,
  verifyAccount
} = require('rainbow-bridge-utils')
const { BN } = require('ethereumjs-util')
const { DeployNFT } = require('rainbow-bridge-testing')

class InitNearNFTFactory {
  static async execute ({
    nearMasterAccount,
    nearMasterSk,
    nearNftFactoryAccount,
    nearNftFactorySk,
    nearNftFactoryContractPath,
    nearNftFactoryInitBalance,
    nearProverAccount,
    nearNodeUrl,
    nearNetworkId,
    ethNftLockerAddress,
    ethErc721Address
  }) {
    if (!nearNftFactorySk) {
      console.log(
        'Secret key for no fungible token is not specified. Reusing master secret key.'
      )
      nearNftFactorySk = nearMasterSk
    }
    const nearNftFactoryPk = nearAPI.KeyPair.fromString(nearNftFactorySk).getPublicKey()

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
    console.log('Deploying nft contract.')
    await maybeCreateAccount(
      near,
      nearMasterAccount,
      nearNftFactoryAccount,
      nearNftFactoryPk,
      nearNftFactoryInitBalance,
      nearNftFactoryContractPath
    )
    const tokenFactoryContract = new nearAPI.Contract(
      new nearAPI.Account(near.connection, nearNftFactoryAccount),
      nearNftFactoryAccount,
      {
        changeMethods: ['new', 'deploy_bridge_token'],
        viewMethods: ['get_nft_token_account_id']
      }
    )

    console.log('prover_account:', nearProverAccount)
    console.log('locker_address:', ethNftLockerAddress)

    try {
      // Try initializing the factory.
      await tokenFactoryContract.new(
        {
          prover_account: nearProverAccount,
          locker_address: ethNftLockerAddress.startsWith('0x')
            ? ethNftLockerAddress.substr(2)
            : ethNftLockerAddress
        },
        new BN('300000000000000')
      )
    } catch (err) {
      console.log(`Failed to initialize the nft factory ${err}`)
      process.exit(1)
    }

    const deployedNftInfo = await DeployNFT.execute({
      nftName: 'erc721',
      ethErc721Address,
      nearNodeUrl,
      nearNetworkId,
      nearMasterAccount,
      nearMasterSk,
      nearNftFactoryAccount,
      nearNftFactorySk
    })

    if (!deployedNftInfo) {
      return null
    }
    const {
      nearNftAccount,
      ethNftAddress,
      ...otherDeployedNftInfo
    } = deployedNftInfo
    return {
      nearErc721Account: nearNftAccount,
      ethErc721Address: ethNftAddress,
      ...otherDeployedNftInfo
    }
  }
}

exports.InitNearNFTFactory = InitNearNFTFactory
