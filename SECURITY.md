# Security Vulnerabilities — Backend Orchestrator CLI (v0.3.1)

This document lists known security vulnerabilities and risks that still exist in this version of the CLI tool. Users should review these before using the tool in sensitive or production environments.

## 1. Secret and Credential Management
- **Plaintext credentials in `.env`:** Database passwords and other secrets are written in plaintext to the `.env` file. This file may be accidentally committed to version control or accessed by unauthorized users. There is no enforcement of restrictive file permissions (e.g., 0600) on `.env`.
- **No OS secret store integration:** The CLI does not support storing secrets in OS-level secure storage (e.g., Windows Credential Manager, macOS Keychain, Linux Secret Service).
- **No user prompt before saving secrets:** Users are not prompted to confirm before secrets are written to disk.

## 2. File Permissions and Sensitive Files
- **No explicit permission setting:** Sensitive files like `.env` and `bsgen.json` are created without explicitly setting restrictive permissions. On some platforms, these files may be world-readable by default.

## 3. Logging and Secret Exposure
- **Potential secret leakage in logs:** While password prompts are masked, some error messages or logs may inadvertently expose sensitive information (e.g., connection errors may include credentials).
- **No structured or masked logging:** The CLI uses ad-hoc `console.log` and `console.error` statements without secret masking or audit logging.


## 4. Configuration and Architecture
- **No XDG or user config support:** All configuration is stored in the project root. There is no support for user-level or system-level config directories.
- **No least-privilege guidance:** The tool does not enforce or recommend using non-root database users or least-privilege credentials.

## 5. Auditing and Monitoring
- **No audit log:** There is no central audit log or tamper-evident logging. All logs are ephemeral and local.
- **No remote or append-only logging:** The CLI does not support sending logs to a remote or append-only store for tamper detection.

## 6. Miscellaneous
- **No CI/CD security checks:** There is no continuous integration setup to run security checks, generate SBOMs, or enforce code quality for releases.
- **No minimum Node.js version enforcement:** The CLI does not specify or enforce a minimum Node.js version, which may lead to unexpected behavior on unsupported runtimes.

---

**Recommendation:**
- Do not store production credentials in `.env`.
- Restrict access to sensitive files and directories.
- Review and rotate credentials regularly.
- Use the CLI in isolated, non-production environments until these issues are addressed.
- Monitor the repository for security updates and patches.
