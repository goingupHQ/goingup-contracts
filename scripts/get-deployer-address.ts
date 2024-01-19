import * as dotenv from 'dotenv';
dotenv.config();
import { ethers } from 'ethers';

async function main() {
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK!);
  console.log(wallet.address);
}

main();
