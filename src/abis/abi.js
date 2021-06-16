const ABI = {
    ERC20: require('./abi-erc20'),
    MasterChef: require('./abi-masterchef'),
    Factory: require('./abi-factory'),
    Router: require('./abi-router'),
    Pairs: require('./abi-pairs'),
    VaultIronLP: require('./abi-vault'),
};
if (typeof module !== 'undefined') module.exports = ABI