// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PayAGVault {
    struct Milestone {
        bytes32 proofHash;
        uint256 payoutAmount;
        bool isReleased;
    }

    address payable public immutable buyer;
    address payable public immutable seller;
    bool public isReleased;
    uint256 public totalPayoutAmount;
    uint256 public releasedAmount;
    uint256 public completedMilestones;

    mapping(address => bool) public authorizedSubmitters;
    Milestone[] private milestones;

    event AuthorizedSubmitterUpdated(address indexed submitter, bool allowed);
    event MilestoneReleased(
        address indexed vault,
        uint256 indexed milestoneIndex,
        bytes32 indexed proofHash,
        uint256 amount,
        uint256 completedMilestones,
        uint256 totalMilestones
    );

    constructor(
        address payable _buyer,
        address payable _seller,
        bytes32[] memory _milestoneProofHashes,
        uint256[] memory _milestonePayouts
    ) payable {
        require(_buyer != address(0), "Invalid buyer");
        require(_seller != address(0), "Invalid seller");
        require(_milestoneProofHashes.length > 0, "No milestones");
        require(_milestoneProofHashes.length == _milestonePayouts.length, "Length mismatch");

        buyer = _buyer;
        seller = _seller;
        authorizedSubmitters[_buyer] = true;

        uint256 aggregatePayout;
        for (uint256 i = 0; i < _milestoneProofHashes.length; i++) {
            require(_milestoneProofHashes[i] != bytes32(0), "Invalid proof hash");
            require(_milestonePayouts[i] > 0, "Invalid payout");

            milestones.push(
                Milestone({
                    proofHash: _milestoneProofHashes[i],
                    payoutAmount: _milestonePayouts[i],
                    isReleased: false
                })
            );

            aggregatePayout += _milestonePayouts[i];
        }

        require(msg.value == aggregatePayout, "Funding mismatch");
        totalPayoutAmount = aggregatePayout;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer");
        _;
    }

    modifier onlyAuthorizedSubmitter() {
        require(authorizedSubmitters[msg.sender], "Unauthorized sender");
        _;
    }

    function milestonesCount() external view returns (uint256) {
        return milestones.length;
    }

    function getMilestone(uint256 milestoneIndex)
        external
        view
        returns (bytes32 proofHash, uint256 payoutAmount, bool released)
    {
        require(milestoneIndex < milestones.length, "Milestone OOB");
        Milestone storage milestone = milestones[milestoneIndex];
        return (milestone.proofHash, milestone.payoutAmount, milestone.isReleased);
    }

    function setAuthorizedSubmitter(address submitter, bool allowed) external onlyBuyer {
        require(submitter != address(0), "Invalid submitter");
        authorizedSubmitters[submitter] = allowed;
        emit AuthorizedSubmitterUpdated(submitter, allowed);
    }

    function verifyAndRelease(uint256 milestoneIndex, string calldata proofString)
        external
        onlyAuthorizedSubmitter
    {
        require(!isReleased, "Vault released");
        require(milestoneIndex < milestones.length, "Milestone OOB");

        Milestone storage milestone = milestones[milestoneIndex];
        require(!milestone.isReleased, "Milestone released");

        bytes32 computedHash = keccak256(bytes(proofString));
        require(computedHash == milestone.proofHash, "Invalid proof");

        milestone.isReleased = true;
        releasedAmount += milestone.payoutAmount;
        completedMilestones += 1;

        if (completedMilestones == milestones.length) {
            isReleased = true;
        }

        seller.transfer(milestone.payoutAmount);

        emit MilestoneReleased(
            address(this),
            milestoneIndex,
            milestone.proofHash,
            milestone.payoutAmount,
            completedMilestones,
            milestones.length
        );
    }
}

