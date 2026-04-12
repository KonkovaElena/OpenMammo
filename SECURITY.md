# Security Policy

## Supported Surface

The actively supported surface is the current standalone kernel in this repository.

## Current Persistence Limits

- the default file-backed case store is intended for draft-only standalone workflows, not as a system of record
- the opt-in SQLite backend improves single-node durability, but it is still a local standalone persistence surface rather than a final multi-instance production database architecture
- writes and state transitions are not yet presented as a distributed persistence guarantee across multiple application instances
- any future production deployment should replace or extend the current standalone persistence modes with a clearly operated database-backed architecture

## Reporting a Vulnerability

Do not open public issues for suspected vulnerabilities.

Instead, report:

- the affected file or route
- reproduction steps
- expected impact
- any proposed mitigation if you have one

If private vulnerability reporting is enabled on the GitHub repository, use that channel. Otherwise contact the maintainer through the repository owner profile and clearly mark the report as a security issue.

## Response Expectations

- initial triage target: 5 business days
- remediation target depends on severity and reproducibility
- coordinated disclosure is preferred once a fix or mitigation exists

## Out of Scope

- feature requests framed as vulnerabilities
- reports that require access to patient data not present in this repository
- claims about autonomous diagnosis, because the repository explicitly does not implement that mode