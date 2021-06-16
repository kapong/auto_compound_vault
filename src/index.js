const { ethers } = require("ethers");
const human = ethers.utils.formatUnits

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_HOST || "https://rpc-mainnet.maticvigil.com/");
const vaultContractHash = process.env.VAULTCONTRACT
const compoundRate = Number(process.env.COMPOUNDSECOND)/2 || 900
const mainToken = Number.parseInt(process.env.MAINTOKEN) || 0

const ABI = require('./abis/abi')

let vault
if (process.env.PRIVATEKEY) {
    console.log("Found Private Key! Auto Compound Enabled")
    const wallet = new ethers.Wallet(process.env.PRIVATEKEY, provider);
    vault = new ethers.Contract(vaultContractHash, ABI.VaultIronLP, wallet);
}else{
    vault = new ethers.Contract(vaultContractHash, ABI.VaultIronLP, provider);
}

async function getToken(address){
    const token = new ethers.Contract(address, ABI.ERC20, provider);
    return {
        address: await address,
        decimals: await token.decimals(),
        symbol: await token.symbol(),
    }
}

async function getPoolReservesPerToken(poolContract, tokens, poolRatio){
    const reserves = await poolContract.getReserves()
    return tokens.map((t, i)=>reserves[i].mul(Math.pow(10, 18-t.decimals)).div(poolRatio))
}

var nextBlockNumber = 0;
var compoundBlockNumber = 0;

(async () => {
    let tokens = await Promise.all([
        getToken(vault.token0()),
        getToken(vault.token1()),
    ])
    let rewardToken = getToken(vault.rewardToken())
    let poolContract = new ethers.Contract(vault.wantAddress(), ABI.Pairs, provider)

    provider.on("block", async (blockNumber) => {
        if (blockNumber >= nextBlockNumber) {
            nextBlockNumber = blockNumber + 5
    
            var info = await vault.info()
            var poolRatio = (await poolContract.totalSupply()).div(info._balanceInFarm)
            var lp_per_token = await getPoolReservesPerToken(poolContract, tokens, poolRatio)
    
            console.log(`Block: ${blockNumber}`)
            var convert_rate = (lp_per_token[mainToken]/lp_per_token[1-mainToken])
            console.log(`\tConvertion Rate ${convert_rate.toFixed(6)}`)

            var show_lp = Number(human(info._balanceInFarm)).toFixed(12)
            var show_balance = Number(human(lp_per_token[mainToken].mul(2))).toFixed(4)
            var show_balance_sym = tokens[mainToken].symbol
            var show_reward = Number(human(info._pendingRewards)).toFixed(6)
            var show_reward_sym = (await rewardToken).symbol
            console.log(`\tBalance ${show_lp} LP = ${show_balance} ${show_balance_sym}, and\n\tPending Reward = ${show_reward} ${show_reward_sym}`)
        }
        if (process.env.PRIVATEKEY && blockNumber > compoundBlockNumber){
            compoundBlockNumber = blockNumber + compoundRate

            try {
                const txn = await vault.compound();
                console.log("Compound Tx: ", txn.hash)
                await txn.wait(confirms=2);
                console.log("Compound Transaction Confirmed!")
            } catch (error) {
                console.error("Compound Transaction Error", error.reason)
            }
        }
    })
})().catch(console.error);