// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

// @title GoingUP Platform Accounts Smart Contract
// @author Mark Ibanez - mark.ibanez@gmail.com (github)
contract GoingUpAccounts is AccessControl {
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    using EnumerableSet for EnumerableSet.AddressSet;

    /// @notice This modifier checks if caller is an admin
    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _;
    }

    /// @notice This mapping returns a value for a given key and user handle
    /// @dev For example, if you want to get the user's first name, you would call userData[handle]["firstName"]
    mapping (string => mapping (string => string)) public userData;

    /// @notice This mapping contains the enumerable set of addresses for a given user handle
    /// @dev For example, if you want to get the user's addresses, you would call userAddresses[handle]
    mapping (string => EnumerableSet.AddressSet) private userAddresses;

    /// @notice this event is emitted when a user handle's address list is modified
    /// @param handle The user handle (indexed)
    /// @param addr The address that was added or removed
    /// @param operation The operation that was performed
    event AddressListModified(string indexed handle, address addr, string operation);

    /// @notice This function claims a user handle
    /// @param handle The user handle to claim
    /// @dev User can only claim a handle if it is not already taken
    function claimHandle(string memory handle) public {
        require(!userAddresses[handle].contains(msg.sender), "You already own this handle");
        require(userAddresses[handle].length() == 0, "This handle is already taken");
        userAddresses[handle].add(msg.sender);
        emit AddressListModified(handle, msg.sender, "add");
    }

    /// @notice This function adds an address to a user handle
    /// @param handle The user handle to add the address to
    /// @param addr The address to add to the user handle
    /// @dev User can only add an address to a handle if they own the handle
    function addAddress(string memory handle, address addr) public {
        require(userAddresses[handle].contains(msg.sender), "You do not own this handle");
        userAddresses[handle].add(addr);
        emit AddressListModified(handle, addr, "add");
    }

    /// @notice This function removes an address from a user handle
    /// @param handle The user handle to remove the address from
    /// @param addr The address to remove from the user handle
    /// @dev User can only remove an address from a handle if they own the handle
    function removeAddress(string memory handle, address addr) public {
        require(userAddresses[handle].contains(msg.sender), "You do not own this handle");
        userAddresses[handle].remove(addr);
        emit AddressListModified(handle, addr, "remove");
    }

    /// @notice This admin function assigns a user handle to an address
    /// @param handle The user handle to assign
    /// @param addr The address to assign the user handle to
    /// @dev Admin can assign a user handle to an address
    /// @dev This function is useful for recovery, or for reassigning a famous user handle
    /// @dev This function clears all addresses previously assigned to the handle
    function assignHandle(string memory handle, address addr) public onlyAdmin {
        for (uint256 i = 0; i < userAddresses[handle].length(); i++) {
            emit AddressListModified(handle, userAddresses[handle].at(i), "remove");
        }
        userAddresses[handle].clear();

        userAddresses[handle].add(addr);
        emit AddressListModified(handle, addr, "add");
    }

    /// @notice This function returns the number of addresses assigned to a user handle
    /// @param handle The user handle to get the number of addresses for
    /// @return The number of addresses assigned to the user handle
    function getNumAddresses(string memory handle) public view returns (uint256) {
        return userAddresses[handle].length();
    }

    /// @notice This function returns the address at a given index for a user handle
    /// @param handle The user handle to get the address for
    /// @param index The index of the address to get
    /// @return The address at the given index for the user handle
    function getAddressAtIndex(string memory handle, uint256 index) public view returns (address) {
        return userAddresses[handle].at(index);
    }

    /// @notice This function returns true if the address is assigned to the user handle
    /// @param handle The user handle to check
    /// @param addr The address to check
    /// @return True if the address is assigned to the user handle
    function isAddressAssigned(string memory handle, address addr) public view returns (bool) {
        return userAddresses[handle].contains(addr);
    }

    /// @notice This function sets a user's data
    /// @param handle The user handle to set the data for
    /// @param keys The keys to set the data for
    /// @param values The values to set the data to
    /// @dev User can only set data for a handle if they own the handle
    function setData(string memory handle, string[] memory keys, string[] memory values) public {
        require(userAddresses[handle].contains(msg.sender), "You do not own this handle");
        require(keys.length == values.length, "Keys and values must be the same length");
        require(keys.length <= 10, "You can only set 10 keys at a time");
        for (uint256 i = 0; i < keys.length; i++) {
            userData[handle][keys[i]] = values[i];
        }
    }
}