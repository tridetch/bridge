import { task } from "hardhat/config";
import { parseUnits } from "ethers/lib/utils";
import { utils } from "ethers";
import * as fs from "fs";
import { use } from "chai";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const rinkebyContractInfo = require("./DeployedContractsRinkeby.json");
const ropstenContractInfo = require("./DeployedContractsRopsten.json");

task("bridgeSwap", "Process swap tokens to other evm network")
    .addParam("amount", "Amount of tokens to be swapped")
    .addOptionalParam("destinationAddress", "Destination address", ZERO_ADDRESS)
    .setAction(async (taskArgs, hre) => {
        console.log("Processing task...");
        const [user, validatorFromRinkeby, validatorFromRopsten] = await hre.ethers.getSigners();
        const currentNetwork = await hre.ethers.provider.getNetwork();

        const bridgeContractAddress =
            currentNetwork.name === "rinkeby"
                ? rinkebyContractInfo.bridgeTokenAddress
                : ropstenContractInfo.bridgeTokenAddress;
        const validator = currentNetwork.name === "rinkeby" ? validatorFromRinkeby : validatorFromRopsten;
        const bridgeContract = await hre.ethers.getContractAt("BridgeToken", bridgeContractAddress);

        const swapId = await bridgeContract.swapId();
        await bridgeContract.swap(taskArgs.destinationAddress, parseUnits(taskArgs.amount));

        const destinationAddress =
            taskArgs.destinationAddress === ZERO_ADDRESS ? user.address : taskArgs.destinationAddress;
        const msg = utils.solidityKeccak256(
            ["address", "uint256", "uint256"],
            [destinationAddress, parseUnits(taskArgs.amount), swapId]
        );

        const signature = await validator.signMessage(utils.arrayify(msg));
        const destinationNetwork = currentNetwork.name === "rinkeby" ? "ropsten" : "rinkeby";
        const swapReceipt = {
            destinationNetwork: destinationNetwork,
            amount: taskArgs.amount,
            swapId: swapId.toString(),
            destinationAddress: taskArgs.destinationAddress === ZERO_ADDRESS ? user.address : destinationAddress,
            validator: validator.address,
            signature: signature,
        };

        console.log("Swap receipt saved to ./tasks/swap_receipts folder");
        console.log(swapReceipt);

        fs.writeFileSync(`./tasks/swap_receipts/swap_to_${destinationAddress}_${swapId}.json`, JSON.stringify(swapReceipt));
    });
