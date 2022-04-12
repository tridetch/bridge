import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect, use } from "chai";
import { utils } from "ethers";
import { arrayify, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { BridgeToken } from "../typechain";

describe("Bridge", function () {
    let clean: any;

    let bridgeSideA: BridgeToken;
    let bridgeSideB: BridgeToken;

    let user: SignerWithAddress,
        user2: SignerWithAddress,
        validatorSideA: SignerWithAddress,
        validatorSideB: SignerWithAddress,
        imposter: SignerWithAddress;

    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const MINT_AMOUNT = parseUnits("1000");

    before(async () => {
        [user, user2, validatorSideA, validatorSideB, imposter] = await ethers.getSigners();

        const BridgeFactory = await ethers.getContractFactory("BridgeToken");

        bridgeSideA = await BridgeFactory.deploy("BridgeTokenSideA", "aBST", validatorSideA.address);
        await bridgeSideA.deployed();

        bridgeSideB = await BridgeFactory.deploy("BridgeTokenSideB", "bBST", validatorSideB.address);
        await bridgeSideB.deployed();

        // Mint initial funds for user
        await bridgeSideA.mint(user.address, MINT_AMOUNT);

        clean = await network.provider.send("evm_snapshot");
    });

    afterEach(async () => {
        await network.provider.send("evm_revert", [clean]);
        clean = await network.provider.send("evm_snapshot");
    });

    describe("Common methods", function () {
        describe("#constructor()", function () {
            it("Should set validator address on deploy", async function () {
                expect(await bridgeSideA.validator()).to.be.equal(validatorSideA.address);
            });
        });
        describe("#setValidator()", function () {
            it("Should set new validator", async () => {
                await bridgeSideA.setValidator(validatorSideB.address);
                expect(await bridgeSideA.validator()).to.be.equal(validatorSideB.address);
            });
        });
    });

    describe("Bridge methods", function () {
        describe("#swap()", function () {
            it("Should revert when user dont have enought funds", async function () {
                const swapAmount = MINT_AMOUNT.add(parseUnits("1100"));
                await expect(bridgeSideA.swap(ZERO_ADDRESS, swapAmount)).to.be.revertedWith(
                    "ERC20: burn amount exceeds balance"
                );
            });
            it("Should process swap to sender address when destination address not provided", async function () {
                const swapAmount = MINT_AMOUNT;
                const swapId = await bridgeSideA.swapId();

                //Event emited
                await expect(bridgeSideA.swap(ZERO_ADDRESS, swapAmount))
                    .to.emit(bridgeSideA, "SwapInitialized")
                    .withArgs(user.address, user.address, MINT_AMOUNT, swapId);
                //Tokens burned from sender address
                expect(await bridgeSideA.balanceOf(user.address)).to.be.equal(0);
                //SwapId incremented
                expect(await bridgeSideA.swapId()).to.be.equal(swapId.add(1));
            });
        });
        describe("#redeem()", function () {
            it("Should fail if swapId already used for withdraw", async () => {
                const swapAmount = parseUnits("420");
                const swapId = await bridgeSideA.swapId();
                await bridgeSideA.swap(user2.address, swapAmount);

                const msg = utils.solidityKeccak256(
                    ["address", "uint256", "uint256"],
                    [user2.address, swapAmount, swapId]
                );
                const signature = await validatorSideB.signMessage(arrayify(msg));

                await bridgeSideB.redeem(user2.address, swapAmount, swapId, signature);

                // Reverted because of double spend
                await expect(bridgeSideB.redeem(user2.address, swapAmount, swapId, signature)).to.be.revertedWith(
                    "Already redeemed"
                );
            });
            it("Should fail if signature not valid", async () => {
                const swapAmount = parseUnits("420");
                const swapId = await bridgeSideA.swapId();
                await bridgeSideA.swap(user2.address, swapAmount);

                const msg = utils.solidityKeccak256(
                    ["address", "uint256", "uint256"],
                    [user2.address, swapAmount, swapId]
                );
                const signature = await imposter.signMessage(arrayify(msg));

                // Reverted because of wrong signature
                await expect(bridgeSideB.redeem(user2.address, swapAmount, swapId, signature)).to.be.revertedWith(
                    "Signature not valid"
                );
            });
            it("Should process redeem successfully", async () => {
                const swapAmount = parseUnits("420");
                const swapId = await bridgeSideA.swapId();
                await bridgeSideA.swap(user2.address, swapAmount);

                const msg = utils.solidityKeccak256(
                    ["address", "uint256", "uint256"],
                    [user2.address, swapAmount, swapId]
                );
                const signature = await validatorSideB.signMessage(arrayify(msg));

                //Redeemed successfully
                await expect(bridgeSideB.redeem(user2.address, swapAmount, swapId, signature))
                    .to.emit(bridgeSideB, "Redeem")
                    .withArgs(user2.address, swapAmount, swapId);
                //Tokens minted to recipient
                expect(await bridgeSideB.balanceOf(user2.address)).to.be.equal(swapAmount);
                //SwapId marked as used
                assert(await bridgeSideB.redeemedSwaps(swapId), `Swap id ${swapId} not marked as redeemed`);
            });
        });
    });
});
