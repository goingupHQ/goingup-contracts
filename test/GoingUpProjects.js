const { expect } = require('chai');
const { ethers } = require('hardhat');
const mockData = require('./mock-data.json');

let contract,
    contractAsDeployer,
    contractAsOwner,
    contractAsAdmin1,
    contractAsAdmin2,
    contractAsPublic1,
    contractAsProjectOwner1,
    contractAsProjectOwner2,
    contractAsProject1Member1,
    contractAsProject1Member2,
    contractAsProject1Member3,
    contractAsProject2Member1,
    contractAsProject2Member2,
    contractAsProject2Member3;

let deployer,
    owner,
    admin1,
    admin2,
    public1,
    projectOwner1,
    projectOwner2,
    project1Member1,
    project1Member2,
    project1Member3,
    project2Member1,
    project2Member2,
    project2Member3;

describe('Intialize', () => {
    it('Deploy GoingUpProjects Contract', async () => {
        const signers = await ethers.getSigners();
        deployer = await signers[0].getAddress();
        owner = await signers[1].getAddress();
        admin1 = await signers[2].getAddress();
        admin2 = await signers[3].getAddress();
        public1 = await signers[4].getAddress();
        projectOwner1 = await signers[5].getAddress();
        projectOwner2 = await signers[6].getAddress();
        project1Member1 = await signers[7].getAddress();
        project1Member2 = await signers[8].getAddress();
        project1Member3 = await signers[9].getAddress();
        project2Member1 = await signers[10].getAddress();
        project2Member2 = await signers[11].getAddress();
        project2Member3 = await signers[12].getAddress();

        const GoingUpProjects = await ethers.getContractFactory('GoingUpProjects', signers[0]);
        contract = await GoingUpProjects.deploy();
        await contract.deployed();

        [
            contractAsDeployer,
            contractAsOwner,
            contractAsAdmin1,
            contractAsAdmin2,
            contractAsPublic1,
            contractAsProjectOwner1,
            contractAsProjectOwner2,
            contractAsProject1Member1,
            contractAsProject1Member2,
            contractAsProject1Member3,
            contractAsProject2Member1,
            contractAsProject2Member2,
            contractAsProject2Member3,
        ] = (await ethers.getSigners()).map((signer) => contract.connect(signer));
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
    });

    it('Owner sets admin addresses as admin', async () => {
        await contractAsOwner.setAdmin(admin1, true);
        await contractAsOwner.setAdmin(admin2, true);
        expect(await contract.admins(admin1)).to.equal(true);
        expect(await contract.admins(admin2)).to.equal(true);
    });

    it('Owner unsets and resets admin2 address as admin', async () => {
        await contractAsOwner.setAdmin(admin2, false);
        expect(await contract.admins(admin2)).to.equal(false);
        await contractAsOwner.setAdmin(admin2, true);
        expect(await contract.admins(admin2)).to.equal(true);
    });
});

describe('Contract variable "price"', () => {
    it('Variable "price" getter', async () => {
        expect(await contractAsPublic1.price()).to.equal('10000000000000000');
    });

    it('Non admin address tries to set price', async () => {
        await expect(contractAsPublic1.setPrice('25000000000000000')).to.be.revertedWith('not admin');
    });

    it('Admin address sets price', async () => {
        await contractAsAdmin1.setPrice('25000000000000000');
        expect(await contractAsPublic1.price()).to.equal('25000000000000000');
        await contractAsAdmin2.setPrice('35000000000000000');
        expect(await contractAsPublic1.price()).to.equal('35000000000000000');
    });
});

