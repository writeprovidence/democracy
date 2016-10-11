fs = require('fs');
Web3 = require('web3');
web3 = new Web3()

config = require('config')

address = config.get('contract_address')
endpoint = config.get('http_provider')

contractName = "ZcashEscrow"
console.log("Contract name: " + contractName);

web3.setProvider(new web3.providers.HttpProvider(endpoint));

code = fs.readFileSync(`contracts/${contractName}.bin`).toString()
abi = JSON.parse(fs.readFileSync(`contracts/${contractName}.abi`).toString())

instance = web3.eth.contract(abi).at(address)

console.log("Owner: " + instance.owner());

payee = process.argv[2]
console.log("Payee: " + payee)

instance.payInto("hello backer 1",
   {
       from: payee,
       to: address,
       value: web3.toWei(0.1, "ether")
   });
//web3.eth.sendTransaction({from: web3.eth.accounts[1], to: address, value: web3.toWei(0.5, "ether")});