contract PayAGFactory {
    struct VaultInfo {
        address vaultAddress;
        address buyer;
        address seller;
        uint256 totalAmount;
        uint256 milestonesTotal;
    }

    address[] private vaults;
    mapping(address => VaultInfo) public vaultInfoByAddress;

    event VaultCreated(
        address indexed vaultAddress,
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        uint256 milestonesTotal
    );

    event BatchVaultsCreated(address indexed buyer, uint256 count, uint256 totalAmount);

    function createVault(address payable _seller, bytes32 _taskHash) external payable returns (address) {
        bytes32[] memory milestoneHashes = new bytes32[](1);
        milestoneHashes[0] = _taskHash;

        uint256[] memory milestonePayouts = new uint256[](1);
        milestonePayouts[0] = msg.value;

        return createVaultWithMilestones(_seller, milestoneHashes, milestonePayouts);
    }

    function createVaultWithMilestones(
        address payable _seller,
        bytes32[] memory _milestoneProofHashes,
        uint256[] memory _milestonePayouts
    ) public payable returns (address) {
        require(_seller != address(0), "Invalid seller");
        require(_milestoneProofHashes.length > 0, "No milestones");
        require(_milestoneProofHashes.length == _milestonePayouts.length, "Length mismatch");

        uint256 vaultTotal;
        for (uint256 i = 0; i < _milestonePayouts.length; i++) {
            require(_milestonePayouts[i] > 0, "Invalid payout");
            require(_milestoneProofHashes[i] != bytes32(0), "Invalid proof hash");
            vaultTotal += _milestonePayouts[i];
        }

        require(msg.value == vaultTotal, "Funding mismatch");

        PayAGVault vault = (new PayAGVault){value: msg.value}(
            payable(msg.sender),
            _seller,
            _milestoneProofHashes,
            _milestonePayouts
        );

        address vaultAddress = address(vault);
        vaults.push(vaultAddress);

        vaultInfoByAddress[vaultAddress] = VaultInfo({
            vaultAddress: vaultAddress,
            buyer: msg.sender,
            seller: _seller,
            totalAmount: msg.value,
            milestonesTotal: _milestoneProofHashes.length
        });

        emit VaultCreated(vaultAddress, msg.sender, _seller, msg.value, _milestoneProofHashes.length);
        return vaultAddress;
    }

    function createBatchVaults(
        address payable[] calldata _workers,
        bytes32[] calldata _taskHashes,
        uint256[] calldata _amounts
    ) external payable returns (address[] memory) {
        require(_workers.length > 0, "No workers");
        require(_workers.length == _taskHashes.length, "Length mismatch");
        require(_workers.length == _amounts.length, "Length mismatch");

        uint256 aggregateTotal;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_workers[i] != address(0), "Invalid worker");
            require(_taskHashes[i] != bytes32(0), "Invalid task hash");
            require(_amounts[i] > 0, "Invalid amount");
            aggregateTotal += _amounts[i];
        }
        require(msg.value == aggregateTotal, "Funding mismatch");

        address[] memory createdVaults = new address[](_workers.length);

        for (uint256 i = 0; i < _workers.length; i++) {
            bytes32[] memory milestoneHashes = new bytes32[](1);
            milestoneHashes[0] = _taskHashes[i];

            uint256[] memory milestonePayouts = new uint256[](1);
            milestonePayouts[0] = _amounts[i];

            PayAGVault vault = (new PayAGVault){value: _amounts[i]}(
                payable(msg.sender),
                _workers[i],
                milestoneHashes,
                milestonePayouts
            );

            address vaultAddress = address(vault);
            createdVaults[i] = vaultAddress;
            vaults.push(vaultAddress);

            vaultInfoByAddress[vaultAddress] = VaultInfo({
                vaultAddress: vaultAddress,
                buyer: msg.sender,
                seller: _workers[i],
                totalAmount: _amounts[i],
                milestonesTotal: 1
            });

            emit VaultCreated(vaultAddress, msg.sender, _workers[i], _amounts[i], 1);
        }

        emit BatchVaultsCreated(msg.sender, _workers.length, msg.value);
        return createdVaults;
    }

    function getVaults() external view returns (address[] memory) {
        return vaults;
    }
}
