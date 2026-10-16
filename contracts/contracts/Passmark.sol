// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Passmark credentials
/// @notice One shared ERC-721 for every org. Each token is a ticket or member card for one event/tier.
/// Only proof lives here: holder, event, issuer, status, metadata hash. Names, venue and art stay off-chain.
/// Tokens are locked (ERC-5192) unless their event's issuer turns transfers on.
contract Passmark is ERC721, AccessControl {
    /// ERC-5192 minimal soulbound interface.
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);

    event EventRegistered(uint256 indexed eventId, address indexed issuer);
    event TransferableSet(uint256 indexed eventId, bool transferable);
    event CredentialMinted(uint256 indexed tokenId, address indexed holder, uint256 indexed eventId, bytes32 metadataHash);
    event CredentialRevoked(uint256 indexed tokenId, uint256 indexed eventId);
    event CredentialReissued(uint256 indexed oldTokenId, uint256 indexed newTokenId, address indexed newHolder);

    error EventExists(uint256 eventId);
    error UnknownEvent(uint256 eventId);
    error ZeroIssuer();
    error NotIssuer(uint256 eventId, address caller);
    error TransferLocked(uint256 tokenId);

    struct EventInfo {
        address issuer;
        bool transferable;
    }

    struct Credential {
        uint256 eventId;
        bytes32 metadataHash;
    }

    mapping(uint256 eventId => EventInfo) public events;
    mapping(uint256 tokenId => Credential) public credentials;
    uint256 private _nextTokenId = 1;

    constructor(address admin) ERC721("Passmark", "PASS") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    modifier onlyIssuerOrAdmin(uint256 eventId) {
        address issuer = events[eventId].issuer;
        if (issuer == address(0)) revert UnknownEvent(eventId);
        if (msg.sender != issuer && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotIssuer(eventId, msg.sender);
        _;
    }

    /// @notice Register an event or membership tier owned by an org's issuer address. Platform admin only.
    function registerEvent(uint256 eventId, address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (issuer == address(0)) revert ZeroIssuer();
        if (events[eventId].issuer != address(0)) revert EventExists(eventId);
        events[eventId].issuer = issuer;
        emit EventRegistered(eventId, issuer);
    }

    /// @notice Turn holder-to-holder transfers on or off for an event. Off by default.
    /// @dev ponytail: no per-token Locked/Unlocked on toggle (unbounded loop); indexers read TransferableSet.
    function setTransferable(uint256 eventId, bool transferable) external onlyIssuerOrAdmin(eventId) {
        events[eventId].transferable = transferable;
        emit TransferableSet(eventId, transferable);
    }

    function mint(address to, uint256 eventId, bytes32 metadataHash)
        external
        onlyIssuerOrAdmin(eventId)
        returns (uint256)
    {
        return _mintCredential(to, eventId, metadataHash);
    }

    function revoke(uint256 tokenId) external onlyIssuerOrAdmin(credentials[tokenId].eventId) {
        uint256 eventId = credentials[tokenId].eventId;
        _burn(tokenId);
        delete credentials[tokenId];
        emit CredentialRevoked(tokenId, eventId);
    }

    /// @notice Lost access: burn the old credential and mint the same one to a new holder.
    function reissue(uint256 tokenId, address newHolder)
        external
        onlyIssuerOrAdmin(credentials[tokenId].eventId)
        returns (uint256 newTokenId)
    {
        Credential memory c = credentials[tokenId];
        _burn(tokenId);
        delete credentials[tokenId];
        emit CredentialRevoked(tokenId, c.eventId);
        newTokenId = _mintCredential(newHolder, c.eventId, c.metadataHash);
        emit CredentialReissued(tokenId, newTokenId, newHolder);
    }

    /// @notice ERC-5192. Reverts for tokens that don't exist.
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return !events[credentials[tokenId].eventId].transferable;
    }

    function _mintCredential(address to, uint256 eventId, bytes32 metadataHash) private returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        credentials[tokenId] = Credential(eventId, metadataHash);
        _mint(to, tokenId);
        emit CredentialMinted(tokenId, to, eventId, metadataHash);
        if (events[eventId].transferable) emit Unlocked(tokenId);
        else emit Locked(tokenId);
    }

    /// @dev Mint and burn always pass; holder-to-holder moves need the event's transfer flag.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && !events[credentials[tokenId].eventId].transferable) {
            revert TransferLocked(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
