import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BridgeToken } from "../typechain";

describe("Bridge", function () {
    let clean: any;

    let bridgeSideA: BridgeToken;
    let bridgeSideB: BridgeToken;

    let user: SignerWithAddress, validatorSideA: SignerWithAddress, validatorSideB: SignerWithAddress;

    const TEST_TOKEN_URI = "https://gateway.pinata.cloud/ipfs/QmcrrUjqWbUAKhqC84W2Bb6aGpbB7K4WWuYTwzgKZbgzSD";
    const TOKEN_ID = 0;

    before(async () => {
        [user, validatorSideA, validatorSideB] = await ethers.getSigners();

        const BridgeFactory = await ethers.getContractFactory("BridgeToken");
        
        bridgeSideA = await BridgeFactory.deploy("BridgeTokenSideA", "aBST", validatorSideA.address);
        await bridgeSideA.deployed();

        bridgeSideB = await BridgeFactory.deploy("BridgeTokenSideB", "bBST", validatorSideB.address);
        await bridgeSideB.deployed();
        
        clean = await network.provider.send("evm_snapshot");
    });

    afterEach(async () => {
        await network.provider.send("evm_revert", [clean]);
        clean = await network.provider.send("evm_snapshot");
    });

    it("Should return the new greeting once it's changed", async function () {
        const Greeter = await ethers.getContractFactory("Greeter");
        const greeter = await Greeter.deploy("Hello, world!");
        await greeter.deployed();

        expect(await greeter.greet()).to.equal("Hello, world!");

        const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

        // wait until the transaction is mined
        await setGreetingTx.wait();

        expect(await greeter.greet()).to.equal("Hola, mundo!");
    });
});
