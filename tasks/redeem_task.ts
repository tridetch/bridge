import { task } from "hardhat/config";
import { parseUnits } from "ethers/lib/utils";
import * as fs from "fs";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const rinkebyContractInfo = require("./DeployedContractsRinkeby.json");
const ropstenContractInfo = require("./DeployedContractsRopsten.json");

task("bridgeRedeem", "Redeem swapped tokens.")
    .addOptionalParam("destinationAddress", "Amount of tokens to be swapped")
    .addParam("amount", "Amount of tokens to be redeemed")
    .addParam("swapId", "Id of swap receipt")
    .addParam("validatorSignature", "Signature of bridge validator for corresponded swap id")
    .setAction(async (taskArgs, hre) => {
        const [user, validatorFromRinkeby, validatorFromRopsten] = await hre.ethers.getSigners();

        const currentNetwork = await hre.ethers.provider.getNetwork();
        const bridgeContractAddress =
            currentNetwork.name === "rinkeby"
                ? rinkebyContractInfo.brigeTokenAddress
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
