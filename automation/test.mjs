import { ethers } from "ethers";

const wallet = new ethers.Wallet('ab46de720ee8ead69d0d89b461ebe6346c713501bc5bf8165ec038a5a3db7fb0');

console.log(wallet.address);