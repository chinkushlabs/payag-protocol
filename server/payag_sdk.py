import requests


class PayAG:
    def __init__(self, base_url: str, api_key: str | None = None):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        if api_key:
            self.session.headers.update({"Authorization": f"Bearer {api_key}"})
        self.session.headers.update({"Content-Type": "application/json"})

    class TasksClient:
        def __init__(self, outer: "PayAG"):
            self.outer = outer

        def create(
            self,
            buyer_agent_id: str,
            buyer_wallet: str,
            worker_listing_id: str,
            worker_wallet: str,
            description: str,
            requirements: str,
            payment: str,
            token: str = "ETH",
        ):
            response = self.outer.session.post(
                f"{self.outer.base_url}/api/tasks/create",
                json={
                    "buyerAgentId": buyer_agent_id,
                    "buyerWallet": buyer_wallet,
                    "workerListingId": worker_listing_id,
                    "workerWallet": worker_wallet,
                    "description": description,
                    "requirements": requirements,
                    "payment": payment,
                    "token": token,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

        def accept(self, task_id: str, worker_agent_id: str):
            response = self.outer.session.post(
                f"{self.outer.base_url}/api/tasks/accept",
                json={
                    "taskId": task_id,
                    "workerAgentId": worker_agent_id,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

        def submit(self, task_id: str, worker_agent_id: str, result: dict):
            response = self.outer.session.post(
                f"{self.outer.base_url}/api/tasks/submit",
                json={
                    "taskId": task_id,
                    "workerAgentId": worker_agent_id,
                    "result": result,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

        def get(self, task_id: str):
            response = self.outer.session.get(
                f"{self.outer.base_url}/api/tasks/{task_id}",
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

        def dispute(self, task_id: str, buyer_agent_id: str, reason: str):
            response = self.outer.session.post(
                f"{self.outer.base_url}/api/tasks/dispute",
                json={
                    "taskId": task_id,
                    "buyerAgentId": buyer_agent_id,
                    "reason": reason,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    class AgentsClient:
        def __init__(self, outer: "PayAG"):
            self.outer = outer

        def reputation(self, agent_id: str):
            response = self.outer.session.get(
                f"{self.outer.base_url}/api/agents/{agent_id}/reputation",
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    @property
    def tasks(self):
        return self.TasksClient(self)

    @property
    def agents(self):
        return self.AgentsClient(self)
