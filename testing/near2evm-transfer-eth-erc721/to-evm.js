const BN = require('bn.js')
const crypto = require('crypto')
const bs58 = require('bs58')
const { toBuffer } = require('eth-util-lite')
const fs = require('fs')
const {
  nearAPI,
  verifyAccount,
  borshifyOutcomeProof,
  sleep,
  RobustWeb3,
  remove0x,
  normalizeEthKey,
  backoff,
  nearJsonContractFunctionCall
} = require('rainbow-bridge-utils')
const ethers = require('ethers')

let initialCmd
const txLogFilename =
  Date.now() +
  '-' +
  crypto.randomBytes(8).toString('hex') +
  '-transfer-near-nft-to-evm.log.json'

class TransferNearNft2EVM {
  static showRetryAndExit () {
    console.log('Retry with command:')
    console.log(initialCmd)
    process.exit(1)
  }

  static parseBuffer (obj) {
    for (const i in obj) {
      if (obj[i] && obj[i].type === 'Buffer') {
        obj[i] = Buffer.from(obj[i].data)
      } else if (obj[i] && typeof obj[i] === 'object') {
        obj[i] = TransferNearNft2EVM.parseBuffer(obj[i])
      }
    }
    return obj
  }

  static loadTransferLog () {
    try {
      const log = JSON.parse(fs.readFileSync(txLogFilename).toString()) || {}
      console.log('Transfer log found', log)
      return TransferNearNft2EVM.parseBuffer(log)
    } catch (e) {
      console.log("Coudn't find transfer log at ", txLogFilename)
      return {}
    }
  }

  static recordTransferLog (obj) {
    fs.writeFileSync(txLogFilename, JSON.stringify(obj))
  }

  static async lock ({
    nearNftLockerAccount,
    nearLockerContract,
    nearNftAccount,
    nearNFTMockContract,
    tokenId,
    ethReceiverAddress,
    nearSenderAccountId,
    nearSenderAccount
  }) {
    try {
      console.log()
      console.log('Call lock function on near')
      const txWithdraw = await nearJsonContractFunctionCall(
        nearNftLockerAccount,
        nearSenderAccount,
        'lock',
        {
          token_account_id: nearNftAccount,
          token_id: tokenId,
          eth_recipient: ethReceiverAddress
        },
        new BN('300000000000000'),
        new BN('1')
      )
      console.log(`tx withdraw: ${JSON.stringify(txWithdraw)}`)
      console.log(`The token id ${tokenId} was locked`)
      TransferNearNft2EVM.recordTransferLog({
        finished: 'locked',
        txWithdraw
      })
    } catch (error) {
      console.log(`Error to lock token on near: ${error}`)
    }
  }

  static async waitBlock ({
    clientContract,
    outcomeBlock,
    robustWeb3,
    nearSenderAccountId,
    nearNFTMockContract,
    amount,
    idType,
    txReceiptId
  }) {
    // Wait for the block with the given receipt/transaction in Near2EthClient.
    try {
      const outcomeBlockHeight = Number(outcomeBlock.header.height)
      let clientBlockHeight
      let clientBlockHash
      while (true) {
        const clientState = await clientContract.methods.bridgeState().call()
        clientBlockHeight = Number(clientState.currentHeight)
        const clientBlockValidAfter = Number(clientState.nextValidAt)
        clientBlockHash = bs58.encode(
          toBuffer(
            await clientContract.methods.blockHashes(clientBlockHeight).call()
          )
        )

        console.log(
          `Current light client head is: hash=${clientBlockHash}, height=${clientBlockHeight}`
        )

        if (clientBlockHeight > outcomeBlockHeight) {
          console.log(
            `The block at height ${outcomeBlockHeight} is already available to the client.`
          )
          break
        } else {
          let delay =
            clientBlockValidAfter === 0
              ? await clientContract.methods.lockDuration().call()
              : clientBlockValidAfter -
                (await robustWeb3.getBlock('latest')).timestamp
          delay = Math.max(delay, 1)
          console.log(
            `Block ${outcomeBlockHeight} is not yet available. Sleeping for ${delay} seconds.`
          )
          await sleep(delay * 1000)
        }
      }
      // console.log(`Withdrawn ${JSON.stringify(amount)}`)
      // const newBalance = await backoff(10, () =>
      //   nearTokenContract.ft_balance_of({
      //     account_id: nearSenderAccountId
      //   })
      // )
      // console.log(
      //   `Balance of ${nearSenderAccountId} after withdrawing: ${newBalance}`
      // )
      TransferNearNft2EVM.recordTransferLog({
        finished: 'wait-block',
        clientBlockHashB58: clientBlockHash,
        idType,
        txReceiptId,
        clientBlockHeight
      })
    } catch (txRevertMessage) {
      console.log('Failed to wait for block occur in near on eth contract')
      console.log(txRevertMessage.toString())
      TransferNearNft2EVM.showRetryAndExit()
    }
  }