describe('Create and update projects', () => {
    it('Create project without sending payment', async () => {
        const data = mockData[0];
        await expect(
            contractAsProjectOwner1.create(
                data.name,
                data.description,
                data.started,
                data.ended,
                data.primaryUrl,
                data.tags.join()
            )
        ).to.revertedWith('did not send enough');
    });

    it('Create project but not send enough payment', async () => {
        const data = mockData[0];
        await expect(
            contractAsProjectOwner1.create(
                data.name,
                data.description,
                data.started,
                data.ended,
                data.primaryUrl,
                data.tags.join(),
                { value: '1000000000000000' }
            )
        ).to.revertedWith('did not send enough');
    });

    it('Project Owners creates their respective projects', async () => {
        const price = await contractAsProjectOwner1.price();
        const data = mockData[0];
        await contractAsProjectOwner1.create(
            data.name,
            data.description,
            data.started,
            data.ended,
            data.primaryUrl,
            data.tags.join(),
            { value: price }
        );

        const data2 = mockData[1];
        await contractAsProjectOwner2.create(
            data2.name,
            data2.description,
            data2.started,
            data2.ended,
            data2.primaryUrl,
            data2.tags.join(),
            { value: price }
        );
    });

    it('Check if projects have been created', async () => {
        const project1 = await contractAsPublic1.projects(1);
        const mock1 = mockData[0];

        expect(project1.id).to.equal(1);
        expect(project1.name).to.equal(mock1.name);
        expect(project1.description).to.equal(mock1.description);
        expect(project1.started).to.equal(mock1.started);
        expect(project1.ended).to.equal(mock1.ended);
        expect(project1.primaryUrl).to.equal(mock1.primaryUrl);
        expect(project1.owner).to.equal(projectOwner1);
        expect(project1.active).to.equal(true);
        expect(project1.allowMembersToEdit).to.equal(false);
        expect(project1.tags).to.equal(mock1.tags.join());

        const project2 = await contractAsPublic1.projects(2);
        const mock2 = mockData[1];
        expect(project2.id).to.equal(2);
        expect(project2.name).to.equal(mock2.name);
        expect(project2.description).to.equal(mock2.description);
        expect(project2.started).to.equal(mock2.started);
        expect(project2.ended).to.equal(mock2.ended);
        expect(project2.primaryUrl).to.equal(mock2.primaryUrl);
        expect(project2.owner).to.equal(projectOwner2);
        expect(project2.active).to.equal(true);
        expect(project2.allowMembersToEdit).to.equal(false);
        expect(project2.tags).to.equal(mock2.tags.join());
    });

    it('Update a project that address is not the owner of', async () => {
        const price = await contractAsProjectOwner1.price();
        const data1 = mockData[10];
        await expect(
            contractAsProjectOwner2.update(
                1,
                data1.name,
                data1.description,
                data1.started,
                data1.ended,
                data1.primaryUrl,
                data1.tags.join(),
                { value: price }
            )
        ).to.be.revertedWith('cannot edit project');

        const data2 = mockData[20];
        await expect(
            contractAsProjectOwner1.update(
                2,
                data2.name,
                data2.description,
                data2.started,
                data2.ended,
                data2.primaryUrl,
                data2.tags.join(),
                { value: price }
            )
        ).to.be.revertedWith('cannot edit project');
    });

    it('Project Owners update their respective projects', async () => {
        const price = await contractAsProjectOwner1.price();
        const data1 = mockData[10];
        await contractAsProjectOwner1.update(
            1,
            data1.name,
            data1.description,
            data1.started,
            data1.ended,
            data1.primaryUrl,
            data1.tags.join(),
            { value: price }
        );

        const data2 = mockData[20];
        await contractAsProjectOwner2.update(
            2,
            data2.name,
            data2.description,
            data2.started,
            data2.ended,
            data2.primaryUrl,
            data2.tags.join(),
            { value: price }
        );
    });

    it('Check if projects have been updated', async () => {
        const project1 = await contractAsPublic1.projects(1);
        const mock1 = mockData[10];

        expect(project1.id).to.equal(1);
        expect(project1.name).to.equal(mock1.name);
        expect(project1.description).to.equal(mock1.description);
        expect(project1.started).to.equal(mock1.started);
        expect(project1.ended).to.equal(mock1.ended);
        expect(project1.primaryUrl).to.equal(mock1.primaryUrl);
        expect(project1.tags).to.equal(mock1.tags.join());

        const project2 = await contractAsPublic1.projects(2);
        const mock2 = mockData[20];
        expect(project2.id).to.equal(2);
        expect(project2.name).to.equal(mock2.name);
        expect(project2.description).to.equal(mock2.description);
        expect(project2.started).to.equal(mock2.started);
        expect(project2.ended).to.equal(mock2.ended);
        expect(project2.primaryUrl).to.equal(mock2.primaryUrl);
        expect(project2.tags).to.equal(mock2.tags.join());
    });
});

describe('Project ownership', () => {
    it('Transfer project ownership but not enough funds sent', async () => {
        const price = await contractAsProjectOwner1.price();
        await expect(contractAsPublic1.transferProjectOwnership(1, public1, { value: price.sub('100000') }))
            .to.be.revertedWith('did not send enough');

        await expect(contractAsPublic1.transferProjectOwnership(2, public1, { value: price.sub('100000') }))
            .to.be.revertedWith('did not send enough');
    });

    it('Transfer project ownership but not authorized', async () => {
        const price = await contractAsProjectOwner1.price();
        await expect(contractAsPublic1.transferProjectOwnership(1, public1, { value: price }))
            .to.be.revertedWith('not the project owner');

        await expect(contractAsPublic1.transferProjectOwnership(2, public1, { value: price }))
            .to.be.revertedWith('not the project owner');
    });

    it('Transfer project ownership by respective owners', async () => {
        const price = await contractAsProjectOwner1.price();
        await contractAsProjectOwner1.transferProjectOwnership(1, public1, { value: price });
        await contractAsProjectOwner2.transferProjectOwnership(2, public1, { value: price });
    });

    it('Verify if project owner has changed', async () => {
        const project1 = await contractAsPublic1.projects(1);
        expect(project1.owner).to.equal(public1);

        const project2 = await contractAsPublic1.projects(2);
        expect(project2.owner).to.equal(public1);
    })

    it('Transfer project ownership to original owners', async () => {
        const price = await contractAsProjectOwner1.price();
        await contractAsPublic1.transferProjectOwnership(1, projectOwner1, { value: price });
        await contractAsPublic1.transferProjectOwnership(2, projectOwner2, { value: price });
    });

    it('Verify if project ownership has been returned to original owners', async () => {
        const project1 = await contractAsPublic1.projects(1);
        expect(project1.owner).to.equal(projectOwner1);

        const project2 = await contractAsPublic1.projects(2);
        expect(project2.owner).to.equal(projectOwner2);
    })
});

// describe('Project members', () => {
//     it('Invite members to project but not authorized', async () => {

//     });
// });
