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

    /// @notice Public mint for sale to whitelisted addresses only. This is the only public mint function.
    /// @param proof Offchain cryptographic proof that sender is whitelisted
    function mint(bytes32[] memory proof) public payable {
        require(totalSupply() < maxSupply, "max supply minted");
        require(balanceOf(msg.sender) == 0, "already minted");
        require(verifyWhitelist(proof), "not whitelisted");
        require(msg.value >= mintPrice, "did not send enough");
        _safeMint(msg.sender, totalSupply() + 1);
    }

    /// @notice Manual mint function only accessible to contract owner
    /// @param to Destination address of minted tokens
    /// @param qty Quantity to mint
    function manualMint(address to, uint256 qty) public onlyOwner {
        require(totalSupply() + qty <= maxSupply, "exceeds max supply");
        for (uint i = 0; i < qty; i++) {
            _safeMint(to, totalSupply() + 1);
        }
    }

    /// @notice Sets whitelist merkle tree root (only accessible to contract owner)
    /// @param root Merkle tree root
    function setWhitelistRoot(bytes32 root) external onlyOwner { _whitelistRoot = root; }

    function verifyWhitelist(bytes32[] memory proof) internal view returns (bool)
    {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        return MerkleProof.verify(proof, _whitelistRoot, leaf);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Sets metadata base URI (only accessible to contract owner)
    /// @param baseURI The new base uri (ex. https://mynft.com/metadata/)
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /// @notice Gets the metadata uri of the specified token ID
    /// @param tokenId Token ID
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory)
    {
        require(_exists(tokenId), "token does not exist");

        string memory _tokenURI = super.tokenURI(tokenId);
        return bytes(_tokenURI).length > 0 ? string(abi.encodePacked(_tokenURI, ".json")) : "";
    }

    /// @notice Partner 1 wallet address
    address payable public partner1;
    /// @notice Partner 1 commission percentage
    uint public partner1Percentage;
    /// @notice Partner 2 wallet address
    address payable public partner2;
    /// @notice Partner 2 commission percentage
    uint public partner2Percentage;

    /// @notice Set partner 1 address and commission percentage
    /// @param partner Partner 1's wallet address
    /// @param percentage Partner 1's commission percentage
    function setPartner1(address payable partner, uint percentage) public onlyOwner {
        partner1 = partner;
        partner1Percentage = percentage;
    }

    /// @notice Set partner 2 address and commission percentage
    /// @param partner Partner 2's wallet address
    /// @param percentage Partner 2's commission percentage
    function setPartner2(address payable partner, uint percentage) public onlyOwner {
        partner2 = partner;
        partner2Percentage = percentage;
    }

    /// @notice Withdraw entire contract balance to owner minus partner's commission
    function withdraw() external onlyOwner nonReentrant {
        require(partner1Percentage + partner2Percentage <= 50, 'partners cannot have more than half');
        if (partner1 != payable(0) && partner1Percentage > 0) {
            uint partner1Cut = address(this).balance * partner1Percentage / 100;
            partner1.transfer(partner1Cut);
        }

        if (partner1 != payable(0) && partner1Percentage > 0) {
            uint partner2Cut = address(this).balance * partner2Percentage / 100;
            partner2.transfer(partner2Cut);
        }

        payable(msg.sender).transfer(address(this).balance);
    }

    /// @notice Withdraw all ERC20 tokens by token address to owner address
    /// @param tokenAddress ERC20 token contract address
    function withdrawERC20(address tokenAddress) external onlyOwner nonReentrant {
        IERC20 tokenContract = IERC20(tokenAddress);

        uint256 totalBalance = tokenContract.balanceOf(address(this));
        tokenContract.transfer(msg.sender, totalBalance);
    }

    /// @notice Withdraw ERC721 token to owner
    /// @param _tokenContract ERC721 token contract address
    /// @param _tokenID ERC721 NFT Token ID
    function withdrawERC721(address _tokenContract, uint256 _tokenID) external onlyOwner nonReentrant {
        IERC721 tokenContract = IERC721(_tokenContract);
        tokenContract.safeTransferFrom(address(this), msg.sender, _tokenID);
    }

    /// @notice Withdraw ERC1155 token/s to owner
    /// @param _tokenContract ERC1155 token contract address
    /// @param _tokenID ERC1155 Token ID
    /// @param _amount Number of tokens
    /// @param _data See ERC1155 implementation (usually just empty string)
    function withdrawERC1155(address _tokenContract, uint256 _tokenID, uint256 _amount, bytes memory _data) external onlyOwner nonReentrant {
        IERC1155 tokenContract = IERC1155(_tokenContract);
        tokenContract.safeTransferFrom(address(this), msg.sender, _tokenID, _amount, _data);
    }
}
