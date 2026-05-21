# Contributing to cevex-sdk

Thank you for your interest in contributing. This document covers how to get set up, what the standards are, and how to submit changes.

---

## Getting Started

```bash
git clone https://github.com/cevexlabs/Cevex
cd Cevex/sdk
npm install
npm run build
npm test
```

---

## Repository Structure

```
packages/
  cevex-core/     Post-quantum primitives (Dilithium, FALCON, KDF)
  cevex-agent/    Agent provisioning and signing
  cevex-verify/   Signature verification and batch verify
  cevex-registry/ Base registry client
python/
  cevex/          Python package
examples/
  typescript/     TypeScript usage examples
  python/         Python usage examples
docs/             Documentation
```

---

## Standards

- All TypeScript code must pass `npm run lint` and `npm run typecheck`
- All new functions must have JSDoc comments
- All new functionality must include unit tests
- Test coverage must not drop below 90%
- Python code must pass `ruff` and `mypy`
- No new dependencies without opening an issue for discussion first
- Security-sensitive changes (anything touching crypto primitives, key handling, or registry interaction) require a review from the CEVEX security team before merge

---

## Submitting a Pull Request

1. Fork the repository and create a branch from `main`
2. Make your changes
3. Run `npm test` and ensure all tests pass
4. Open a pull request with a clear description of what changed and why
5. Reference any related issues

---

## Reporting Security Issues

Do not open public issues for security vulnerabilities. Email security@cevex.io with a description of the issue. We will acknowledge within 48 hours and aim to release a fix within 7 days for critical issues.
