const {
  TransferETHERC20ToNear,
  TransferEthERC20FromNear,
  DeployToken
} = require('./transfer-eth-erc20')
const {
  TransferETHERC721ToNear,
  TransferEthERC721FromNear,
  DeployNFT
} = require('./transfer-eth-erc721')
const {
  mintErc20,
  mintErc721,
  getErc20Balance,
  getBridgeOnNearBalance,
  getBridgeNftOnNearBalance,
  getClientBlockHeightHash,
  getAddressBySecretKey,
  ethToNearApprove,
  ethToNearLock,
  nearToEthUnlock
} = require('./adapter')

exports.TransferETHERC20ToNear = TransferETHERC20ToNear
exports.TransferEthERC20FromNear = TransferEthERC20FromNear
exports.TransferEthERC721FromNear = TransferEthERC721FromNear
exports.DeployToken = DeployToken
exports.TransferETHERC721ToNear = TransferETHERC721ToNear
exports.DeployNFT = DeployNFT
exports.mintErc20 = mintErc20
exports.mintErc721 = mintErc721
exports.getErc20Balance = getErc20Balance
exports.getBridgeOnNearBalance = getBridgeOnNearBalance
exports.getClientBlockHeightHash = getClientBlockHeightHash
exports.getAddressBySecretKey = getAddressBySecretKey
exports.ethToNearApprove = ethToNearApprove
exports.ethToNearLock = ethToNearLock
exports.nearToEthUnlock = nearToEthUnlock
exports.getBridgeNftOnNearBalance = getBridgeNftOnNearBalance
