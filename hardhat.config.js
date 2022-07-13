require('@nomiclabs/hardhat-waffle');
require('hardhat-docgen');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

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
                version: '0.8.14',
            },
            {
                version: '0.8.15',
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
    }
};
