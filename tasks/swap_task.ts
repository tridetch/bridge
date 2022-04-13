import { task } from "hardhat/config";
import { parseUnits } from "ethers/lib/utils";
import { utils } from "ethers";
import * as fs from "fs";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const rinkebyContractInfo = require("./DeployedContractsRinkeby.json");
const ropstenContractInfo = require("./DeployedContractsRopsten.json");

task(
  "swap",
  "Proces swap tokens to other evm network"
  )
  .addParam("amount", "Amount of tokens to be swapped")
  .addOptionalParam("destinationAddress", "Amount of tokens to be swapped", ZERO_ADDRESS)
  .setAction(async (taskArgs, hre) => {
    const [user, validatorFromRinkeby, validatorFromRopsten] = await hre.ethers.getSigners();
    
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const bridgeContractAddress =
            currentNetwork.name === "rinkeby"
                ? rinkebyContractInfo.brigeTokenAddress
                : ropstenContractInfo.bridgeTokenAddress;
        const validator = currentNetwork.name === "rinkeby" ? validatorFromRinkeby : validatorFromRopsten;

        const bridgeContract = await hre.ethers.getContractAt("BridgeToken", bridgeContractAddress);

        const swapId = await bridgeContract.swapId();
        await bridgeContract.swap(taskArgs.destinationAddress, parseUnits(taskArgs.amount));

        const msg = utils.solidityKeccak256(
            ["address", "uint256", "uint256"],
            [taskArgs.destinationAddress, taskArgs.amount, swapId]
        );

        const signature = await validator.signMessage(utils.arrayify(msg));
        const swapReceipt = {
            destinationNetwork: currentNetwork.name === "rinkeby" ? "ropsten" : "rinkeby",
            swapId: swapId,
            destinationAddress: taskArgs.destinationAddress,
            signature: signature,
        };

        console.log("Swap receipt saved to ./tasks/swap_receipts folder");
        console.log(swapReceipt);

        fs.writeFile(`./swap_receipts/swap_${swapId}.json`, JSON.stringify(swapReceipt), (err) => {
            if (err) throw err;
        });
    });
