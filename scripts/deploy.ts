import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const currentNetwork = await ethers.provider.getNetwork();
    const [user, validatorFromRinkeby, validatorFromRopsten] = await ethers.getSigners();

    const BridgeFactory = await ethers.getContractFactory("BridgeToken");

    // get validator for current network
    const validator = currentNetwork.name === "rinkeby" ? validatorFromRopsten : validatorFromRinkeby;

    const bridge = await BridgeFactory.deploy("BridgeToken", "BST", validator.address);
    await bridge.deployed();

    // Mint initial funds to deployer
    await bridge.mint(user.address, parseUnits("1000"));

    const contract = {
        bridgeTokenAddress: bridge.address,
        validatorAddress: validator.address,
        deployer: user.address,
    };

    const filePath =
        currentNetwork.name === "rinkeby"
            ? "./tasks/DeployedContractsRinkeby.json"
            : "./tasks/DeployedContractsRopsten.json";

    fs.writeFile(filePath, JSON.stringify(contract), (err) => {
        console.log(err);
        if (err) throw err;
    });

    console.log("Contract deployed", contract);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