  static async finaliseNearToEthTransfer ({
    proverContract,
    proofRes,
    clientBlockHeight,
    ethErc721BridgedAddress,
    ethReceiverAddress,
    ethMasterAccount,
    ethGasMultiplier,
    robustWeb3,
    ethFactoryContract
  }) {
    try {
      // Check that the proof is correct.
      const borshProofRes = borshifyOutcomeProof(proofRes)
      clientBlockHeight = new BN(clientBlockHeight)

      await proverContract.methods
        .proveOutcome(borshProofRes, clientBlockHeight)
        .call()

      const erc721 = new ethers.Contract(
        ethErc721BridgedAddress,
        ['function balanceOf(address owner) view returns (uint256)'],
        new ethers.providers.JsonRpcProvider(robustWeb3.ethNodeUrl)
      )
      const oldBalance = await erc721.balanceOf(ethReceiverAddress)
      console.log(
        `ERC721 balance of ${ethReceiverAddress} before the transfer: ${oldBalance}`
      )

      await robustWeb3.callContract(
        ethFactoryContract,
        'finaliseNearToEthTransfer',
        [borshProofRes, clientBlockHeight],
        {
          from: ethMasterAccount,
          gas: 5000000,
          handleRevert: true,
          gasPrice: new BN(await robustWeb3.web3.eth.getGasPrice()).mul(
            new BN(ethGasMultiplier)
          )
        }
      )

      const newBalance = await erc721.balanceOf(ethReceiverAddress)
      console.log(
        `ERC721 balance of ${ethReceiverAddress} after the transfer: ${newBalance}`
      )
    } catch (txRevertMessage) {
      console.log('Failed to unlock.')
      console.log(txRevertMessage.toString())
      TransferNearNft2EVM.showRetryAndExit()
    }
  }

  static async findLockInBlock ({ txWithdraw, nearSenderAccountId, near }) {
    try {
      let txReceiptId
      let txReceiptBlockHash
      let idType

      // Getting 1st tx
      const receipts = txWithdraw.transaction_outcome.outcome.receipt_ids
      if (receipts.length === 1) {
        txReceiptId = receipts[0]
        idType = 'receipt'
      } else {
        throw new Error(
          `Not fungible token transaction call is expected to produce only one receipt, but produced: ${JSON.stringify(
            txWithdraw
          )}`
        )
      }

      // Getting 2nd tx
      try {
        txReceiptId = txWithdraw.receipts_outcome.find(
          el => el.id === txReceiptId
        ).outcome.status.SuccessReceiptId
        txReceiptBlockHash = txWithdraw.receipts_outcome.find(
          el => el.id === txReceiptId
        ).block_hash
      } catch (e) {
        throw new Error(`Invalid tx lock: ${JSON.stringify(txWithdraw)}`, e)
      }

      // Get block in which the receipt was processed.
      const receiptBlock = await backoff(10, () =>
        near.connection.provider.block({
          blockId: txReceiptBlockHash
        })
      )
      // Now wait for a final block with a strictly greater height. This block (or one of its ancestors) should hold the outcome, although this is not guaranteed if there are multiple shards.
      const outcomeBlock = await backoff(10, async () => {
        while (true) {
          const block = await near.connection.provider.block({
            finality: 'final'
          })
          if (
            Number(block.header.height) <= Number(receiptBlock.header.height)
          ) {
            await sleep(1000)
            continue
          }
          return block
        }
      })
      TransferNearNft2EVM.recordTransferLog({
        finished: 'find-lock',
        txReceiptBlockHash,
        txReceiptId,
        outcomeBlock,
        idType
      })
    } catch (txRevertMessage) {
      console.log('Failed to find lock in block.')
      console.log(txRevertMessage.toString())
      TransferNearNft2EVM.showRetryAndExit()
    }
  }

