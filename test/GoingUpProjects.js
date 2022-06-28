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

describe('Initialize', () => {
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

describe('Contract variable "freeMembers"', () => {
    it('Variable "freeMembers" getter', async () => {
        expect(await contractAsPublic1.freeMembers()).to.equal(5);
    });

    it('Non admin address tries to set freeMembers', async () => {
        await expect(contractAsPublic1.setFreeMembers(3)).to.be.revertedWith('not admin');
    });

    it('Owner address sets freeMembers', async () => {
        await expect(contractAsOwner.setFreeMembers(1))
            .to.emit(contract, 'FreeMembersChanged').withArgs(owner, 1);
    });

    it('Admin1 address sets freeMembers', async () => {
        await expect(contractAsAdmin1.setFreeMembers(2))
            .to.emit(contract, 'FreeMembersChanged').withArgs(admin1, 2);
    });

    it('Admin2 address sets freeMembers', async () => {
        await expect(contractAsAdmin2.setFreeMembers(5))
            .to.emit(contract, 'FreeMembersChanged').withArgs(admin2, 5);
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
        await expect(contractAsProjectOwner1.create(
            data.name,
            data.description,
            data.started,
            data.ended,
            data.primaryUrl,
            data.tags.join(),
            { value: price }
        )).to.emit(contract, 'Create').withArgs(projectOwner1, 1);;

        const data2 = mockData[1];
        await expect(contractAsProjectOwner2.create(
            data2.name,
            data2.description,
            data2.started,
            data2.ended,
            data2.primaryUrl,
            data2.tags.join(),
            { value: price }
        )).to.emit(contract, 'Create').withArgs(projectOwner2, 2);
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
        await expect(contractAsProjectOwner1.update(
            1,
            data1.name,
            data1.description,
            data1.started,
            data1.ended,
            data1.primaryUrl,
            data1.tags.join(),
            { value: price }
        )).to.emit(contract, 'Update').withArgs(projectOwner1, 1);;

        const data2 = mockData[20];
        await expect(contractAsProjectOwner2.update(
            2,
            data2.name,
            data2.description,
            data2.started,
            data2.ended,
            data2.primaryUrl,
            data2.tags.join(),
            { value: price }
        )).to.emit(contract, 'Update').withArgs(projectOwner2, 2);;
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
        await expect(contractAsProjectOwner1.transferProjectOwnership(1, public1, { value: price }))
            .to.emit(contract, 'TransferProjectOwnership').withArgs(1, projectOwner1, public1);
        await expect(contractAsProjectOwner2.transferProjectOwnership(2, public1, { value: price }))
            .to.emit(contract, 'TransferProjectOwnership').withArgs(2, projectOwner2, public1);
    });

    it('Verify if project owner has changed', async () => {
        const project1 = await contractAsPublic1.projects(1);
        expect(project1.owner).to.equal(public1);

        const project2 = await contractAsPublic1.projects(2);
        expect(project2.owner).to.equal(public1);
    })

    it('Transfer project ownership to original owners', async () => {
        const price = await contractAsProjectOwner1.price();
        await expect(contractAsPublic1.transferProjectOwnership(1, projectOwner1, { value: price }))
            .to.emit(contract, 'TransferProjectOwnership').withArgs(1, public1, projectOwner1);
        await expect(contractAsPublic1.transferProjectOwnership(2, projectOwner2, { value: price }))
            .to.emit(contract, 'TransferProjectOwnership').withArgs(2, public1, projectOwner2);
    });

    it('Verify if project ownership has been returned to original owners', async () => {
        const project1 = await contractAsPublic1.projects(1);
        expect(project1.owner).to.equal(projectOwner1);

        const project2 = await contractAsPublic1.projects(2);
        expect(project2.owner).to.equal(projectOwner2);
    })
});

describe('Project active/not active state', () => {
    it('Deactivate projects but not authorized', async () => {
        await expect(contractAsPublic1.deactivate(1))
            .to.be.revertedWith('not the project owner');

        await expect(contractAsPublic1.deactivate(2))
            .to.be.revertedWith('not the project owner');
    });

    it('Deactivate projects by owners', async () => {
        await expect(contractAsProjectOwner1.deactivate(1)).to.emit(contract, 'Deactivate').withArgs(1, projectOwner1);
        await expect(contractAsProjectOwner2.deactivate(2)).to.emit(contract, 'Deactivate').withArgs(2, projectOwner2);
    });

    it('Update deactivated projects', async () => {
        const price = await contractAsProjectOwner1.price();
        const data1 = mockData[11];
        await expect(contractAsProjectOwner1.update(
            1,
            data1.name,
            data1.description,
            data1.started,
            data1.ended,
            data1.primaryUrl,
            data1.tags.join(),
            { value: price }
        )).to.be.revertedWith('project not active');

        const data2 = mockData[21];
        await expect(contractAsProjectOwner2.update(
            2,
            data2.name,
            data2.description,
            data2.started,
            data2.ended,
            data2.primaryUrl,
            data2.tags.join(),
            { value: price }
        )).to.be.revertedWith('project not active');
    });

    it('Activate projects but not authorized', async () => {
        await expect(contractAsPublic1.activate(1))
            .to.be.revertedWith('not the project owner');

        await expect(contractAsPublic1.activate(2))
            .to.be.revertedWith('not the project owner');
    });

    it('Activate projects by owners', async () => {
        await expect(contractAsProjectOwner1.activate(1)).to.emit(contract, 'Activate').withArgs(1, projectOwner1);;
        await expect(contractAsProjectOwner2.activate(2)).to.emit(contract, 'Activate').withArgs(2, projectOwner2);;
    });

    it('Update activated projects', async () => {
        const price = await contractAsProjectOwner1.price();
        const data1 = mockData[11];
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

        const data2 = mockData[21];
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
});

describe('Project allow/disallow project members to edit', () => {
    it('Allow members to edit projects but not authorized', async () => {
        await expect(contractAsPublic1.allowMembersToEdit(1))
            .to.be.revertedWith('not the project owner');

        await expect(contractAsPublic1.allowMembersToEdit(2))
            .to.be.revertedWith('not the project owner');
    });

    it('Allow members to edit projects by owners', async () => {
        await expect(contractAsProjectOwner1.allowMembersToEdit(1)).to.emit(contract, 'AllowMembersToEdit')
            .withArgs(1, projectOwner1);
        await expect(contractAsProjectOwner2.allowMembersToEdit(2)).to.emit(contract, 'AllowMembersToEdit')
            .withArgs(2, projectOwner2);

        const project1 = await contractAsPublic1.projects(1);
        const project2 = await contractAsPublic1.projects(2);

        expect(project1.allowMembersToEdit).to.equal(true);
        expect(project2.allowMembersToEdit).to.equal(true);
    });

    it('Disallow members to edit projects but not authorized', async () => {
        await expect(contractAsPublic1.disallowMembersToEdit(1))
            .to.be.revertedWith('not the project owner');

        await expect(contractAsPublic1.disallowMembersToEdit(2))
            .to.be.revertedWith('not the project owner');
    });

    it('Disallow members to edit projects by owners', async () => {
        await expect(contractAsProjectOwner1.disallowMembersToEdit(1)).to.emit(contract, 'DisallowMembersToEdit')
            .withArgs(1, projectOwner1);;
        await expect(contractAsProjectOwner2.disallowMembersToEdit(2)).to.emit(contract, 'DisallowMembersToEdit')
            .withArgs(2, projectOwner2);;

        const project1 = await contractAsPublic1.projects(1);
        const project2 = await contractAsPublic1.projects(2);

        expect(project1.allowMembersToEdit).to.equal(false);
        expect(project2.allowMembersToEdit).to.equal(false);
    });
});

describe('Project members', () => {
    it('Invite members to project but not authorized', async () => {
        await expect(contractAsPublic1.inviteMember(1, public1, 'Member'))
            .to.be.revertedWith('cannot edit project');

        await expect(contractAsPublic1.inviteMember(2, public1, 'Member'))
            .to.be.revertedWith('cannot edit project');
    });

    it('Invite members to project by owners', async () => {
        await expect(contractAsProjectOwner1.inviteMember(1, project1Member1, 'Team Member'))
            .to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, project1Member1, 'Team Member');
        await expect(contractAsProjectOwner1.inviteMember(1, project1Member2, 'Team Member'))
            .to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, project1Member2, 'Team Member');
        await expect(contractAsProjectOwner1.inviteMember(1, project1Member3, 'Team Member'))
            .to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, project1Member3, 'Team Member');

        await expect(contractAsProjectOwner2.inviteMember(2, project2Member1, 'Associate'))
            .to.emit(contract, 'InviteMember')
            .withArgs(2, projectOwner2, project2Member1, 'Associate');
        await expect(contractAsProjectOwner2.inviteMember(2, project2Member2, 'Associate'))
            .to.emit(contract, 'InviteMember')
            .withArgs(2, projectOwner2, project2Member2, 'Associate');
        await expect(contractAsProjectOwner2.inviteMember(2, project2Member3, 'Associate'))
            .to.emit(contract, 'InviteMember')
            .withArgs(2, projectOwner2, project2Member3, 'Associate');
    });

    it('Verify invites mapping', async () => {
        expect(await contractAsPublic1.invitesMapping(1, project1Member1)).to.equal(true);
        expect(await contractAsPublic1.invitesMapping(1, project1Member2)).to.equal(true);
        expect(await contractAsPublic1.invitesMapping(1, project1Member3)).to.equal(true);

        expect(await contractAsPublic1.invitesMapping(2, project2Member1)).to.equal(true);
        expect(await contractAsPublic1.invitesMapping(2, project2Member2)).to.equal(true);
        expect(await contractAsPublic1.invitesMapping(2, project2Member3)).to.equal(true);
    });

    it('Disinvite members to project but not authorized', async () => {
        await expect(contractAsPublic1.disinviteMember(1, public1))
            .to.be.revertedWith('cannot edit project');

        await expect(contractAsPublic1.disinviteMember(2, public1))
            .to.be.revertedWith('cannot edit project');
    });

    it('Disinvite members from project by owners', async () => {
        await expect(contractAsProjectOwner1.disinviteMember(1, project1Member1))
            .to.emit(contract, 'DisinviteMember')
            .withArgs(1, projectOwner1, project1Member1);
        await expect(contractAsProjectOwner1.disinviteMember(1, project1Member2))
            .to.emit(contract, 'DisinviteMember')
            .withArgs(1, projectOwner1, project1Member2);
        await expect(contractAsProjectOwner1.disinviteMember(1, project1Member3))
            .to.emit(contract, 'DisinviteMember')
            .withArgs(1, projectOwner1, project1Member3);

        await expect(contractAsProjectOwner2.disinviteMember(2, project2Member1))
            .to.emit(contract, 'DisinviteMember')
            .withArgs(2, projectOwner2, project2Member1);
        await expect(contractAsProjectOwner2.disinviteMember(2, project2Member2))
            .to.emit(contract, 'DisinviteMember')
            .withArgs(2, projectOwner2, project2Member2);
        await expect(contractAsProjectOwner2.disinviteMember(2, project2Member3))
            .to.emit(contract, 'DisinviteMember')
            .withArgs(2, projectOwner2, project2Member3);
    });

    it('Verify invites mapping after disinvites', async () => {
        expect(await contractAsPublic1.invitesMapping(1, project1Member1)).to.equal(false);
        expect(await contractAsPublic1.invitesMapping(1, project1Member2)).to.equal(false);
        expect(await contractAsPublic1.invitesMapping(1, project1Member3)).to.equal(false);

        expect(await contractAsPublic1.invitesMapping(2, project2Member1)).to.equal(false);
        expect(await contractAsPublic1.invitesMapping(2, project2Member2)).to.equal(false);
        expect(await contractAsPublic1.invitesMapping(2, project2Member3)).to.equal(false);
    });

    it('Re-invite members to project by owners', async () => {
        await expect(contractAsProjectOwner1.inviteMember(1, project1Member1, 'Member'))
            .to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, project1Member1, 'Member');
        await expect(contractAsProjectOwner1.inviteMember(1, project1Member2, 'Member'))
            .to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, project1Member2, 'Member');
        await expect(contractAsProjectOwner1.inviteMember(1, project1Member3, 'Member'))
            .to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, project1Member3, 'Member');

        await expect(contractAsProjectOwner2.inviteMember(2, project2Member1, 'Associate'))
            .to.emit(contract, 'InviteMember')
            .withArgs(2, projectOwner2, project2Member1, 'Associate');
        await expect(contractAsProjectOwner2.inviteMember(2, project2Member2, 'Associate'))
            .to.emit(contract, 'InviteMember')
            .withArgs(2, projectOwner2, project2Member2, 'Associate');
        await expect(contractAsProjectOwner2.inviteMember(2, project2Member3, 'Associate'))
            .to.emit(contract, 'InviteMember')
            .withArgs(2, projectOwner2, project2Member3, 'Associate');
    });

    it('Accept invitation by public1 (not invited, should revert)', async () => {
        await expect(contractAsPublic1.acceptProjectInvitation(1)).to.be.revertedWith('not invited to project');
        await expect(contractAsPublic1.acceptProjectInvitation(2)).to.be.revertedWith('not invited to project');
    });

    it('Accept invitation by invited members', async () => {
        await expect(contractAsProject1Member1.acceptProjectInvitation(1))
            .to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(1, project1Member1);

        await expect(contractAsProject1Member2.acceptProjectInvitation(1))
            .to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(1, project1Member2);

        await expect(contractAsProject1Member3.acceptProjectInvitation(1))
            .to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(1, project1Member3);

        await expect(contractAsProject2Member1.acceptProjectInvitation(2))
            .to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(2, project2Member1);

        await expect(contractAsProject2Member2.acceptProjectInvitation(2))
            .to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(2, project2Member2);

        await expect(contractAsProject2Member3.acceptProjectInvitation(2))
            .to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(2, project2Member3);
    });

    it('Get project members and validate values', async () => {
        const project1Members = await contractAsPublic1.getProjectMembers(1);
        expect(project1Members).to.include.members([project1Member1, project1Member2, project1Member3]);
        const project2Members = await contractAsPublic1.getProjectMembers(2);
        expect(project2Members).to.include.members([project2Member1, project2Member2, project2Member3]);
    });

    it('Get project 1 member roles and validate values', async () => {
        const role = 'Member';
        const member1 = await contractAsPublic1.memberRolesMapping(1, project1Member1);
        const member2 = await contractAsPublic1.memberRolesMapping(1, project1Member2);
        const member3 = await contractAsPublic1.memberRolesMapping(1, project1Member3);

        expect(member1).to.equal(role);
        expect(member2).to.equal(role);
        expect(member3).to.equal(role);
    });

    it('Get project 2 member roles and validate values', async () => {
        const role = 'Associate';
        const member1 = await contractAsPublic1.memberRolesMapping(2, project2Member1);
        const member2 = await contractAsPublic1.memberRolesMapping(2, project2Member2);
        const member3 = await contractAsPublic1.memberRolesMapping(2, project2Member3);

        expect(member1).to.equal(role);
        expect(member2).to.equal(role);
        expect(member3).to.equal(role);
    });

    it('Project 1 owner invites public 1 address', async () => {
        await expect(contractAsProjectOwner1.inviteMember(1, public1, 'test')).to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, public1, 'test');
    });

    it('Public 1 accepts project 1 owner invite', async () => {
        await expect(contractAsPublic1.acceptProjectInvitation(1)).to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(1, public1);
    });

    it('Check if public 1 is member of project 1', async () => {
        const members = await contractAsPublic1.getProjectMembers(1);
        expect(members).to.include(public1);
    });

    it('Public 1 leaves project', async () => {
        await expect(contractAsPublic1.leaveProject(1, 'need to leave')).to.emit(contract, 'LeaveProject')
            .withArgs(1, public1, 'need to leave');
    });

    it('Check if public 1 is no longer a member of project 1', async () => {
        const members = await contractAsPublic1.getProjectMembers(1);
        expect(members).to.not.include(public1);
    });

    it('Project 1 owner leaves project (should revert)', async () => {
        await expect(contractAsProjectOwner1.leaveProject(1, 'no reason')).to.be.revertedWith('owner cannot leave project');
    });

    it('Non-member leaves project (should revert)', async () => {
        await expect(contractAsProject2Member1.leaveProject(1, 'no reason')).to.be.revertedWith('not a member of project');
    });

    it('Project 1 owner invites public 1 address', async () => {
        await expect(contractAsProjectOwner1.inviteMember(1, public1, 'test')).to.emit(contract, 'InviteMember')
            .withArgs(1, projectOwner1, public1, 'test');
    });

    it('Public 1 accepts project 1 owner invite', async () => {
        await expect(contractAsPublic1.acceptProjectInvitation(1)).to.emit(contract, 'AcceptProjectInvitation')
            .withArgs(1, public1);
    });

    it('Unauthorized address removes project member', async () => {
        await expect(contractAsPublic1.removeMember(1, project1Member1, 'testing remove function'))
            .to.be.revertedWith('cannot edit project');
    });

    it('Project 1 owner removes project member', async () => {
        await expect(contractAsProjectOwner1.removeMember(1, public1, 'was never a member'))
            .to.emit(contract, 'RemoveMember')
            .withArgs(1, projectOwner1, public1, 'was never a member');
    });

    it('Change project1 member1 role by unauthorize address', async () => {
        await expect(contractAsProject1Member1.changeMemberRole(1, project1Member1, 'Associate'))
            .to.be.revertedWith('cannot edit project');
    });

    it('Change project1 member1 role by project owner', async () => {
        await expect(contractAsProjectOwner1.changeMemberRole(1, project1Member1, 'Associate'))
            .to.emit(contract, 'ChangeMemberRole')
            .withArgs(1, projectOwner1, project1Member1, 'Associate');
    });

    it('Verify project1 member1 role has changed', async () => {
        expect(await contract.memberRolesMapping(1, project1Member1)).to.equal('Associate');
    });
});

