"""Turn a short-lived Meta token into the long-lived secrets this tool needs.

Usage:
  python scripts/meta_token.py APP_ID APP_SECRET SHORT_LIVED_USER_TOKEN

Prints, for each Page you manage: META_PAGE_ID, META_PAGE_TOKEN and, if an
Instagram Business/Creator account is linked, META_IG_USER_ID.
Treat the printed token like a password: paste it into GitHub secrets only.
"""
import sys

import requests

GRAPH = "https://graph.facebook.com/v26.0"


def main(app_id: str, app_secret: str, short_token: str) -> None:
    long_user = requests.get(f"{GRAPH}/oauth/access_token", params={
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_token,
    }, timeout=30).json()
    if "access_token" not in long_user:
        sys.exit(f"Meta refused the exchange: {long_user.get('error', long_user)}")

    pages = requests.get(f"{GRAPH}/me/accounts", params={
        "access_token": long_user["access_token"],
        "fields": "id,name,access_token,instagram_business_account",
    }, timeout=30).json()
    if not pages.get("data"):
        sys.exit(f"No Pages found. Did you grant pages_manage_posts for your Page? {pages.get('error', '')}")

    for page in pages["data"]:
        print(f"\n== {page['name']}")
        print(f"META_PAGE_ID={page['id']}")
        print(f"META_PAGE_TOKEN={page['access_token']}")
        ig = page.get("instagram_business_account", {}).get("id")
        print(f"META_IG_USER_ID={ig}" if ig else "(no Instagram Business/Creator account linked to this Page)")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
