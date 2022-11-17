require('dotenv').config();
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-docgen');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    networks: {
        hardhat: {
            accounts: {
                count: 200,
            },
        },
    },
    solidity: {
        compilers: [
            {
                version: '0.8.17',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                },
            },
        ]
    },
    docgen: {
        path: './docs/',
        clear: true,
        runOnCompile: true
    },
    networks: {
        goerli: {
            url: process.env.ALCHEMY_URL_GOERLI,
            accounts: [process.env.DEPLOYER_PK],
        },
        mumbai: {
            url: process.env.ALCHEMY_URL_MUMBAI,
            accounts: [process.env.DEPLOYER_PK],
        },
        polygon: {
            url: process.env.ALCHEMY_URL_POLYGON,
            accounts: [process.env.DEPLOYER_PK],
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
};
