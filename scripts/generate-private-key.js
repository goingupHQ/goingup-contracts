// this account is used to create a random wallet and return the private key
const { ethers } = require('ethers');

async function main() {
    const wallet = ethers.Wallet.createRandom();
    console.log(wallet.address);
    console.log(wallet.privateKey);
}

main();