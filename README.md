# mcp-rentcast

Rentcast MCP — wraps Rentcast API (api.rentcast.io/v1)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_rent_estimate` | Get a rental price estimate for a US property address. Returns estimated monthly rent, price range, and comparable rental data. Example: "1234 Main St, Austin, TX 78701". |
| `get_property` | Get property details for a US address. Returns bedrooms, bathrooms, square footage, lot size, year built, property type, and owner info when available. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "rentcast": {
      "url": "https://gateway.pipeworx.io/rentcast/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Rentcast data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
