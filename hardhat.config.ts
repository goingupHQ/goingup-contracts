import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/.env' });

import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@typechain/hardhat';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.19',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                },
            },
        ]
    },
    networks: {
        hardhat: {
            accounts: {
                count: 200,
            },
        },
        goerli: {
            chainId: 5,
            url: process.env.ALCHEMY_URL_GOERLI,
            accounts: [process.env.DEPLOYER_PK!],
        },
        polygonMumbai: {
            chainId: 80001,
            url: process.env.ALCHEMY_URL_MUMBAI,
            accounts: [process.env.DEPLOYER_PK!],
        },
        polygon: {
            chainId: 137,
            url: process.env.ALCHEMY_URL_POLYGON,
            accounts: [process.env.DEPLOYER_PK!],
        },
        xrplDevnet: {
            url: 'https://rpc-evm-sidechain.xrpl.org',
            accounts: [process.env.DEPLOYER_PK!],
        }
    },
    // @ts-ignore
    etherscan: {
        apiKey: {
            // ethereum
            mainnet: process.env.ETHERSCAN_API_KEY!,
            goerli: process.env.ETHERSCAN_API_KEY!,

            // polygon
            polygonMumbai: process.env.POLYGONSCAN_API_KEY!,
            polygon: process.env.POLYGONSCAN_API_KEY!,
        }
    },
    typechain: {
        outDir: 'typechain',
        target: 'ethers-v5',
    }
};

export default config;