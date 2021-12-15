const BN = require('bn.js')
const fs = require('fs')
const { Web3, normalizeEthKey } = require('rainbow-bridge-utils')
const { InitEthNftFactory } = require('./eth-contracts')

class DeployEthNftFactory {
  static async execute ({
    ethNodeUrl,
    ethMasterSk,
    nearNftLockerAccount,
    nearNftAccount,
    ethProverAddress,
    ethErc721FactoryBinPath,
    ethErc721FactoryAbiPath,
    ethAdminAddress,
    ethGasMultiplier
  }) {
    const { ethErc721FactoryAddress } = await InitEthNftFactory.execute({
      ethNodeUrl,
      ethMasterSk,
      nearNftLockerAccount,
      ethProverAddress,
      ethErc721FactoryBinPath,
      ethErc721FactoryAbiPath,
      ethAdminAddress,
      ethGasMultiplier
    })

    const web3 = new Web3(ethNodeUrl)
    let ethMasterAccount = web3.eth.accounts.privateKeyToAccount(
      normalizeEthKey(ethMasterSk)
    )
    web3.eth.accounts.wallet.add(ethMasterAccount)
    web3.eth.defaultAccount = ethMasterAccount.address
    ethMasterAccount = ethMasterAccount.address

    const abi = JSON.parse(fs.readFileSync(ethErc721FactoryAbiPath))
    const ethNftFactoryContract = new web3.eth.Contract(
      abi,
      ethErc721FactoryAddress
    )

    console.log(
      `Deploy new erc721 contract, with near account id ${nearNftAccount}`
    )
    await ethNftFactoryContract.methods
      .deployBridgedToken(nearNftAccount)
      .send({
        from: ethMasterAccount,
        gas: 5000000,
        gasPrice: new BN(await web3.eth.getGasPrice()).mul(
          new BN(ethGasMultiplier)
        )
      })
    console.log(`Contract deployed, near account id ${nearNftAccount}`)

    const ethErc721BridgedAddress = await ethNftFactoryContract.methods
      .bridgedNFTs(nearNftAccount)
      .call({
        from: ethMasterAccount,
        gas: 5000000,
        gasPrice: new BN(await web3.eth.getGasPrice()).mul(
          new BN(ethGasMultiplier)
        )
      })
    return {
      ethErc721FactoryAddress,
      ethErc721BridgedAddress
    }
  }
}

exports.DeployEthNftFactory = DeployEthNftFactory
