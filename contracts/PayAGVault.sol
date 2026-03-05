    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.20;

    contract PayAG_AgentEscrow {
        address payable public agentA;
        address payable public agentB;
        bytes32 public taskHash;
        bool public isSettled;

        constructor(address payable _agentB, bytes32 _taskHash) payable {
            require(_agentB != address(0), "Invalid agentB");
            require(_taskHash != bytes32(0), "Invalid task hash");
            agentA = payable(msg.sender);
            agentB = _agentB;
            taskHash = _taskHash;
        }

        function verifyAndRelease(string calldata proofString) public {
            require(!isSettled, "Already settled");
            bytes32 computedHash = keccak256(bytes(proofString));
            require(computedHash == taskHash, "Invalid proof of task");
            isSettled = true;
            agentB.transfer(address(this).balance);
        }

        function getVaultBalance() public view returns (uint256) {
            return address(this).balance;
        }
    }

    contract PayAGFactory {
        address[] public allVaults;

        event VaultCreated(address indexed vaultAddress, address indexed buyer, address indexed seller, bytes32 taskHash);

        function createVault(address payable _seller, bytes32 _taskHash) public payable returns (address) {
            require(msg.value > 0, "No funds sent");
            PayAG_AgentEscrow vault = (new PayAG_AgentEscrow){value: msg.value}(_seller, _taskHash);
            allVaults.push(address(vault));
            emit VaultCreated(address(vault), msg.sender, _seller, _taskHash);
            return address(vault);
        }

        function getVaults() public view returns (address[] memory) {
            return allVaults;
        }
    }
