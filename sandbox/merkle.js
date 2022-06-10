const merkle = require('./../utils/merkle');

const address = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const list = [
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
];
const proof = merkle.getProof(address, list);
console.log(proof);