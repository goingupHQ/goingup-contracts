// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title GoingUP Platform Projects Smart Contract
/// @author Mark Ibanez
contract GoingUpProjects {
    struct Project {
        uint256 id;
        string name;
        string description;
        uint started;
        uint ended;
        string primaryUrl;
        string tags;
        address owner;
        bool active;
        bool allowMembersToEdit;
    }

    using EnumerableSet for EnumerableSet.AddressSet;

    constructor () {
        owner = msg.sender;
    }

    uint256 private idCounter = 1;

    /// @notice Owner addres
    address public owner;
    modifier onlyOwner {
        require(msg.sender == owner, 'not the owner');
        _;
    }

    /// @notice Transfer ownership of contract
    /// @param newOwner New contract owner address
    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    /// @notice Admin addresses mapping (true if admin, false if not admin)
    mapping(address => bool) public admins;
    modifier onlyAdmin {
        require(owner == msg.sender || admins[msg.sender], "not admin");
        _;
    }

    /// @notice Sets the admin flag for address
    /// @param targetAddress Target address to set admin flag
    /// @param isAdmin Admin flag to set (true means address is admin, false mean address is not admin)
    function setAdmin(address targetAddress, bool isAdmin) public onlyOwner {
        admins[targetAddress] = isAdmin;
    }

    /// @notice Price for various transactions
    uint256 public price = 1 * 10 ** 16; // default price is 0.01 matic
    modifier sentEnough {
        require(msg.value >= price, "did not send enough");
        _;
    }

    /// @notice Sets the price for creating and updating projects
    /// @param newPrice New price for creating and updating projects
    function setPrice(uint256 newPrice) public onlyAdmin {
        price = newPrice;
    }

    /// @notice Projects mapping
    mapping(uint256 => Project) public projects;

    mapping(uint256 => EnumerableSet.AddressSet) private membersMapping;
    mapping(uint256 => mapping(address => string)) public memberRolesMapping;

    /// @notice Project invites array
    mapping(uint256 => mapping(address => bool)) public invitesMapping;

    /// @notice Project scores array
    mapping(uint256 => uint[]) public scores;

    /// @notice Project reviews array
    mapping(uint256 => string[]) public reviews;

    /// @notice Project extra data array
    mapping(uint256 => string[]) public extraData;

    modifier onlyProjectOwner(uint256 projectId) {
        require(msg.sender == projects[projectId].owner, "not the project owner");
        _;
    }

    modifier canEditProject(uint256 projectId) {
        Project memory project = projects[projectId];
        require(msg.sender == project.owner || (project.allowMembersToEdit && membersMapping[projectId].contains(msg.sender)), "cannot edit project");
        _;
    }

    modifier isProjectActive(uint256 projectId) {
        require(projects[projectId].active, "project not active");
        _;
    }

    /// @notice This event is emitted when a project is created
    /// @param creator Project creator
    /// @param projectId Generated id of the created project
    event Create(address indexed creator, uint256 projectId);

    /// @notice Create a project
    /// @param name Project name
    /// @param description Project description
    /// @param started Project start (Unix timestamp, set to zero if you do not want to set any value)
    /// @param ended Project ended (Unix timestamp, set to zero if you do not want to set any value)
    /// @param primaryUrl Project primary url
    /// @param tags Project tags
    function create(string memory name, string memory description, uint started, uint ended, string memory primaryUrl, string memory tags) public payable sentEnough {
        Project memory newProject;

        newProject.id = idCounter;
        newProject.name = name;
        newProject.description = description;
        newProject.started = started;
        newProject.ended = ended;
        newProject.primaryUrl = primaryUrl;
        newProject.tags = tags;
        newProject.owner = msg.sender;
        newProject.active = true;
        newProject.allowMembersToEdit = false;

        projects[idCounter] = newProject;
        idCounter++;

        emit Create(msg.sender, newProject.id);
    }

    /// @notice This event is emitted when a project is updated
    /// @param updater Project creator
    /// @param projectId Generated id of the updated project
    event Update(address indexed updater, uint256 projectId);

    /// @notice Update a project
    /// @param projectId Project ID
    /// @param name Project name
    /// @param description Project description
    /// @param started Project start (Unix timestamp, set to zero if you do not want to set any value)
    /// @param ended Project ended (Unix timestamp, set to zero if you do not want to set any value)
    /// @param primaryUrl Project primary url
    /// @param tags Project tags
    function update(uint256 projectId, string memory name, string memory description, uint started, uint ended, string memory primaryUrl, string memory tags) public payable sentEnough canEditProject(projectId) isProjectActive(projectId) {
        projects[projectId].name = name;
        projects[projectId].description = description;
        projects[projectId].started = started;
        projects[projectId].ended = ended;
        projects[projectId].primaryUrl = primaryUrl;
        projects[projectId].tags = tags;

        emit Update(msg.sender, projectId);
    }

    /// @notice This event is emitted when project ownership is transferred
    /// @param projectId Project ID
    /// @param from Current project owner
    /// @param to New project owner
    event TransferProjectOwnership(uint256 indexed projectId, address from, address to);

    /// @notice Transfer project ownership
    /// @param projectId Project ID
    /// @param to Address to set as new owner of project
    function transferProjectOwnership(uint256 projectId, address to) public payable sentEnough onlyProjectOwner(projectId) {
        projects[projectId].owner = to;
        emit TransferProjectOwnership(projectId, msg.sender, to);
    }

    /// @notice This event is emitted when project is deactivated
    /// @param projectId Project ID
    /// @param deactivatedBy Address that activated the project
    event Deactivate(uint indexed projectId, address deactivatedBy);

    /// @notice Activate project and allow updates (only accessible to project owner)
    /// @param projectId Project ID
    function deactivate(uint projectId) public onlyProjectOwner(projectId) {
        projects[projectId].active = false;
        emit Deactivate(projectId, msg.sender);
    }

    /// @notice This event is emitted when project is activated
    /// @param projectId Project ID
    /// @param activatedBy Address that activated the project
    event Activate(uint indexed projectId, address activatedBy);

    /// @notice Activate project and allow updates (only accessible to project owner)
    /// @param projectId Project ID
    function activate(uint projectId) public onlyProjectOwner(projectId) {
        projects[projectId].active = true;
        emit Activate(projectId, msg.sender);
    }

    /// @notice This event is emitted when project owner allows members to edit project
    /// @param projectId Project ID
    /// @param allowedBy Current owner address allowing edits by members
    event AllowMembersToEdit(uint256 indexed projectId, address allowedBy);

    /// @notice Allows members to edit updateable portions of project (only accessible to project owner)
    /// @param projectId Project ID
    function allowMembersToEdit(uint256 projectId) public onlyProjectOwner(projectId) {
        projects[projectId].allowMembersToEdit = true;
        emit AllowMembersToEdit(projectId, msg.sender);
    }

    /// @notice This event is emitted when project owner disallows members to edit project
    /// @param projectId Project ID
    /// @param allowedBy Current owner address allowing edits by members
    event DisallowMembersToEdit(uint256 indexed projectId, address allowedBy);

    /// @notice Allows members to edit updateable portions of project (only accessible to project owner)
    /// @param projectId Project ID
    function disallowMembersToEdit(uint256 projectId) public onlyProjectOwner(projectId) {
        projects[projectId].allowMembersToEdit = false;
        emit DisallowMembersToEdit(projectId, msg.sender);
    }

    /// @notice This event is emitted when an authorized address invites an address to be a project member
    /// @param projectId Project ID
    /// @param from Authorized address issuing the invitation
    /// @param to Address invited to become a member of the project
    /// @param role Member role in project
    event InviteMember(uint256 indexed projectId, address from, address to, string role);

    /// @notice Invite a member to project
    /// @param projectId Project ID
    /// @param member Address to invite to become a member of the project
    function inviteMember(uint256 projectId, address member, string memory role) public canEditProject(projectId) {
        invitesMapping[projectId][member] = true;
        memberRolesMapping[projectId][member] = role;
        emit InviteMember(projectId, msg.sender, member, role);
    }

    /// @notice This event is emitted when an authorized address disinvites a pending invite
    /// @param projectId Project ID
    /// @param from Authorized address issuing the invitation
    /// @param to Address to disinvite
    event DisinviteMember(uint256 indexed projectId, address from, address to);

    /// @notice Disinvite member from project
    /// @param projectId Project ID
    /// @param member Address to disinvite from project
    function disinviteMember(uint256 projectId, address member) public canEditProject(projectId) {
        invitesMapping[projectId][member] = false;
        memberRolesMapping[projectId][member] = "";
        emit DisinviteMember(projectId, msg.sender, member);
    }

    /// @notice This event is emitted when a member address accepts invitation to be a project member
    /// @param projectId Project ID
    event AcceptProjectInvitation(uint256 indexed projectId, address member);

    /// @notice Accept invitation to become a member of the project
    /// @param projectId Project ID
    function acceptProjectInvitation(uint256 projectId) public {
        require(invitesMapping[projectId][msg.sender], "not invited to project");
        membersMapping[projectId].add(msg.sender);
        emit AcceptProjectInvitation(projectId, msg.sender);
    }

    /// @notice This event is emitted when a member leaves a project
    /// @param projectId Project ID
    /// @param member Member address
    /// @param reason Reason for leaving project
    event LeaveProject(uint256 indexed projectId, address member, string reason);

    /// @notice Leave project
    /// @param projectId Project ID
    function leaveProject(uint256 projectId, string reason) public {
        require(projects[projectId].owner != msg.sender, "owner cannot leave project");
        require(membersMapping[projectId].contains(msg.sender), "not a member of project");
        membersMapping[projectId].remove(msg.sender);
        memberRolesMapping[projectId][msg.sender] = "";
        emit LeaveProject(projectId, msg.sender, reason);
    }

    /// @notice This event is emitted when authorized address removes a member from project
    /// @param projectId Project ID
    /// @param removedBy Remover address
    /// @param memberRemoved Member address removed from project
    /// @param reason Reason why member was removed
    event RemoveMember(uint256 projectId, address removedBy, address memberRemoved, string reason);

    /// @notice Remove member from project (only accessible to authorized addresses)
    /// @param projectId Project ID
    /// @param member Member address to remove
    /// @param reason Reason why member is to be removed
    function removeMember(uint256 projectId,address member, string memory reason) public canEditProject(projectId) {
        members
    }

    /// @notice Get project members
    /// @param projectId Project ID
    function getProjectMembers(uint256 projectId) public view returns (address[] memory) {
        return membersMapping[projectId].values();
    }

    /// @notice Withdraw native tokens (matic)
    function withdrawFunds() public onlyAdmin {
        payable(msg.sender).transfer(address(this).balance);
    }

    /// @notice Withdraw ERC20 tokens
    /// @param tokenAddress Address of ERC20 contract
    /// @param amount Amount to transfer
    function withdrawERC20(address tokenAddress, uint256 amount) external onlyAdmin {
        IERC20 tokenContract = IERC20(tokenAddress);
        tokenContract.transfer(msg.sender, amount);
    }

    /// @notice Withdraw ERC721 token
    /// @param tokenAddress Address of ERC721 contract
    /// @param tokenID Token ID to withdraw
    function withdrawERC721(address tokenAddress, uint256 tokenID) external onlyAdmin {
        IERC721 tokenContract = IERC721(tokenAddress);
        tokenContract.safeTransferFrom(address(this), msg.sender, tokenID);
    }

    /// @notice Withdraw ERC1155 token
    /// @param tokenAddress Address of ERC1155 contract
    /// @param tokenID Token ID to withdraw
    function withdrawERC1155(address tokenAddress, uint256 tokenID, uint256 amount, bytes memory data) external onlyAdmin {
        IERC1155 tokenContract = IERC1155(tokenAddress);
        tokenContract.safeTransferFrom(address(this), msg.sender, tokenID, amount, data);
    }
}