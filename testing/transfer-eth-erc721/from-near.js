const BN = require('bn.js')
const fs = require('fs')
const bs58 = require('bs58')
const crypto = require('crypto')
const { toBuffer } = require('eth-util-lite')
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
const { NearMintableNft } = require('./near-mintable-nft')

let initialCmd
const txLogFilename =
  Date.now() +
  '-' +
  crypto.randomBytes(8).toString('hex') +
  '-transfer-eth-erc721-from-near.log.json'

class TransferEthERC721FromNear {
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
        obj[i] = TransferEthERC721FromNear.parseBuffer(obj[i])
      }
    }
    return obj
  }

  static loadTransferLog () {
    try {
      const log = JSON.parse(fs.readFileSync(txLogFilename).toString()) || {}
      return TransferEthERC721FromNear.parseBuffer(log)
    } catch (e) {
      return {}
    }
  }

  static recordTransferLog (obj) {
    fs.writeFileSync(txLogFilename, JSON.stringify(obj))
  }

  static async withdraw ({
    nearTokenContract,
    nearSenderAccountId,
    nearErc721Account,
    tokenId,
    ethReceiverAddress,
    nearSenderAccount
  }) {
    // Withdraw the token on Near side.
    try {
      //   const oldBalance = await backoff(10, () =>
      //     nearTokenContract.ft_balance_of({
      //       account_id: nearSenderAccountId
      //     })
      //   )
      //   console.log(
      //     `Balance of ${nearSenderAccountId} before withdrawing: ${oldBalance}`
      //   )

      console.log(
        `Withdrawing token id ${tokenId} on NEAR blockchain in favor of ${ethReceiverAddress}.`
      )
      const txWithdraw = await nearJsonContractFunctionCall(
        nearErc721Account,
        nearSenderAccount,
        'withdraw',
        { token_id: tokenId, recipient: ethReceiverAddress },
        new BN('300000000000000'),
        new BN(1)
      )
      console.log(`tx withdraw: ${JSON.stringify(txWithdraw)}`)

      TransferEthERC721FromNear.recordTransferLog({
        finished: 'withdraw',
        txWithdraw
      })
    } catch (txRevertMessage) {
      console.log('Failed to withdraw.')
      console.log(txRevertMessage.toString())
      TransferEthERC721FromNear.showRetryAndExit()
    }
  }

  static async findWithdrawInBlock ({ txWithdraw, nearSenderAccountId, near }) {
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
        throw new Error(`Invalid tx withdraw: ${JSON.stringify(txWithdraw)}`, e)
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
      TransferEthERC721FromNear.recordTransferLog({
        finished: 'find-withdraw',
        txReceiptBlockHash,
        txReceiptId,
        outcomeBlock,
        idType
      })
    } catch (txRevertMessage) {
      console.log('Failed to find withdraw in block.')
      console.log(txRevertMessage.toString())
      TransferEthERC721FromNear.showRetryAndExit()
    }
  }

  static async waitBlock ({
    clientContract,
    outcomeBlock,
    robustWeb3,
    nearSenderAccountId,
    nearTokenContract,
    tokenId,
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
      // console.log(`Withdrawn ${JSON.stringify(tokenId)}`)
      // const newBalance = await backoff(10, () =>
      //   nearTokenContract.ft_balance_of({
      //     account_id: nearSenderAccountId
      //   })
      // )
      // console.log(
      //   `Balance of ${nearSenderAccountId} after withdrawing: ${newBalance}`
      // )
      TransferEthERC721FromNear.recordTransferLog({
        finished: 'wait-block',
        clientBlockHashB58: clientBlockHash,
        idType,
        txReceiptId,
        clientBlockHeight
      })
    } catch (txRevertMessage) {
      console.log('Failed to wait for block occur in near on eth contract')
      console.log(txRevertMessage.toString())
      TransferEthERC721FromNear.showRetryAndExit()
    }
  }

  static async getProof ({
    idType,
    near,
    txReceiptId,
    nearSenderAccountId,
    clientBlockHashB58,
    clientBlockHeight
  }) {
    try {
      // Get the outcome proof only use block merkle root that we know is available on the Near2EthClient.
      let proofRes
      if (idType === 'transaction') {
        proofRes = await near.connection.provider.sendJsonRpc(
          'light_client_proof',
          {
            type: 'transaction',
            transaction_hash: txReceiptId,
            // TODO: Use proper sender.
            receiver_id: nearSenderAccountId,
            light_client_head: clientBlockHashB58
          }
        )
      } else if (idType === 'receipt') {
        proofRes = await near.connection.provider.sendJsonRpc(
          'light_client_proof',
          {
            type: 'receipt',
            receipt_id: txReceiptId,
            // TODO: Use proper sender.
            receiver_id: nearSenderAccountId,
            light_client_head: clientBlockHashB58
          }
        )
      } else {
        throw new Error('Unreachable')
      }
      TransferEthERC721FromNear.recordTransferLog({
        finished: 'get-proof',
        proofRes,
        clientBlockHeight
      })
    } catch (txRevertMessage) {
      console.log('Failed to get proof.')
      console.log(txRevertMessage.toString())
      TransferEthERC721FromNear.showRetryAndExit()
    }
  }

  static async unlock ({
    proverContract,
    proofRes,
    clientBlockHeight,
    ethERC721Contract,
    ethReceiverAddress,
    ethNftLockerContract,
    ethMasterAccount,
    ethGasMultiplier,
    robustWeb3
  }) {
    try {
      // Check that the proof is correct.
      const borshProofRes = borshifyOutcomeProof(proofRes)
      clientBlockHeight = new BN(clientBlockHeight)
      // Debugging output, uncomment for debugging.
      // console.log(`proof: ${JSON.stringify(proofRes)}`);
      // console.log(`client height: ${clientBlockHeight.toString()}`);
      // console.log(`root: ${clientBlockMerkleRoot}`);
      await proverContract.methods
        .proveOutcome(borshProofRes, clientBlockHeight)
        .call()
      // const oldBalance = await ethERC721Contract.methods
      //   .balanceOf(ethReceiverAddress)
      //   .call()
      // console.log(
      //   `ERC721 token number of ${ethReceiverAddress} before the transfer: ${oldBalance}`
      // )
      await robustWeb3.callContract(
        ethNftLockerContract,
        'finishNearToEthMigration',
        [borshProofRes, clientBlockHeight],
        {
          from: ethMasterAccount,
          gas: 5000000,
          handleRevert: true,
          gasPrice: new BN(await robustWeb3.web3.eth.getGasPrice()).mul(new BN(ethGasMultiplier))
        }
      )
      console.log('NFT unlocked')
      // const newBalance = await ethERC721Contract.methods
      //   .balanceOf(ethReceiverAddress)
      //   .call()
      // console.log(
      //   `ERC721 balance of ${ethReceiverAddress} after the transfer: ${newBalance}`
      // )
    } catch (txRevertMessage) {
      console.log('Failed to unlock.')
      console.log(txRevertMessage.toString())
      TransferEthERC721FromNear.showRetryAndExit()
    }
  }

  static async execute ({
    parent: { args },
    tokenId,
    nearSenderAccount: nearSenderAccountId,
    ethReceiverAddress,
    nearNetworkId,
    nearNodeUrl,
    nearSenderSk,
    nearErc721Account,
    ethNodeUrl,
    ethMasterSk,
    ethClientArtifactPath,
    ethClientAddress,
    ethProverArtifactPath,
    ethProverAddress,
    ethNftLockerAbiPath,
    ethNftLockerAddress,
    ethErc721AbiPath,
    ethErc721Address,
    ethGasMultiplier
  }) {
    ethErc721AbiPath = '/home/idir/Desktop/shardlabs/rainbow-bridge/node_modules/rainbow-non-fungible-token-connector/res/ERC721.full.abi'
    console.log(tokenId)
    console.log(nearSenderAccountId)
    console.log(ethReceiverAddress)
    console.log(nearNetworkId)
    console.log(nearNodeUrl)
    console.log(nearSenderSk)
    console.log(nearErc721Account)
    console.log(ethNodeUrl)
    console.log(ethMasterSk)
    console.log(ethClientArtifactPath)
    console.log(ethClientAddress)
    console.log(ethProverArtifactPath)
    console.log(ethProverAddress)
    console.log(ethNftLockerAbiPath)
    console.log(ethNftLockerAddress)
    console.log(ethErc721AbiPath)
    console.log(ethErc721Address)
    console.log(ethGasMultiplier)

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

    const nearSenderAccount = new nearAPI.Account(
      near.connection,
      nearSenderAccountId
    )
    await verifyAccount(near, nearSenderAccountId)

    const nearTokenContract = new nearAPI.Contract(
      nearSenderAccount,
      nearErc721Account,
      {
        changeMethods: ['new', 'withdraw'],
        viewMethods: []
      }
    )

    const nearTokenContractBorsh = new NearMintableNft(
      nearSenderAccount,
      nearErc721Account
    )
    await nearTokenContractBorsh.accessKeyInit()

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

    const ethNftLockerContract = new web3.eth.Contract(
      JSON.parse(fs.readFileSync(ethNftLockerAbiPath)),
      ethNftLockerAddress,
      {
        from: ethMasterAccount,
        handleRevert: true
      }
    )
    console.log('*******---------*********')

    const ethERC721Contract = new web3.eth.Contract(
      JSON.parse(fs.readFileSync(ethErc721AbiPath)),
      ethErc721Address,
      {
        from: ethMasterAccount,
        handleRevert: true
      }
    )

    let transferLog = TransferEthERC721FromNear.loadTransferLog()
    if (transferLog.finished === undefined) {
      await TransferEthERC721FromNear.withdraw({
        nearTokenContract,
        nearSenderAccountId,
        nearErc721Account,
        tokenId,
        ethReceiverAddress,
        nearSenderAccount
      })
      transferLog = TransferEthERC721FromNear.loadTransferLog()
    }

    if (transferLog.finished === 'withdraw') {
      await TransferEthERC721FromNear.findWithdrawInBlock({
        txWithdraw: transferLog.txWithdraw,
        nearSenderAccountId,
        near
      })
      transferLog = TransferEthERC721FromNear.loadTransferLog()
    }

    if (transferLog.finished === 'find-withdraw') {
      await TransferEthERC721FromNear.waitBlock({
        clientContract,
        robustWeb3,
        outcomeBlock: transferLog.outcomeBlock,
        nearSenderAccountId,
        nearTokenContract,
        tokenId,
        idType: transferLog.idType,
        txReceiptId: transferLog.txReceiptId
      })
      transferLog = TransferEthERC721FromNear.loadTransferLog()
    }

    if (transferLog.finished === 'wait-block') {
      await TransferEthERC721FromNear.getProof({
        idType: transferLog.idType,
        near,
        txReceiptId: transferLog.txReceiptId,
        nearSenderAccountId,
        clientBlockHashB58: transferLog.clientBlockHashB58,
        clientBlockHeight: transferLog.clientBlockHeight
      })
      transferLog = TransferEthERC721FromNear.loadTransferLog()
    }

    if (transferLog.finished === 'get-proof') {
      await TransferEthERC721FromNear.unlock({
        proverContract,
        proofRes: transferLog.proofRes,
        clientBlockHeight: transferLog.clientBlockHeight,
        ethERC721Contract,
        ethReceiverAddress,
        ethNftLockerContract,
        ethMasterAccount,
        ethGasMultiplier,
        robustWeb3
      })
    }
  }
}

exports.TransferEthERC721FromNear = TransferEthERC721FromNear
