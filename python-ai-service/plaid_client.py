import os
import plaid
from plaid.api import plaid_api

_client: plaid_api.PlaidApi | None = None

_ENV_MAP = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}


def get_plaid_client() -> plaid_api.PlaidApi:
    global _client
    if _client is not None:
        return _client

    env_name = os.getenv("PLAID_ENV", "sandbox").lower()
    host = _ENV_MAP.get(env_name, plaid.Environment.Sandbox)

    configuration = plaid.Configuration(
        host=host,
        api_key={
            "clientId": os.getenv("PLAID_CLIENT_ID", ""),
            "secret": os.getenv("PLAID_SECRET", ""),
        },
    )
    api_client = plaid.ApiClient(configuration)
    _client = plaid_api.PlaidApi(api_client)
    return _client
