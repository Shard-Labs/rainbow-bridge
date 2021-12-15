const { BN } = require('ethereumjs-util')
const {
  nearAPI,
  maybeCreateAccount,
  verifyAccount
} = require('rainbow-bridge-utils')

class InitNearNftLocker {
  static async execute ({
    nearNodeUrl,
    nearNetworkId,
    nearMasterAccount,
    nearMasterSk,
    nearProverAccount,
    nearNftLockerAccount,
    nearNftLockerSk,
    nearNftLockerContractPath,
    nearNftLockerInitBalance,
    ethErc721FactoryAddress
  }) {
    if (!nearNftLockerSk) {
      console.log(
        'Secret key for fungible token is not specified. Reusing master secret key.'
      )
      nearNftLockerSk = nearMasterSk
    }
    const nearNftLockerPk = nearAPI.KeyPair.fromString(
      nearNftLockerSk
    ).getPublicKey()

    const keyStore = new nearAPI.keyStores.InMemoryKeyStore()
    await keyStore.setKey(
      nearNetworkId,
      nearMasterAccount,
      nearAPI.KeyPair.fromString(nearMasterSk)
    )
    await keyStore.setKey(
      nearNetworkId,
      nearNftLockerAccount,
      nearAPI.KeyPair.fromString(nearNftLockerSk)
    )
    const near = await nearAPI.connect({
      nodeUrl: nearNodeUrl,
      networkId: nearNetworkId,
      masterAccount: nearMasterAccount,
      deps: { keyStore: keyStore }
    })

    await verifyAccount(near, nearMasterAccount)
    console.log('Deploying token contract.')
    await maybeCreateAccount(
      near,
      nearMasterAccount,
      nearNftLockerAccount,
      nearNftLockerPk,
      nearNftLockerInitBalance,
      nearNftLockerContractPath
    )
    const lockerContract = new nearAPI.Contract(
      new nearAPI.Account(near.connection, nearNftLockerAccount),
      nearNftLockerAccount,
      {
        changeMethods: ['new'],
        viewMethods: []
      }
    )

    try {
      // Try initializing the factory.
      await lockerContract.new(
        {
          eth_factory_address: ethErc721FactoryAddress.startsWith('0x')
            ? ethErc721FactoryAddress.substr(2)
            : ethErc721FactoryAddress,
          prover_account: nearProverAccount
        },
        new BN('300000000000000')
      )
    } catch (err) {
      console.log(`Failed to initialize the nft locker ${err}`)
      process.exit(1)
    }

    return {
      nearNftLockerAccount
    }
  }
}

exports.InitNearNftLocker = InitNearNftLocker
