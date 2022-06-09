// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/// @title GoingUP Membership NFT
/// @author Mark Ibanez
/// @notice Lifetime exclusive premium membership to the GoingUP platform
contract GoingUpMembership is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard
{
    using Strings for string;

    /// @notice Total supply limit (this is fixed and cannot be updated)
    uint public constant maxSupply = 222;

    /// @notice Mint price per token
    uint public mintPrice = 222 * 10 ** 16; // 2.22 eth
    /// @notice Set per token mint price
    /// @param newPrice New price
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    string private _baseTokenURI;
    bytes32 private _whitelistRoot = 0xfbaa96a1f7806c1ab06f957c8fc6e60875b6880254f77b71439c7854a6b47755;

    constructor() ERC721("GoingUP Membership", "GUPM") {
        // mint 22 reserve tokens
        for (uint i = 0; i < 22; i++) {
            _safeMint(msg.sender, totalSupply() + 1);
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function mint(bytes32[] memory proof) public payable {
        require(verifyWhitelist(proof), "not whitelisted");
        require(balanceOf(msg.sender) == 0, "already minted");
        require(totalSupply() < maxSupply, "max supply minted");
        _safeMint(msg.sender, totalSupply() + 1);
    }

    function withdraw() external onlyOwner nonReentrant {
        payable(msg.sender).transfer(address(this).balance);
    }

    function withdrawERC20(address tokenAddress) external onlyOwner nonReentrant {
        IERC20 tokenContract = IERC20(tokenAddress);

        uint256 totalBalance = tokenContract.balanceOf(address(this));
        tokenContract.transfer(msg.sender, totalBalance);
    }

    function withdrawERC721(address _tokenContract, uint256 _tokenID) external onlyOwner nonReentrant {
        IERC721 tokenContract = IERC721(_tokenContract);
        tokenContract.safeTransferFrom(address(this), msg.sender, _tokenID);
    }

    function withdrawERC1155(address _tokenContract, uint256 _tokenID, uint256 _amount, bytes memory _data) external onlyOwner nonReentrant {
        IERC1155 tokenContract = IERC1155(_tokenContract);
        tokenContract.safeTransferFrom(address(this), msg.sender, _tokenID, _amount, _data);
    }

    // whitelists and merkle verification

    function setWhitelistRoot(bytes32 root) external onlyOwner { _whitelistRoot = root; }

    function verifyWhitelist(bytes32[] memory proof) internal view returns (bool)
    {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        return MerkleProof.verify(proof, _whitelistRoot, leaf);
    }

    // URI management
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory)
    {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory _tokenURI = super.tokenURI(tokenId);
        return bytes(_tokenURI).length > 0 ? string(abi.encodePacked(_tokenURI, ".json")) : "";
    }
}
