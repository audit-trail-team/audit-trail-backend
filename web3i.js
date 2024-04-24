const { Web3 } = require("web3");
require('dotenv').config();

function createEnv(providerUrl, contractAddr, abi) {
    const provider = providerUrl;
    const web3Provider = new Web3.providers.HttpProvider(provider);
    const web3 = new Web3(web3Provider);

    // create a new contract object, providing the ABI and address
    const contract = new web3.eth.Contract(abi, contractAddr);

    const privkey = process.env.PRIVATE_KEY;
    const account = web3.eth.accounts.privateKeyToAccount(privkey);

    web3.eth.defaultAccount = account.address;

    return { provider, web3Provider, web3, contract, contractAddr, abi, account }
}

async function rawTxContractCall(env, txdata, gasLimit) {
    const prioFee = 100000  //prio fee
    const baseGasFee = (await env.web3.eth.getBlock()).baseFeePerGas
    const baseGasFeeAdd = baseGasFee * 2n

    return {
        from: env.account.address,
        to: env.contractAddr, //random wallet or contract address
        value: 0, //optional - value in wei
        maxFeePerGas: baseGasFeeAdd, //updated depending on the network
        maxPriorityFeePerGas: prioFee,
        gasLimit: gasLimit,
        nonce: await env.web3.eth.getTransactionCount(env.account.address), //optional - get the current nonce of the account 
        data: txdata //optional - encoded function signature and arguments 
    };
}

async function signAndBroadcast(env, rawTransaction) {
    // 4th - sign the raw transaction with the private key
    const signedTransaction = await env.web3.eth.accounts.signTransaction(rawTransaction, env.account.privateKey);

    // 5th - send the signed transaction
    const txReceipt = await env.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

    console.log(txReceipt)

    return txReceipt;
}

async function contr_getAuditLog(providerUrl, contractAddr, abi, id) {
    env = createEnv(providerUrl, contractAddr, abi)

    // using contract.methods to get value
    return env.contract.methods
        .getAuditLogById(id)
        .call()
}

async function contr_getAuditLogsCount(providerUrl, contractAddr, abi) {
    env = createEnv(providerUrl, contractAddr, abi)

    // using contract.methods to get value
    return env.contract.methods
        .logCount()
        .call()
}

async function contr_getAuditLogs(providerUrl, contractAddr, abi) {
    env = createEnv(providerUrl, contractAddr, abi)

    // using contract.methods to get value
    return env.contract.methods
        .getAuditLogs()
        .call()
}

async function contr_addAuditLog(providerUrl, contractAddr, abi, functionParams) {
    env = createEnv(providerUrl, contractAddr, abi)

    //We have to do a raw tx creation and broadcast because the dRPC provider doesn't support "eth_sendTransaction"
    //This unfortunately means you specify the function name as a string here
    const functionAbi = env.abi.find(el => el.name === "createAuditLog");
    const txdata = env.web3.eth.abi.encodeFunctionCall(functionAbi, functionParams);

    //Gas settings are done here -- gas limit should be adjusted based on which function is called
    //funtions with more complexity require a higher gas limit
    const rawTransaction = await rawTxContractCall(env, txdata, 2000000)
    const txReceipt = await signAndBroadcast(env, rawTransaction)

    return txReceipt.transactionHash
}

async function contr_addAuditLogs(providerUrl, contractAddr, abi, functionParams) {
    env = createEnv(providerUrl, contractAddr, abi)

    //We have to do a raw tx creation and broadcast because the dRPC provider doesn't support "eth_sendTransaction"
    //This unfortunately means you specify the function name as a string here
    const functionAbi = env.abi.find(el => el.name === "batchCreateAuditLogs");
    const txdata = env.web3.eth.abi.encodeFunctionCall(functionAbi, functionParams);

    //Gas settings are done here -- gas limit should be adjusted based on which function is called
    //funtions with more complexity require a higher gas limit
    const rawTransaction = await rawTxContractCall(env, txdata, 200000000)
    const txReceipt = await signAndBroadcast(env, rawTransaction)

    return txReceipt.transactionHash
}



module.exports = { contr_addAuditLog, contr_getAuditLogs, contr_getAuditLogsCount, contr_getAuditLog, contr_addAuditLogs };