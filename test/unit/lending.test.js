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
                  // 1 WBTC = $2,000 & ETH = $1,0000
                  const oneEthOfWbtc = ethers.utils.parseEther("0.5")
                  const ethValueOfWbtc = await lending.getEthValue(wbtc.address, oneEthOfWbtc)
                  assert.equal(ethValueOfWbtc.toString(), ethers.utils.parseEther("1").toString())
              })
          })
          describe("getTokenValueFromEth", function () {
              it("correctly gets Dai price", async function () {
                  // 1 DAI = $1 & ETH = $1,000
                  const oneDaiOfEth = ethers.utils.parseEther("0.001")
                  const DaiValueOfEth = await lending.getTokenValueFromEth(dai.address, oneDaiOfEth)
                  assert.equal(DaiValueOfEth.toString(), await ethers.utils.parseEther("1").toString())
              })
              it("correctly gets wbtc price", async function () {
                //1 WBTC = $2,000 & ETH = $1,0000
                const oneWbtcOfEth = ethers.utils.parseEther("2")
                const WbtcValueOfEth = await lending.getTokenValueFromEth(wbtc.address, oneWbtcOfEth)
                assert.equal(WbtcValueOfEth.toString(), await ethers.utils.parseEther("1").toString())
            })
          })
      })