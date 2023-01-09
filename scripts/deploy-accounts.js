const { ethers, upgrades } = require('hardhat');

async function main() {
    const GoingUpAccountsV1 = await ethers.getContractFactory('GoingUpAccountsV1');
    const goingUpAccountsV1 = await upgrades.deployProxy(GoingUpAccountsV1, []);

    await goingUpAccountsV1.deployed();
    console.log('GoingUpAccounts deployed to:', goingUpAccountsV1.address);
};

main();