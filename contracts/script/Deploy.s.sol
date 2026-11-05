// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Passmark} from "../contracts/Passmark.sol";
interface DeployVm {
    function envAddress(string calldata) external returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
}
contract Deploy {
    DeployVm constant vm = DeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    function run() external returns (Passmark deployed) {
        require(block.chainid == 84532 || block.chainid == 31337, "Test networks only");
        address admin = vm.envAddress("PASSMARK_ADMIN_ADDRESS");
        require(admin != address(0), "Admin required");
        vm.startBroadcast(); deployed = new Passmark(admin); vm.stopBroadcast();
    }
}
