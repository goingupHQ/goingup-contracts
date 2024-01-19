import hre, { ethers } from 'hardhat';

async function main() {
  const GoingUpUtilityTokens = await ethers.getContractFactory('GoingUpUtilityTokens');

  console.log('Deploying GoingUpUtilityTokens...');
  const goingUpUtilityTokens = await GoingUpUtilityTokens.deploy();

  console.log('GoingUpUtilityTokens deployed to:', goingUpUtilityTokens.address);

  await hre.run('verify:verify', {
    address: goingUpUtilityTokens.address,
    constructorArguments: [],
    contract: 'contracts/GoingUpUtilityTokens.sol:GoingUpUtilityTokens',
  });
}

main();
