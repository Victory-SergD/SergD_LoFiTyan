#!/usr/bin/env python3
"""Tauri Windows signCommand → SSL.com eSigner (cloud signing) via jsign.

Tauri invokes this once per Windows artifact:  python scripts/sign_windows.py <file>

Design goals:
  - INERT by default: if SIGN_ENABLED != "true", every file passes through UNSIGNED
    (exit 0, no Java/jsign needed). So the build never breaks when secrets are absent.
  - Whitelist only the artifacts worth signing (main exe + installers) to stay under
    the eSigner monthly signing quota; skip DLLs / NSIS plugins / sidecars.

Env required only when actually signing (SIGN_ENABLED=true):
  SSL_COM_USERNAME, SSL_COM_PASSWORD, SSL_COM_CREDENTIAL_ID, SSL_COM_TOTP_SECRET
Optional:
  JSIGN_CMD   override the jsign invocation (default: "jsign" on PATH, from choco)
"""
import base64
import os
import subprocess
import sys

TSA_URL = "http://ts.ssl.com"  # SSL.com RFC-3161 timestamp authority
WHITELIST_NAMES = ("lofityan.exe",)            # main app binary
WHITELIST_SUFFIXES = ("setup.exe", ".msi")     # NSIS installer + WiX MSI


def should_sign(path: str) -> bool:
    name = os.path.basename(path).lower()
    return name in WHITELIST_NAMES or name.endswith(WHITELIST_SUFFIXES)


def b32_to_b64(secret: str) -> str:
    """jsign's ESIGNER keypass wants the base64 of the raw TOTP secret bytes."""
    s = secret.strip().replace(" ", "").upper()
    s += "=" * (-len(s) % 8)  # restore base32 padding
    return base64.b64encode(base64.b32decode(s)).decode()


def main() -> int:
    if len(sys.argv) < 2:
        print("sign_windows: no file argument — nothing to do")
        return 0
    target = sys.argv[1]

    if os.environ.get("SIGN_ENABLED", "").lower() != "true":
        print(f"sign_windows: SIGN_ENABLED!=true → leaving UNSIGNED: {target}")
        return 0
    if not should_sign(target):
        print(f"sign_windows: not whitelisted → skip: {target}")
        return 0

    try:
        user = os.environ["SSL_COM_USERNAME"]
        pwd = os.environ["SSL_COM_PASSWORD"]
        cred = os.environ["SSL_COM_CREDENTIAL_ID"]
        totp = b32_to_b64(os.environ["SSL_COM_TOTP_SECRET"])
    except KeyError as e:
        print(f"sign_windows: SIGN_ENABLED=true but missing env {e} — failing build")
        return 2

    jsign = os.environ.get("JSIGN_CMD", "jsign")
    cmd = [
        jsign,
        "--storetype", "ESIGNER",
        "--storepass", f"{user}|{pwd}",
        "--alias", cred,
        "--keypass", totp,
        "--tsaurl", TSA_URL,
        target,
    ]
    # Note: never print the assembled cmd (it contains credentials).
    print(f"sign_windows: signing via SSL.com eSigner → {target}")
    return subprocess.run(cmd).returncode


if __name__ == "__main__":
    sys.exit(main())