describe('Extra data', () => {
    it('Set extra project data by unauthorized address', async () => {
        await expect(contractAsPublic1.setProjectExtraData(1, 'test', 'test'))
            .to.be.revertedWith('cannot edit project');
    });

    it('Set extra project data by project owner', async () => {
        await expect(contractAsProjectOwner1.setProjectExtraData(1, 'qwer', 'asdf'))
            .to.emit(contract, 'SetProjectExtraData')
            .withArgs(1, projectOwner1, 'qwer', 'asdf');
    });

    it('Verify extra project data has changed', async () => {
        expect(await contract.extraData(1, 'qwer')).to.equal('asdf');
    });
});

describe('Project score/comment', () => {
    it('Submit score without sending fee', async () => {
        await expect(contractAsPublic1.submitProjectReview(1, 0, 'normal score'))
            .to.be.revertedWith('did not send enough');
    });

    it('Submit score but not enough amount sent', async () => {
        await expect(contractAsPublic1.submitProjectReview(1, 0, 'normal score', { value: 1 }))
            .to.be.revertedWith('did not send enough');
    });

    it('Submit project score less than -5', async () => {
        const price = await contractAsPublic1.price();
        await expect(contractAsPublic1
            .submitProjectReview(1, -6, 'not a good project but not bad either', { value: price }))
            .to.be.revertedWith('score must be between -5 and +5');
        await expect(contractAsPublic1
            .submitProjectReview(1, -12, 'not a good project but not bad either', { value: price }))
            .to.be.revertedWith('score must be between -5 and +5');
        await expect(contractAsPublic1
            .submitProjectReview(1, -56, 'not a good project but not bad either', { value: price }))
            .to.be.revertedWith('score must be between -5 and +5');
    });

    it('Submit project score greater than 5', async () => {
        const price = await contractAsPublic1.price();
        await expect(contractAsPublic1
            .submitProjectReview(1, 6, 'not a good project but not bad either', { value: price }))
            .to.be.revertedWith('score must be between -5 and +5');
        await expect(contractAsPublic1
            .submitProjectReview(1, 12, 'not a good project but not bad either', { value: price }))
            .to.be.revertedWith('score must be between -5 and +5');
        await expect(contractAsPublic1
            .submitProjectReview(1, 56, 'not a good project but not bad either', { value: price }))
            .to.be.revertedWith('score must be between -5 and +5');
    });

    it('Submit project scores/comments', async () => {
        const price = await contractAsPublic1.price();
        await expect(contractAsProject2Member1
            .submitProjectReview(1, 0, 'not a good project but not bad either', { value: price }))
            .to.emit(contract, 'SubmitProjectReview')
            .withArgs(1, project2Member1, 0, 'not a good project but not bad either');

        await expect(contractAsProject2Member2
            .submitProjectReview(1, 5, 'this is an awesome project', { value: price }))
            .to.emit(contract, 'SubmitProjectReview')
            .withArgs(1, project2Member2, 5, 'this is an awesome project');

        await expect(contractAsProject2Member3
            .submitProjectReview(1, -5, 'this is a terrible project', { value: price }))
            .to.emit(contract, 'SubmitProjectReview')
            .withArgs(1, project2Member3, -5, 'this is a terrible project');

        await expect(contractAsProject1Member1
            .submitProjectReview(2, 0, 'not a good project but not bad either', { value: price }))
            .to.emit(contract, 'SubmitProjectReview')
            .withArgs(2, project1Member1, 0, 'not a good project but not bad either');

        await expect(contractAsProject1Member2
            .submitProjectReview(2, 5, 'this is an awesome project', { value: price }))
            .to.emit(contract, 'SubmitProjectReview')
            .withArgs(2, project1Member2, 5, 'this is an awesome project');

        await expect(contractAsProject1Member3
            .submitProjectReview(2, -5, 'this is a terrible project', { value: price }))
            .to.emit(contract, 'SubmitProjectReview')
            .withArgs(2, project1Member3, -5, 'this is a terrible project');
    });
});