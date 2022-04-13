import { task } from "hardhat/config";
import { parseUnits } from "ethers/lib/utils";
import * as fs from "fs";

const rinkebyContractInfo = require("./DeployedContractsRinkeby.json");
const ropstenContractInfo = require("./DeployedContractsRopsten.json");

task("bridgeRedeem", "Redeem swapped tokens.")
    .addOptionalParam("destinationAddress", "Destination address")
    .addParam("amount", "Amount of tokens to be redeemed")
    .addParam("swapId", "Id of swap receipt")
    .addParam("validatorSignature", "Signature of bridge validator for corresponded swap id")
    .setAction(async (taskArgs, hre) => {
        const [user, validatorFromRinkeby, validatorFromRopsten] = await hre.ethers.getSigners();

        const currentNetwork = await hre.ethers.provider.getNetwork();
        const bridgeContractAddress =
            currentNetwork.name === "rinkeby"
                ? rinkebyContractInfo.bridgeTokenAddress
                : ropstenContractInfo.bridgeTokenAddress;

        const bridgeContract = await hre.ethers.getContractAt("BridgeToken", bridgeContractAddress);

        const tx = await bridgeContract.redeem(
            taskArgs.destinationAddress,
            parseUnits(taskArgs.amount),
            taskArgs.swapId,
            taskArgs.validatorSignature
        );
        console.log(`Reedem successfully:`, tx);
    });
