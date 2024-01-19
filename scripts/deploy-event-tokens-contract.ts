import hre, { ethers, upgrades } from 'hardhat';
import { ContractFactory } from 'ethers';

async function main(): Promise<void> {
  const GoingUpEventTokensV1: ContractFactory = await ethers.getContractFactory('GoingUpEventTokensV1');

  console.log('Deploying GoingUpEventTokens...');
  const goingUpEventTokensV1 = await upgrades.deployProxy(GoingUpEventTokensV1, [], { initializer: 'initialize' });

  // wait for 2 confirmations
  await goingUpEventTokensV1.deployTransaction.wait(2);

  // get chain id this is deployed to
  const { chainId } = await hre.network.config;
  console.log('chainId: ', chainId);

  // get implementation contract address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(goingUpEventTokensV1.address);

  // verify GoingUPEventTokensV1 contract
  await hre.run('verify:verify', {
    address: implementationAddress,
    constructorArguments: [],
    contract: 'contracts/GoingUpEventTokensV1.sol:GoingUpEventTokensV1',
  });
}

main();
