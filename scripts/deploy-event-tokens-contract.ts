import hre, { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';

async function main(): Promise<void> {
    const GoingUpEventTokens: ContractFactory = await ethers.getContractFactory('GoingUpEventTokens');

    console.log('Deploying GoingUpEventTokens...');
    const goingUpEventTokens = await GoingUpEventTokens.deploy();
    console.log('GoingUpEventTokens deployed to:', goingUpEventTokens.address);

    // wait for 2 confirmations
    await goingUpEventTokens.deployTransaction.wait(2);

    // verify GoingUPEventTokens contract on polygonscan
    await hre.run('verify:verify', {
        address: goingUpEventTokens.address,
        constructorArguments: [],
        contract: 'contracts/GoingUpEventTokens.sol:GoingUpEventTokens'
    });
};

main();