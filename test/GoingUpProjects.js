const { expect } = require('chai');
const { ethers } = require('hardhat');

let contract, contractAsDeployer, contractAsOwner, contractAsAdmin1, contractAsAdmin2;
let deployer, owner, admin1, admin2;

describe('Intialize', () => {
    it('Deploy GoingUpProjects Contract', async () => {
        const signers = await ethers.getSigners();
        deployer = await signers[0].getAddress();
        owner = await signers[1].getAddress();
        admin1 = await signers[2].getAddress();
        admin2 = await signers[3].getAddress();

        const GoingUpProjects = await ethers.getContractFactory('GoingUpProjects', signers[0]);
        contract = await GoingUpProjects.deploy();
        await contract.deployed();

        [contractAsDeployer, contractAsOwner, contractAsAdmin1, contractAsAdmin2] =
            (await ethers.getSigners()).map(signer => contract.connect(signer));
    });
});

describe('Contract ownership', () => {
    it('Owner is deployer', async () => {
        expect(await contract.owner()).to.equal(deployer);
    });

    it('Transfer ownership by non-owner should revert', async () => {
        await expect(contractAsOwner.transferOwnership(owner)).to.be.revertedWith('not the owner');
    });

    it('Transfer ownership by current owner (deployer) to new owner (owner)', async () => {
        await contractAsDeployer.transferOwnership(owner);
        expect(await contract.owner()).to.not.equal(await deployer);
        expect(await contract.owner()).to.equal(await owner);
    });
});

describe('Contract admins', () => {
    it('Admin addresses are not yet admins', async () => {
        expect(await contract.admins(admin1)).to.equal(false);
        expect(await contract.admins(admin2)).to.equal(false);
    });

    it('Not the owner sets address as admin', async () => {
        await expect(contractAsAdmin1.setAdmin(admin1, true)).to.be.revertedWith('not the owner');
        await expect(contractAsAdmin1.setAdmin(admin1, false)).to.be.revertedWith('not the owner');
        await expect(contractAsAdmin2.setAdmin(admin2, true)).to.be.revertedWith('not the owner');
        await expect(contractAsAdmin2.setAdmin(admin2, false)).to.be.revertedWith('not the owner');
    })
});