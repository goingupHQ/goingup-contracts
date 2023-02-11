const { ethers } = require('hardhat');

async function main() {
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PK);
    console.log(wallet.address);
};

main();