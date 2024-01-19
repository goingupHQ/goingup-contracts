export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DEPLOYER_PK: string;
      ALCHEMY_URL_GOERLI: string;
      ALCHEMY_URL_MUMBAI: string;
      ALCHEMY_URL_POLYGON: string;
      ETHERSCAN_API_KEY: string;
      POLYGONSCAN_API_KEY: string;
    }
  }
}
