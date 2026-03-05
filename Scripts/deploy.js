import hre from "hardhat";

async function main() {
  const Factory = await hre.ethers.getContractFactory("PayAGFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("PayAGFactory deployed to:", await factory.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});