const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { moveBlocks } = require("../utils/move-blocks")
const { moveTime } = require("../utils/move-time")

const BTC_UPDATED_PRICE = ethers.utils.parseEther("1.9")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lending Unit Tests", function () {
          let lending, dai, wbtc, depositAmount, randomToken, player, threshold, wbtcEthPriceFeed
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["mocks", "lending"])
              lending = await ethers.getContract("Lending")
              wbtc = await ethers.getContract("WBTC")
              dai = await ethers.getContract("DAI")
              randomToken = await ethers.getContract("RandomToken")
              wbtcEthPriceFeed = await ethers.getContract("WBTC")
              daiEthPriceFeed = await ethers.getContract("DAI")
              depositAmount = ethers.utils.parseEther("1")
              threshold = await lending.LIQUIDATION_THRESHOLD()
              wbtcEthPriceFeed = await ethers.getContract("WBTCETHPriceFeed")
          })

          describe("getEthValue", function () {
              // 1 DAI = $1 & ETH = $1,0000
              it("Correctly gets DAI price", async function () {
                  const oneEthOfDai = ethers.utils.parseEther("1000")
                  const ethValueOfDai = await lending.getEthValue(dai.address, oneEthOfDai)
                  assert.equal(ethValueOfDai.toString(), ethers.utils.parseEther("1").toString())
              })
              it("Correctly gets WBTC price", async function () {
                  // 1 WBTC = $2,000 & ETH = $1,000
                  const oneEthOfWbtc = ethers.utils.parseEther("1")
                  const ethValueOfWbtc = await lending.getEthValue(wbtc.address, oneEthOfWbtc)
                  assert.equal(ethValueOfWbtc.toString(), ethers.utils.parseEther("2").toString())
              })
          })
          describe("getTokenValueFromEth", function () {
              it("correctly gets Dai price", async function () {
                  // 1 DAI = $1 & ETH = $1,000
                  const oneDaiOfEth = ethers.utils.parseEther("0.001")
                  const DaiValueOfEth = await lending.getTokenValueFromEth(dai.address, oneDaiOfEth)
                  assert.equal(
                      DaiValueOfEth.toString(),
                      await ethers.utils.parseEther("1").toString()
                  )
              })
              it("correctly gets wbtc price", async function () {
                  //1 WBTC = $2,000 & ETH = $1,000
                  const oneWbtcOfEth = ethers.utils.parseEther("2")
                  const WbtcValueOfEth = await lending.getTokenValueFromEth(
                      wbtc.address,
                      oneWbtcOfEth
                  )
                  assert.equal(
                      WbtcValueOfEth.toString(),
                      await ethers.utils.parseEther("1").toString()
                  )
              })
          })
          describe("Deposit", function () {
              it("Deposits money", async function () {
                  await wbtc.approve(lending.address, depositAmount)
                  await lending.deposit(wbtc.address, depositAmount)
                  const accountInfo = await lending.getAccountInformation(deployer.address)
                  assert.equal(accountInfo[0].toString(), "0")
                  // WBTC is 2x the price of ETH in our scenario, so we should see that value reflected
                  assert.equal(accountInfo[1].toString(), depositAmount.mul(2).toString())
                  const healthfactor = await lending.healthFactor(deployer.address)
                  assert.equal(
                      healthfactor.toString(),
                      await ethers.utils.parseEther("100").toString()
                  )
              })
              it("Doesn't allow unallowed tokens", async function () {
                  await randomToken.approve(lending.address, depositAmount)
                  await expect(
                      lending.deposit(randomToken.address, depositAmount)
                  ).to.be.revertedWith("TokenNotAllowed")
              })
          })

          describe("Withdraw", function () {
              it("it pulls money", async function () {
                  await wbtc.approve(lending.address, depositAmount)
                  await lending.deposit(wbtc.address, depositAmount)
                  await lending.withdraw(wbtc.address, depositAmount)
                  const accountInfo = await lending.getAccountInformation(deployer.address)
                  assert.equal(accountInfo[0], "0")
                  assert.equal(accountInfo[1], "0")
              })
              it("reverts if the user doesnt have eneogh money", async function () {
                  await wbtc.approve(lending.address, depositAmount)
                  await lending.deposit(wbtc.address, depositAmount)
                  await expect(
                      lending.withdraw(wbtc.address, depositAmount.mul(2))
                  ).to.be.revertedWith("Not enough funds")
              })
          })
          describe("Borrow", function () {
              it("cant pull money out that will make the platform go insolvent", async function () {
                  await wbtc.approve(lending.address, depositAmount)
                  await lending.deposit(dai.address, depositAmount)
                  //. Setup the contract to have enough DAI to borrow
                  // Our daiBorrowAmount is set to 80% of 2000 + 1, since the threshold is 80%
                  // And this should be enought to not let us borrow this amount
                  const daiBorrowAmount = ethers.utils.parseEther(
                      (200 * (threshold.toNumber() / 100) + 1).toString()
                  )
                  const daiEthValue = await lending.getEthValue(dai.address, daiBorrowAmount)
                  const wbtcEthValue = await lending.getEthValue(wbtc.address, depositAmount)
                  console.log(
                      `Going to attempt to borrow ${ethers.utils.formatEther(
                          daiEthValue
                      )} ETH worth of DAI (${ethers.utils.formatEther(daiBorrowAmount)} DAI)\n`
                  )
                  console.log(
                      `With only ${ethers.utils.formatEther(
                          wbtcEthValue
                      )} ETH of WBTC (${ethers.utils.formatEther(
                          depositAmount
                      )} WBTC) deposited. \n`
                  )
              })
          })
      })
