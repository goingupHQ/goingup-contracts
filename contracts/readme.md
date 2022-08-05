# GoingUpProjects - Smart Contract

- Solidity Compiler Version: ^0.8.15
- Minimal Dependencies
    - OpenZeppelin
        - IERC20
        - IERC721
        - IERC1155
        - EnumerableSet Utility
- Structs
    - Project - represents a project
    - ProjectMember - represents a member of a project
- Automated Tests with Hardhat
- Custom Role Management
    - Contract Owner (super admin, can add or remove contract admins)
    - Contract Admins (can access contract level functions)
    - Project Owner (can access project level functions)
    - Project Members
- Most functions have corresponding events
- Custom project data can be added