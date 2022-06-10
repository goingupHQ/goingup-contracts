const { expect } = require('chai');
const { ethers } = require('hardhat');
const merkle = require('./../utils/merkle');

var contract,
    contractAsDeployer,
    contractAsOwner,
    contractAsPublic1,
    contractAsPublic2,
    contractAsPublic3,
    contractAsPublic4,
    contractAsPublic5;
var deployer, owner, public1, public2, public3, public4, public5;
var whitelist = [];
var merkleRoot = null;

describe('Intialize', () => {
    it('Deploy GoingUpMembership Contract', async () => {
        const signers = await ethers.getSigners();
        deployer = await signers[0].getAddress();
        owner = await signers[1].getAddress();
        public1 = await signers[2].getAddress();
        public2 = await signers[3].getAddress();
        public3 = await signers[4].getAddress();
        public4 = await signers[5].getAddress();
        public5 = await signers[6].getAddress();

        const GoingUpMembership = await ethers.getContractFactory('GoingUpMembership', signers[0]);
        contract = await GoingUpMembership.deploy();
        await contract.deployed();

        [
            contractAsDeployer,
            contractAsOwner,
            contractAsPublic1,
            contractAsPublic2,
            contractAsPublic3,
            contractAsPublic4,
            contractAsPublic5,
        ] = (await ethers.getSigners()).map((signer) => contract.connect(signer));
    });

    it('Check minted 22 reserve tokens to deployer', async () => {
        expect(await contractAsPublic1.balanceOf(deployer)).to.equal(22);
    });

    it('Check public1 address to have zero balance', async () => {
        expect(await contractAsPublic1.balanceOf(public1)).to.equal(0);
    });

    it('Compute whitelist merkle root', async () => {
        whitelist.push(public1);
        whitelist.push(public2);
        whitelist.push(public3);
        merkleRoot = merkle.computeRoot(whitelist);
        console.log(`Computed Merkle Root:`, merkleRoot.toString('hex'));
    });

    it('Set whitelist root as public1 (reverts)', async () => {
        await expect(contractAsPublic1.setWhitelistRoot(merkleRoot)).to.be.revertedWith('not the owner');
    })

    it('Set whitelist root as deployer', async () => {
        await contractAsDeployer.setWhitelistRoot(merkleRoot);
    })

    it('Get Token URI of nonexistent token', async () => {
        await expect(contractAsPublic1.tokenURI(45)).to.be.revertedWith('token does not exist');
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

describe('State variable "mintPrice"', () => {
    it('Check default mint price', async () => {
        expect(await contractAsPublic1.mintPrice()).to.equal('2220000000000000000');
    });

    it('Non owner address tries to set mint price', async () => {
        await expect(contractAsPublic1.setMintPrice('3330000000000000000')).to.be.revertedWith(
            'Ownable: caller is not the owner'
        );
    });

    it('Owner address sets mint price', async () => {
        await contractAsOwner.setMintPrice('3330000000000000000');
        expect(await contractAsPublic1.mintPrice()).to.equal('3330000000000000000');
    });
});

describe('Minting', () => {
    it('Mint with public4 and public5 which are not whitelisted', async () => {
        const public4Proof = merkle.getProof(public4, whitelist);
        await expect(contractAsPublic4.mint(public4Proof)).to.be.revertedWith('not whitelisted');

        const public5Proof = merkle.getProof(public5, whitelist);
        await expect(contractAsPublic5.mint(public5Proof)).to.be.revertedWith('not whitelisted');
    });

    it('Balances of public4 and public 5 should all be 0', async () => {
        expect(await contractAsOwner.balanceOf(public4)).to.equal(0);
        expect(await contractAsOwner.balanceOf(public5)).to.equal(0);
    });

    it('Total supply should still be 22', async () => {
        expect(await contractAsPublic1.totalSupply()).to.equal(22);
    });

    it('Mint with public1, public2 and public3', async () => {
        const public1Proof = merkle.getProof(public1, whitelist);
        await contractAsPublic1.mint(public1Proof);

        const public2Proof = merkle.getProof(public2, whitelist);
        await contractAsPublic2.mint(public2Proof);

        const public3Proof = merkle.getProof(public3, whitelist);
        await contractAsPublic3.mint(public3Proof);
    });

    it('Balances of public1, public2 and public3 should all be 1', async () => {
        expect(await contractAsOwner.balanceOf(public1)).to.equal(1);
        expect(await contractAsOwner.balanceOf(public2)).to.equal(1);
        expect(await contractAsOwner.balanceOf(public3)).to.equal(1);
    });

    it('Total supply should now be 25', async () => {
        expect(await contractAsPublic1.totalSupply()).to.equal(25);
    });

    it('Mint with public1, public2 and public3 (should revert)', async () => {
        const public1Proof = merkle.getProof(public1, whitelist);
        await expect(contractAsPublic1.mint(public1Proof)).to.be.revertedWith('already minted');
    });

    it('Manual mint with non-owner address', async () => {
        await expect(contractAsPublic1.manualMint(public1, 10)).to.be.revertedWith('not the owner');
    });

    it('Manual mint with owner address but exceeds supply', async () => {
        await expect(contractAsOwner.manualMint(owner, 222)).to.be.revertedWith('exceeds max supply');
    });

    it('Manual mint 217 tokens with owner address', async () => {
        await contractAsOwner.manualMint(owner, 197);
        expect(await contractAsPublic1.totalSupply()).to.equal(222);
        expect(await contractAsPublic1.balanceOf(owner)).to.equal(197);
    });

    it('Mint exceeds max supply', async () => {
        const public1Proof = merkle.getProof(public1, whitelist);
        await expect(contractAsPublic1.mint(public1Proof)).to.be.revertedWith('max supply minted');
    });
});

describe.skip('Token URI', () => {
    it('Check all token URIs (should all be blank)', async () => {
        for (let i = 0; i < 222; i++) {
            expect(await contractAsPublic1.tokenURI(i + 1)).to.equal('');
        }
    })

    it('Set base token URI by non owner address', async () => {
        await expect(contractAsDeployer.setBaseURI('ipfs://whatever/')).to.be.revertedWith('not the owner');
    });

    it('Set base token URI by owner address', async () => {
        await contractAsOwner.setBaseURI('ipfs://whatever/');
    });

    it('Check all token URIs', async () => {
        for (let i = 0; i < 222; i++) {
            expect(await contractAsPublic1.tokenURI(i + 1)).to.equal(`ipfs://whatever/${i + 1}.json`);
        }
    })
});
