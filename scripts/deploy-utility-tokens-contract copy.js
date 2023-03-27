const { ethers } = require('hardhat');

async function main() {
    const GoingUpUtilityTokens = await ethers.getContractFactory('GoingUpUtilityTokens');

    console.log('Deploying GoingUpUtilityTokens...');
    const goingUpUtilityTokens = await GoingUpUtilityTokens.deploy();

    console.log('GoingUpUtilityTokens deployed to:', goingUpUtilityTokens.address);
};

main();