# Local MCP setup

1. Clone or extract GitHub 3D Metrics and run `npm install` in the project directory using Node.js 24.
2. Configure your MCP client to launch Node with the absolute path to `src/mcp.ts`. For clients that accept an `mcpServers` object:

```json
{
  "mcpServers": {
    "github-3d-metrics": {
      "command": "node",
      "args": ["/absolute/path/to/github-3d-metrics/src/mcp.ts"]
    }
  }
}
```

Use the absolute Node executable path if the client cannot find Node on its PATH. Restart or reload the client. Call `get_available_themes` first. The SDK is the official v2 TypeScript SDK with stdio transport. [SDK protocol guidance](https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio) covers how clients negotiate the connection.

## GitHub access

Public REST tools can run without a token at GitHub’s lower unauthenticated rate limit. Calendar generation requires GitHub GraphQL authentication. GitHub Actions supplies a repository-scoped token in the public profile workflow. For local calendar generation set `GITHUB_TOKEN` in the process environment using a dedicated GitHub credential that can read public data only. For example, use a classic PAT with no optional scopes if your account policy permits it. Keep it in your client’s secret storage or inherited environment. Avoid any token that can read private data. The adapter rejects recognized broad classic scopes and calendars GitHub marks as containing restricted contributions.

## Tools

| Tool | Returns |
| --- | --- |
| `get_github_profile` | Canonical login and public follower count |
| `get_contributions` | Dates and contribution counts |
| `get_languages` | Aggregated language bytes |
| `get_repository_metrics` | Owned public repositories with stars and forks |
| `get_available_themes` | Theme names and palettes |
| `generate_3d_svg` | Standalone SVG text for the selected username and settings |
| `generate_readme_markdown` | Relative single-image or light/dark embed markup |
| `get_visualization_config` | Default settings, selected settings, and installation YAML |

The client can save returned SVG text if it has local file access and authorization. The MCP tools do not change GitHub repositories. Stdout is reserved for protocol messages. See [verification status](verification.md) for client compatibility.
