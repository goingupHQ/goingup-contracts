require('dotenv').config();
require('@openzeppelin/hardhat-upgrades');
// require('@nomiclabs/hardhat-waffle');
// require('hardhat-docgen');

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
    // docgen: {
    //     path: './docs/',
    //     clear: true,
    //     runOnCompile: true
    // },
    networks: {
        goerli: {
            url: process.env.ALCHEMY_URL_GOERLI,
            accounts: [process.env.DEPLOYER_PK],
        },
        polygonMumbai: {
            url: process.env.ALCHEMY_URL_MUMBAI,
            accounts: [process.env.DEPLOYER_PK],
        },
        polygon: {
            url: process.env.ALCHEMY_URL_POLYGON,
            accounts: [process.env.DEPLOYER_PK],
        },
        xrplDevnet: {
            url: 'https://rpc-evm-sidechain.xrpl.org',
            accounts: [process.env.DEPLOYER_PK],
        }
    },
    etherscan: {
        apiKey: {
            // ethereum
            mainnet: process.env.ETHERSCAN_API_KEY,
            goerli: process.env.ETHERSCAN_API_KEY,

            // polygon
            polygonMumbai: process.env.POLYGONSCAN_API_KEY,
            polygon: process.env.POLYGONSCAN_API_KEY,
        }
    },
};