  static async execute ({
    parent: { args },
    tokenId,
    nearSenderAccount: nearSenderAccountId,
    nearSenderSk,
    ethReceiverAddress,
    nearNodeUrl,
    nearNetworkId,
    nearNftLockerAccount,
    nearNftAccount,
    ethNodeUrl,
    ethMasterSk,
    ethClientArtifactPath,
    ethClientAddress,
    ethProverArtifactPath,
    ethProverAddress,
    ethErc721FactoryAbiPath,
    ethErc721FactoryAddress,
    ethErc721BridgedAddress,
    ethErc721BridgedAbiPath,
    ethGasMultiplier
  }) {
    initialCmd = args.join(' ')
    ethReceiverAddress = remove0x(ethReceiverAddress)

    const keyStore = new nearAPI.keyStores.InMemoryKeyStore()
    await keyStore.setKey(
      nearNetworkId,
      nearSenderAccountId,
      nearAPI.KeyPair.fromString(nearSenderSk)
    )

    const near = await nearAPI.connect({
      nodeUrl: nearNodeUrl,
      networkId: nearNetworkId,
      masterAccount: nearSenderAccountId,
      deps: { keyStore: keyStore }
    })

    await verifyAccount(near, nearSenderAccountId)

    const nearSenderAccount = new nearAPI.Account(
      near.connection,
      nearSenderAccountId
    )

    const nearLockerContract = new nearAPI.Contract(
      nearSenderAccount,
      nearNftLockerAccount,
      {
        changeMethods: ['lock'],
        viewMethods: []
      }
    )

    const nearNFTMockContract = new nearAPI.Contract(
      nearSenderAccount,
      nearNftAccount,
      {
        changeMethods: ['nft_approve'],
        viewMethods: ['nft_token']
      }
    )

    const robustWeb3 = new RobustWeb3(ethNodeUrl)
    const web3 = robustWeb3.web3
    let ethMasterAccount = web3.eth.accounts.privateKeyToAccount(
      normalizeEthKey(ethMasterSk)
    )
    web3.eth.accounts.wallet.add(ethMasterAccount)
    web3.eth.defaultAccount = ethMasterAccount.address
    ethMasterAccount = ethMasterAccount.address

    const clientContract = new web3.eth.Contract(
      JSON.parse(fs.readFileSync(ethClientArtifactPath)).abi,
      ethClientAddress,
      {
        from: ethMasterAccount,
        handleRevert: true
      }
    )
    const proverContract = new web3.eth.Contract(
      JSON.parse(fs.readFileSync(ethProverArtifactPath)).abi,
      ethProverAddress,
      {
        from: ethMasterAccount,
        handleRevert: true
      }
    )
    const ethFactoryContract = new web3.eth.Contract(
      JSON.parse(fs.readFileSync(ethErc721FactoryAbiPath)),
      ethErc721FactoryAddress,
      {
        from: ethMasterAccount,
        handleRevert: true
      }
    )
    console.log('---------------------LOCK-----------------------')
    let transferLog = TransferNearNft2EVM.loadTransferLog()
    if (transferLog.finished === undefined) {
      await TransferNearNft2EVM.lock({
        nearNftLockerAccount,
        nearLockerContract,
        nearNftAccount,
        nearNFTMockContract,
        tokenId,
        ethReceiverAddress,
        nearSenderAccountId,
        nearSenderAccount
      })
      transferLog = TransferNearNft2EVM.loadTransferLog()
    }
    console.log('---------------------findLockInBlock-----------------------')

    if (transferLog.finished === 'locked') {
      await TransferNearNft2EVM.findLockInBlock({
        txWithdraw: transferLog.txWithdraw,
        nearSenderAccountId,
        near
      })
      transferLog = TransferNearNft2EVM.loadTransferLog()
    }
    console.log('---------------------waitBlock-----------------------')

    if (transferLog.finished === 'find-lock') {
      await TransferNearNft2EVM.waitBlock({
        clientContract,
        robustWeb3,
        outcomeBlock: transferLog.outcomeBlock,
        nearSenderAccountId,
        nearNFTMockContract,
        tokenId,
        idType: transferLog.idType,
        txReceiptId: transferLog.txReceiptId
      })
      transferLog = TransferNearNft2EVM.loadTransferLog()
    }
    console.log('---------------------getProof-----------------------')

    if (transferLog.finished === 'wait-block') {
      await TransferNearNft2EVM.getProof({
        idType: transferLog.idType,
        near,
        txReceiptId: transferLog.txReceiptId,
        nearSenderAccountId,
        clientBlockHashB58: transferLog.clientBlockHashB58,
        clientBlockHeight: transferLog.clientBlockHeight
      })
      transferLog = TransferNearNft2EVM.loadTransferLog()
    }
    console.log(
      '---------------------finaliseNearToEthTransfer-----------------------'
    )

    if (transferLog.finished === 'get-proof') {
      await TransferNearNft2EVM.finaliseNearToEthTransfer({
        proverContract,
        proofRes: transferLog.proofRes,
        clientBlockHeight: transferLog.clientBlockHeight,
        ethErc721BridgedAddress,
        ethReceiverAddress,
        ethMasterAccount,
        ethGasMultiplier,
        robustWeb3,
        ethFactoryContract
      })
    }
  }
}

exports.TransferNearNft2EVM = TransferNearNft2EVM
