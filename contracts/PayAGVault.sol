// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PayAGVault {
    address payable public immutable buyer;
    address payable public immutable seller;
    bytes32 public immutable requiredTaskHash;
    bool public isReleased;

    mapping(address => bool) public authorizedSubmitters;

    event AuthorizedSubmitterUpdated(address indexed submitter, bool allowed);
    event FundsReleased(address indexed vault, address indexed buyer, address indexed seller, uint256 amount);

    constructor(address payable _buyer, address payable _seller, bytes32 _requiredTaskHash) payable {
        require(_buyer != address(0), "Invalid buyer");
        require(_seller != address(0), "Invalid seller");
        require(_requiredTaskHash != bytes32(0), "Invalid task hash");

        buyer = _buyer;
        seller = _seller;
        requiredTaskHash = _requiredTaskHash;
        authorizedSubmitters[_buyer] = true;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer");
        _;
    }

    modifier onlyAuthorizedSubmitter() {
        require(authorizedSubmitters[msg.sender], "Unauthorized sender");
        _;
    }

    function setAuthorizedSubmitter(address submitter, bool allowed) external onlyBuyer {
        require(submitter != address(0), "Invalid submitter");
        authorizedSubmitters[submitter] = allowed;
        emit AuthorizedSubmitterUpdated(submitter, allowed);
    }

    function verifyAndRelease(string calldata proofString) external onlyAuthorizedSubmitter {
        require(!isReleased, "Already released");

        bytes32 computedHash = keccak256(bytes(proofString));
        require(computedHash == requiredTaskHash, "Invalid proof");

        isReleased = true;
        uint256 amount = address(this).balance;
        seller.transfer(amount);

        emit FundsReleased(address(this), buyer, seller, amount);
    }
}

contract PayAGFactory {
    struct VaultInfo {
        address vaultAddress;
        address buyer;
        address seller;
        bytes32 requiredTaskHash;
        uint256 amount;
        bool isReleased;
    }

    address[] private vaults;
    mapping(address => VaultInfo) public vaultInfoByAddress;

    event VaultCreated(
        address indexed vaultAddress,
        address indexed buyer,
        address indexed seller,
        bytes32 requiredTaskHash,
        uint256 amount
    );

    function createVault(address payable _seller, bytes32 _taskHash) external payable returns (address) {
        require(msg.value > 0, "No funds provided");
        require(_seller != address(0), "Invalid seller");
        require(_taskHash != bytes32(0), "Invalid task hash");

        PayAGVault vault = (new PayAGVault){value: msg.value}(payable(msg.sender), _seller, _taskHash);
        address vaultAddress = address(vault);

        vaults.push(vaultAddress);
        vaultInfoByAddress[vaultAddress] = VaultInfo({
            vaultAddress: vaultAddress,
            buyer: msg.sender,
            seller: _seller,
            requiredTaskHash: _taskHash,
            amount: msg.value,
            isReleased: false
        });

        emit VaultCreated(vaultAddress, msg.sender, _seller, _taskHash, msg.value);
        return vaultAddress;
    }

    function getVaults() external view returns (address[] memory) {
        return vaults;
    }
}
