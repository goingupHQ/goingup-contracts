// SPDX-License-Identifier: MIT
// Author: Mark Ibanez
// Email: mark.ibanez@gmail.com
// Github: https://github.com/markibanez
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "operator-filter-registry/src/DefaultOperatorFilterer.sol";

contract GoingUpEventTokensV1 is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    ERC1155PausableUpgradeable,
    ERC1155SupplyUpgradeable,
    ReentrancyGuardUpgradeable,
    DefaultOperatorFilterer
{
    struct TokenSetting {
        string description;
        string metadataURI;
        address owner;
        uint256 price;
        uint256 cantMintAfter;
        uint256 maxSupply;
        uint256 maxPerAddress;
    }

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(uint256 => TokenSetting) public tokenSettings;

    function initialize() public initializer {
        __ERC1155_init("");
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);

        _setupRole(
            DEFAULT_ADMIN_ROLE,
            0x68D99e952cF3D4faAa6411C1953979F54552A8F7
        );
        _setupRole(MINTER_ROLE, 0x68D99e952cF3D4faAa6411C1953979F54552A8F7);
        _setupRole(PAUSER_ROLE, 0x68D99e952cF3D4faAa6411C1953979F54552A8F7);
    }

    function pauseContract() public onlyRole(PAUSER_ROLE) whenNotPaused {
        _pause();
    }

    function unpauseContract() public onlyRole(PAUSER_ROLE) whenPaused {
        _unpause();
    }

    function setTokenSettings(
        uint256 tokenID,
        string calldata _description,
        string calldata _metadataURI,
        address _owner,
        uint256 _price,
        uint256 _cantMintAfter,
        uint256 _maxSupply,
        uint256 _maxPerAddress
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenSettings[tokenID] = TokenSetting({
            description: _description,
            metadataURI: _metadataURI,
            owner: _owner,
            price: _price,
            cantMintAfter: _cantMintAfter,
            maxSupply: _maxSupply,
            maxPerAddress: _maxPerAddress
        });
    }

    event WriteMintData(
        uint256 indexed tokenID,
        address indexed to,
        address from,
        string data
    );

    function mint(
        address account,
        uint256 tokenID,
        uint256 qty,
        bool hasExtraData,
        string calldata data
    ) public payable whenNotPaused nonReentrant {
        TokenSetting memory ts = tokenSettings[tokenID];

        require(ts.owner != address(0), "Token ID not found");

        require(
            ts.price == 0 || msg.value >= ts.price * qty,
            "Amount sent not enough"
        );

        require(
            ts.cantMintAfter == 0 || block.timestamp < ts.cantMintAfter,
            "Minting is closed"
        );

        require(
            ts.maxSupply == 0 || ts.maxSupply >= totalSupply(tokenID) + qty,
            "Max supply reached"
        );

        require(
            ts.maxPerAddress == 0 ||
                ts.maxPerAddress >= balanceOf(account, tokenID) + qty,
            "Max per address reached"
        );

        _mint(account, tokenID, qty, "");

        if (hasExtraData)
            emit WriteMintData(tokenID, account, msg.sender, data);
    }

    function manualMint(
        address account,
        uint256 tokenID,
        uint256 qty
    ) public onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        _mint(account, tokenID, qty, "");
    }

    function manualMintBatch(
        address account,
        uint256[] calldata tokenIDs,
        uint256[] calldata qtys
    ) public onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        _mintBatch(account, tokenIDs, qtys, "");
    }

    function uri(uint256 tokenID) public view override returns (string memory) {
        TokenSetting memory ts = tokenSettings[tokenID];
        require(bytes(ts.metadataURI).length > 0, "Token ID not found");
        return ts.metadataURI;
    }

    string private _contractURI = "";

    function setContractURI(
        string calldata _uri
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _contractURI = _uri;
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function withdrawFunds() public onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        payable(msg.sender).transfer(address(this).balance);
    }

    function withdrawERC20(
        address _tokenContract,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        IERC20Upgradeable tokenContract = IERC20Upgradeable(_tokenContract);
        tokenContract.transfer(msg.sender, _amount);
    }

    function withdrawERC721(
        address _tokenContract,
        uint256 _tokenID
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        IERC721Upgradeable tokenContract = IERC721Upgradeable(_tokenContract);
        tokenContract.safeTransferFrom(address(this), msg.sender, _tokenID);
    }

    function withdrawERC1155(
        address _tokenContract,
        uint256 _tokenID,
        uint256 _amount,
        bytes memory _data
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        IERC1155Upgradeable tokenContract = IERC1155Upgradeable(_tokenContract);
        tokenContract.safeTransferFrom(
            address(this),
            msg.sender,
            _tokenID,
            _amount,
            _data
        );
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable, ERC1155PausableUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice
     * See {IERC1155-setApprovalForAll}.
     * Uses ProjectOpenSea's Operator Filter Registry to ensure
     * that only approved operators can be approved.
     * */
    function setApprovalForAll(
        address operator,
        bool approved
    ) public override onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    /**
     * @notice
     * See {IERC1155-safeTransferFrom}.
     * Uses ProjectOpenSea's Operator Filter Registry to ensure
     * that only approved operators can transfer tokens.
     * */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, amount, data);
    }

    /**
     * @notice
     * See {IERC1155-safeBatchTransferFrom}.
     * Uses ProjectOpenSea's Operator Filter Registry to ensure
     * that only approved operators can transfer tokens.
     * */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeBatchTransferFrom(from, to, tokenIds, amounts, data);
    }
}
