// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Passmark} from "../contracts/Passmark.sol";
interface Vm { function prank(address) external; function expectRevert() external; }
contract PassmarkTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    Passmark pass;
    address constant attendee = address(0xA11CE);
    function setUp() public { pass = new Passmark(address(this)); pass.registerEvent(1, address(this)); }
    function testMintToEmbeddedAccount() public {
        uint256 id = pass.mint(attendee, 1, bytes32(0));
        require(pass.ownerOf(id) == attendee && pass.locked(id));
    }
    function testAttendeeCannotMint() public {
        vm.prank(attendee); vm.expectRevert(); pass.mint(attendee, 1, bytes32(0));
    }
    function testTransfersLocked() public {
        uint256 id = pass.mint(attendee, 1, bytes32(0));
        vm.prank(attendee); vm.expectRevert(); pass.transferFrom(attendee, address(0xB0B), id);
    }
    function testReissueAndRevoke() public {
        uint256 oldId = pass.mint(attendee, 1, bytes32(0));
        uint256 id = pass.reissue(oldId, address(0xB0B));
        require(pass.ownerOf(id) == address(0xB0B));
        vm.expectRevert(); pass.ownerOf(oldId);
        pass.revoke(id); vm.expectRevert(); pass.ownerOf(id);
    }
}
