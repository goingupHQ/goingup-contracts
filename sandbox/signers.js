const { ethers } = require('hardhat');

(async () => {
    const signers = await ethers.getSigners();
    console.log(signers);
})();