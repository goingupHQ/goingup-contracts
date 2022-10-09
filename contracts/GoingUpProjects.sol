// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

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
        bool isPrivate;
    }

    struct ProjectMember {
        uint256 id;
        uint256 projectId;
        address member;
        string role;
        string goal;
        string rewardData; // json format
        bool inviteAccepted;
        bool goalAchieved;
        bool rewardVerified;
        string extraData;
    }

    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableMap for EnumerableMap.UintToUintMap;
    using EnumerableMap for EnumerableMap.AddressToUintMap;
    using Counters for Counters.Counter;

    constructor() {
        owner = msg.sender;
    }

    /// @notice Owner addres
    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "not the owner");
        _;
    }

    /// @notice Transfer ownership of contract
    /// @param newOwner New contract owner address
    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    /// @notice Admin addresses mapping (true if admin, false if not admin)
    mapping(address => bool) public admins;
    modifier onlyAdmin() {
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
    uint256 public price = 1 * 10**16; // default price is 0.01 matic
    modifier sentEnough() {
        require(msg.value >= price, "did not send enough");
        _;
    }

    /// @notice Sets the price for creating and updating projects
    /// @param newPrice New price for creating and updating projects
    function setPrice(uint256 newPrice) public onlyAdmin {
        price = newPrice;
    }

    /// @notice Number of members that can be added for free (just pay for gas)
    uint256 public freeMembers = 5;

    /// @notice This event is emitted when freeMembers is changed
    /// @param changedBy Address that changed freeMembers
    /// @param newFreeMembers New value for freeMembers
    event FreeMembersChanged(address changedBy, uint256 newFreeMembers);

    /// @notice Sets the number of members that can be added for free (accessible only by admins)
    /// @param newFreeMembers New number of members that can be added for free
    function setFreeMembers(uint256 newFreeMembers) public onlyAdmin {
        freeMembers = newFreeMembers;
        emit FreeMembersChanged(msg.sender, newFreeMembers);
    }

    /// @notice Default price for adding members above the freeMembers threshold (0.1 MATIC)
    uint256 public addMemberPrice = 0.1 ether;

    /// @notice This event is emitted when addMemberPrice is changed
    /// @param changedBy Address that changed addMemberPrice
    /// @param newAddMemberPrice New value for addMemberPrice
    event AddMemberPriceChanged(address changedBy, uint256 newAddMemberPrice);

    /// @notice Sets the default price for adding members (accessible only by admins)
    /// @param newAddMemberPrice New default price for adding members
    function setAddMemberPrice(uint256 newAddMemberPrice) public onlyAdmin {
        addMemberPrice = newAddMemberPrice;
        emit AddMemberPriceChanged(msg.sender, newAddMemberPrice);
    }

    /// @notice Override price mapping for adding members
    mapping(address => uint256) public addMemberPriceOverrides;

    /// @notice This event is emitted when add member price override is set
    /// @param setBy Address that set the override price
    /// @param targetAddress Target address to set override price for
    /// @param overridePrice New override price for adding members
    event AddMemberPriceOverrideSet(
        address setBy,
        address targetAddress,
        uint256 overridePrice
    );

    /// @notice Sets the override price for adding members (accessible only by admins)
    /// @param targetAddress Target address to set override price
    /// @param overridePrice New override price for adding members
    function setAddMemberPriceOverride(
        address targetAddress,
        uint256 overridePrice
    ) public onlyAdmin {
        addMemberPriceOverrides[targetAddress] = overridePrice;
        emit AddMemberPriceOverrideSet(
            msg.sender,
            targetAddress,
            overridePrice
        );
    }

    modifier sentEnoughForAddMember(uint256 projectId) {
        uint256 _price = addMemberPriceOverrides[msg.sender];
        if (_price == 0) {
            _price = addMemberPrice;
        }

        uint256 invitesCount = 0;


        if (
            invitesMapping[projectId].length() +
                membersMapping[projectId].length() +
                1 >
            freeMembers
        ) {
            require(msg.value >= _price, "did not send enough");
            _;
        } else {
            _;
        }
    }

    /// @dev Storage for projects
    Counters.Counter private projectsCounter;
    mapping(uint256 => Project) public projects;

    /// @dev Storage for members
    Counters.Counter private projectMemberCounter;
    mapping(uint256 => ProjectMember) public projectMemberStorage;

    /// @dev Members mapped to project
    mapping(uint256 => EnumerableSet.UintSet) private membersMapping;

    /// @dev Member records mapped to address
    mapping(address => EnumerableSet.UintSet) private membersByAddressMapping;

    /// @dev Invites mapped to project
    mapping(uint256 => EnumerableSet.UintSet) private invitesMapping;

    /// @dev Invites mapped to member
    mapping(address => EnumerableSet.UintSet) private invitesByAddressMapping;

    /// @notice Project extra data storage
    mapping(uint256 => mapping(string => string)) public extraData;

    modifier onlyProjectOwner(uint256 projectId) {
        require(
            msg.sender == projects[projectId].owner,
            "not the project owner"
        );
        _;
    }

    modifier canEditProject(uint256 projectId) {
        Project memory project = projects[projectId];
        require(
            msg.sender == project.owner ||
                (project.allowMembersToEdit &&
                    membersByAddressMapping[msg.sender].contains(projectId)),
            "cannot edit project"
        );
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
    function create(
        string memory name,
        string memory description,
        uint started,
        uint ended,
        string memory primaryUrl,
        string memory tags,
        bool isPrivate
    ) public payable sentEnough {
        projectsCounter.increment();
        Project memory newProject = Project({
            id: projectsCounter.current(),
            name: name,
            description: description,
            started: started,
            ended: ended,
            primaryUrl: primaryUrl,
            tags: tags,
            owner: msg.sender,
            active: true,
            allowMembersToEdit: false,
            isPrivate: isPrivate
        });

        projects[projectsCounter.current()] = newProject;
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
    function update(
        uint256 projectId,
        string memory name,
        string memory description,
        uint started,
        uint ended,
        string memory primaryUrl,
        string memory tags,
        bool isPrivate
    )
        public
        payable
        sentEnough
        canEditProject(projectId)
        isProjectActive(projectId)
    {
        projects[projectId].name = name;
        projects[projectId].description = description;
        projects[projectId].started = started;
        projects[projectId].ended = ended;
        projects[projectId].primaryUrl = primaryUrl;
        projects[projectId].tags = tags;
        projects[projectId].isPrivate = isPrivate;

        emit Update(msg.sender, projectId);
    }

    /// @notice This event is emitted when project ownership is transferred
    /// @param projectId Project ID
    /// @param from Current project owner
    /// @param to New project owner
    event TransferProjectOwnership(
        uint256 indexed projectId,
        address from,
        address to
    );

    /// @notice Transfer project ownership
    /// @param projectId Project ID
    /// @param to Address to set as new owner of project
    function transferProjectOwnership(uint256 projectId, address to)
        public
        payable
        sentEnough
        onlyProjectOwner(projectId)
    {
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

    /// @notice This event is emitted when project is set to private
    /// @param projectId Project ID
    /// @param setBy Address that set the project to private
    event SetProjectPrivate(uint indexed projectId, address setBy);

    /// @notice Set project to private (only accessible to authorized addresses)
    /// @param projectId Project ID
    function setProjectPrivate(uint projectId)
        public
        canEditProject(projectId)
    {
        projects[projectId].isPrivate = true;
        emit SetProjectPrivate(projectId, msg.sender);
    }

    /// @notice This event is emitted when project is set to public
    /// @param projectId Project ID
    /// @param setBy Address that set the project to public
    event SetProjectPublic(uint indexed projectId, address setBy);

    /// @notice Set project to public (only accessible to authorized addresses)
    /// @param projectId Project ID
    function setProjectPublic(uint projectId) public canEditProject(projectId) {
        projects[projectId].isPrivate = false;
        emit SetProjectPublic(projectId, msg.sender);
    }

    /// @notice This event is emitted when project owner allows members to edit project
    /// @param projectId Project ID
    /// @param allowedBy Current owner address allowing edits by members
    event AllowMembersToEdit(uint256 indexed projectId, address allowedBy);

    /// @notice Allows members to edit updateable portions of project (only accessible to project owner)
    /// @param projectId Project ID
    function allowMembersToEdit(uint256 projectId)
        public
        onlyProjectOwner(projectId)
    {
        projects[projectId].allowMembersToEdit = true;
        emit AllowMembersToEdit(projectId, msg.sender);
    }

    /// @notice This event is emitted when project owner disallows members to edit project
    /// @param projectId Project ID
    /// @param allowedBy Current owner address allowing edits by members
    event DisallowMembersToEdit(uint256 indexed projectId, address allowedBy);

    /// @notice Allows members to edit updateable portions of project (only accessible to project owner)
    /// @param projectId Project ID
    function disallowMembersToEdit(uint256 projectId)
        public
        onlyProjectOwner(projectId)
    {
        projects[projectId].allowMembersToEdit = false;
        emit DisallowMembersToEdit(projectId, msg.sender);
    }

    /// @notice This event is emitted when an authorized address invites an address to be a project member
    /// @param projectId Project ID
    /// @param from Authorized address issuing the invitation
    /// @param to Address invited to become a member of the project
    event InviteMember(uint256 indexed projectId, address from, address to);

    /// @notice Invite a member to project
    /// @param projectId Project ID
    /// @param member Address to invite to become a member of the project
    function inviteMember(
        uint256 projectId,
        address member,
        string calldata role,
        string calldata goal,
        string calldata rewardData
    )
        public
        payable
        canEditProject(projectId)
        sentEnoughForAddMember(projectId)
    {
        projectMemberCounter.increment();
        uint256 memberRecordId = projectMemberCounter.current();

        projectMemberStorage[memberRecordId] = ProjectMember({
            id: memberRecordId,
            projectId: projectId,
            member: member,
            role: role,
            goal: goal,
            rewardData: rewardData,
            inviteAccepted: false,
            goalAchieved: false,
            rewardVerified: false,
            extraData: ""
        });

        invitesMapping[projectId].add(memberRecordId);
        invitesByAddressMapping[member].add(memberRecordId);
        emit InviteMember(projectId, msg.sender, member);
    }

    /// @notice This event is emitted when an authorized address disinvites a pending invite
    /// @param projectId Project ID
    /// @param by Authorized address issuing the invitation
    /// @param memberRecordId Member record ID
    event DisinviteMember(
        uint256 indexed projectId,
        address by,
        uint256 memberRecordId
    );

    /// @notice Disinvite member from project
    /// @param projectId Project ID
    /// @param memberRecordId Address to disinvite from project
    function disinviteMember(uint256 projectId, uint256 memberRecordId)
        public
        canEditProject(projectId)
    {
        invitesMapping[projectId].remove(memberRecordId);
        invitesByAddressMapping[projectMemberStorage[memberRecordId].member]
            .remove(memberRecordId);

        emit DisinviteMember(projectId, msg.sender, memberRecordId);
    }

    /// @notice Get project ids invited to by address
    /// @param member Address to get project ids invited to
    function getPendingInvitesByAddress(address member)
        public
        view
        returns (uint256[] memory)
    {
        return invitesByAddressMapping[member].values();
    }

    /// @notice Get pending invites for project
    /// @param projectId Project ID
    function getPendingInvites(uint256 projectId)
        public
        view
        returns (uint256[] memory)
    {
        return invitesMapping[projectId].values();
    }

    /// @notice This event is emitted when a member address accepts invitation to be a project member
    /// @param projectId Project ID
    /// @param member Address that accepted the invitation
    /// @param memberRecordId Member record ID
    event AcceptProjectInvitation(uint256 indexed projectId, address member, uint256 memberRecordId);

    /// @notice Accept invitation to become a member of the project
    /// @param memberRecordId Member record ID
    function acceptProjectInvitation(uint256 memberRecordId) public {
        require(
            projectMemberStorage[memberRecordId].member == msg.sender,
            "Only invited member can accept invitation"
        );

        uint256 projectId = projectMemberStorage[memberRecordId].projectId;
        bool isInvited = invitesMapping[projectId].contains(memberRecordId);
        require(
            isInvited,
            "not invited to project"
        );

        invitesMapping[projectId].remove(memberRecordId);
        invitesByAddressMapping[msg.sender].remove(memberRecordId);

        membersMapping[projectId].add(memberRecordId);
        membersByAddressMapping[msg.sender].add(memberRecordId);

        emit AcceptProjectInvitation(projectId, msg.sender, memberRecordId);
    }

    /// @notice This event is emitted when a member leaves a project
    /// @param projectId Project ID
    /// @param memberRecordId Member record ID
    /// @param reason Reason for leaving project
    event LeaveProject(
        uint256 indexed projectId,
        uint256 memberRecordId,
        string reason
    );

    /// @notice Leave project
    /// @param memberRecordId Member record ID
    function leaveProject(uint256 memberRecordId, string memory reason) public {
        uint256 projectId = projectMemberStorage[memberRecordId].projectId;

        require(
            projects[projectId].owner != msg.sender,
            "owner cannot leave project"
        );

        require(
            projectMemberStorage[memberRecordId].member == msg.sender,
            "only member can leave project"
        );

        membersMapping[projectId].remove(memberRecordId);
        membersByAddressMapping[msg.sender].remove(memberRecordId);

        emit LeaveProject(projectId, memberRecordId, reason);
    }

    /// @notice This event is emitted when authorized address removes a member from project
    /// @param projectId Project ID
    /// @param removedBy Remover address
    /// @param memberRecordId Member record ID
    /// @param reason Reason why member was removed
    event RemoveMember(
        uint256 projectId,
        address removedBy,
        uint256 memberRecordId,
        string reason
    );

    /// @notice Remove member from project (only accessible to authorized addresses)
    /// @param projectId Project ID
    /// @param memberRecordId Member record ID
    /// @param reason Reason why member is to be removed
    function removeMember(
        uint256 projectId,
        uint256 memberRecordId,
        string memory reason
    ) public canEditProject(projectId) {
        membersMapping[projectId].remove(memberRecordId);
        membersByAddressMapping[projectMemberStorage[memberRecordId].member]
            .remove(memberRecordId);

        emit RemoveMember(projectId, msg.sender, memberRecordId, reason);
    }

    /// @notice Get project ids member is a member of
    /// @param member Member address
    function getProjectsByAddress(address member)
        public
        view
        returns (uint256[] memory)
    {
        return membersByAddressMapping[member].values();
    }

    /// @notice This event is emitted when a project owner sets a member's goal as achieved
    /// @param projectId Project ID
    /// @param setAsAchievedBy Authorized address setting the member's goal as achieved
    /// @param memberRecordId Member record ID
    event SetMemberGoalAsAchieved(
        uint256 indexed projectId,
        address setAsAchievedBy,
        uint256 memberRecordId
    );

    /// @notice Set member's goal as achieved
    /// @param projectId Project ID
    /// @param memberRecordId Member record ID
    function setMemberGoalAsAchieved(uint256 projectId, uint256 memberRecordId)
        public
        canEditProject(projectId)
    {
        require(
            projectMemberStorage[memberRecordId].projectId == projectId,
            "member record id does not match project id"
        );

        projectMemberStorage[memberRecordId].goalAchieved = true;
        emit SetMemberGoalAsAchieved(projectId, msg.sender, memberRecordId);
    }

    /// @notice This event is emitted when an admin address sets a member's reward as verified
    /// @param projectId Project ID
    /// @param setAsVerifiedBy Authorized address setting the member's reward as verified
    /// @param memberRecordId Member record ID
    event SetMemberRewardAsVerified(
        uint256 indexed projectId,
        address setAsVerifiedBy,
        uint256 memberRecordId
    );

    /// @notice Set member's reward as verified
    /// @param projectId Project ID
    /// @param memberRecordId Member record ID
    function setMemberRewardAsVerified(uint256 projectId, uint256 memberRecordId)
        public
        onlyAdmin
    {
        require(
            projectMemberStorage[memberRecordId].projectId == projectId,
            "member record id does not match project id"
        );

        projectMemberStorage[memberRecordId].rewardVerified = true;
        emit SetMemberRewardAsVerified(projectId, msg.sender, memberRecordId);
    }

    /// @notice Get project members
    /// @param projectId Project ID
    function getProjectMembers(uint256 projectId)
        public
        view
        returns (uint256[] memory)
    {
        return membersMapping[projectId].values();
    }

    /// @notice This event is emitted when an contract owner or admin manually adds project members
    /// @param projectId Project ID
    /// @param addedBy Address who adds the project member
    /// @param member Member address added to project
    /// @param memberRecordId Member record ID
    event ManuallyAddMember(
        uint256 indexed projectId,
        address addedBy,
        address member,
        uint256 memberRecordId
    );

    /// @notice Manually add member to project (only accessible to contract owner or admin)
    /// @param projectId Project ID
    /// @param member Member address to add to project
    /// @param role Role in project
    /// @param goal Goal for project member
    function manuallyAddMember(
        uint256 projectId,
        address member,
        string calldata role,
        string calldata goal,
        string calldata rewardData
    ) public onlyAdmin {
        projectMemberCounter.increment();
        uint256 memberRecordId = projectMemberCounter.current();

        projectMemberStorage[memberRecordId] = ProjectMember({
            id: memberRecordId,
            projectId: projectId,
            member: member,
            role: role,
            goal: goal,
            rewardData: rewardData,
            inviteAccepted: true,
            goalAchieved: false,
            rewardVerified: false,
            extraData: ""
        });

        membersMapping[projectId].add(memberRecordId);
        membersByAddressMapping[member].add(memberRecordId);
    }

    /// @notice This event is emitted when an authorized address sets project extra data
    /// @param projectId Project ID
    /// @param setBy Authorized address adding extra data
    /// @param key Key for extra data
    /// @param value Value for extra data
    event SetProjectExtraData(
        uint256 indexed projectId,
        address setBy,
        string key,
        string value
    );

    /// @notice Set project extra data
    /// @param projectId Project ID
    /// @param key Extra data key
    /// @param value Extra data value
    function setProjectExtraData(
        uint256 projectId,
        string memory key,
        string memory value
    ) public canEditProject(projectId) {
        extraData[projectId][key] = value;
        emit SetProjectExtraData(projectId, msg.sender, key, value);
    }

    /// @notice This event is emitted when an authorized address sets project member's extra data
    /// @param projectId Project ID
    /// @param setBy Authorized address adding extra data
    /// @param memberRecordId Member record ID
    event SetProjectMemberExtraData(
        uint256 indexed projectId,
        address setBy,
        uint256 memberRecordId
    );

    /// @notice Set project member's extra data
    /// @param projectId Project ID
    /// @param memberRecordId Member record ID
    /// @param data Extra data string
    function setProjectMemberExtraData(
        uint256 projectId,
        uint256 memberRecordId,
        string memory data
    ) public canEditProject(projectId) {
        require(
            projectMemberStorage[memberRecordId].projectId == projectId,
            "member record id does not match project id"
        );

        projectMemberStorage[memberRecordId].extraData = data;
        emit SetProjectMemberExtraData(projectId, msg.sender, memberRecordId);
    }

    /// @notice This event is emitted when a score and/or comment is added to a project
    /// @param projectId Project ID
    /// @param reviewedBy Authorized address adding score and/or comment
    /// @param score Score (-5 to +5)
    /// @param comments Comments
    event SubmitProjectReview(
        uint256 indexed projectId,
        address reviewedBy,
        int8 score,
        string comments
    );

    /// @notice Add score and/or comment to project
    /// @param projectId Project ID
    /// @param score Score (-5 to +5)
    /// @param comments Comments
    function submitProjectReview(
        uint256 projectId,
        int8 score,
        string memory comments
    ) public payable sentEnough {
        require(score >= -5 && score <= 5, "score must be between -5 and +5");
        emit SubmitProjectReview(projectId, msg.sender, score, comments);
    }

    /// @notice Withdraw native tokens (matic)
    function withdrawFunds() public onlyAdmin {
        payable(msg.sender).transfer(address(this).balance);
    }

    /// @notice Withdraw ERC20 tokens
    /// @param tokenAddress Address of ERC20 contract
    /// @param amount Amount to transfer
    function withdrawERC20(address tokenAddress, uint256 amount)
        external
        onlyAdmin
    {
        IERC20 tokenContract = IERC20(tokenAddress);
        tokenContract.transfer(msg.sender, amount);
    }

    /// @notice Withdraw ERC721 token
    /// @param tokenAddress Address of ERC721 contract
    /// @param tokenID Token ID to withdraw
    function withdrawERC721(address tokenAddress, uint256 tokenID)
        external
        onlyAdmin
    {
        IERC721 tokenContract = IERC721(tokenAddress);
        tokenContract.safeTransferFrom(address(this), msg.sender, tokenID);
    }

    /// @notice Withdraw ERC1155 token
    /// @param tokenAddress Address of ERC1155 contract
    /// @param tokenID Token ID to withdraw
    function withdrawERC1155(
        address tokenAddress,
        uint256 tokenID,
        uint256 amount,
        bytes memory data
    ) external onlyAdmin {
        IERC1155 tokenContract = IERC1155(tokenAddress);
        tokenContract.safeTransferFrom(
            address(this),
            msg.sender,
            tokenID,
            amount,
            data
        );
    }
}
