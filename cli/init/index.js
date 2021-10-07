const {
  InitEthClient,
  InitEthEd25519,
  InitEthErc20,
  InitEthLocker,
  InitEthProver,
  InitEthErc721,
  InitEthERC721Locker
} = require('./eth-contracts')
const { InitNearContracts } = require('./near-contracts')
const { InitNearTokenFactory } = require('./near-token-factory')
const { InitNearNFTFactory } = require('./near-nft-factory')

exports.InitEthEd25519 = InitEthEd25519
exports.InitEthErc20 = InitEthErc20
exports.InitEthLocker = InitEthLocker
exports.InitEthClient = InitEthClient
exports.InitEthProver = InitEthProver
exports.InitNearContracts = InitNearContracts
exports.InitNearTokenFactory = InitNearTokenFactory
exports.InitNearNFTFactory = InitNearNFTFactory
exports.InitEthErc721 = InitEthErc721
exports.InitEthERC721Locker = InitEthERC721Locker
