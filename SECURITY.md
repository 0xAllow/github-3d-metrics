# Security

Report suspected vulnerabilities through **Security → Report a vulnerability** in the upstream GitHub repository after private reporting is enabled. If the feature is unavailable, open a public issue requesting a private contact channel, withhold sensitive details, and wait for a maintainer to respond.

Include the affected version or commit, impact, and steps a maintainer can use to diagnose the issue. Remove tokens and private account data. Until the first tagged release, security updates target the default branch.

Generation restricts the GitHub API origin, validates inputs, and escapes SVG labels. The public workflow uses the built-in token for API reads and the output commit. Keep repository secrets out of copied configuration. The published snapshot contains the public data used to render the card.
