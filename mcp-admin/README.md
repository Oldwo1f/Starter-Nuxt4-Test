# Nuna Admin MCP Server

MCP (Model Context Protocol) server for administering the Nuna Heritage site from Cursor or other MCP clients. Exposes tools to manage users and blog posts.

## Prerequisites

- Node.js 18+
- The Nuna NestJS backend running (default: `http://localhost:3001`)
- An admin, superadmin, or moderator account

## Installation

```bash
cd mcp-admin
npm install
npm run build
```

## Configuration

Set these environment variables (via Cursor MCP config or the project root `.env`):

| Variable | Description | Example |
|----------|-------------|---------|
| `NUNA_API_URL` | Base URL of the NestJS API | `http://localhost:3001` |
| `NUNA_ADMIN_EMAIL` | Email of an admin account | `admin@example.com` |
| `NUNA_ADMIN_PASSWORD` | Password for that account | `your-password` |

When run standalone, the MCP server loads `.env` from the project root. When used via Cursor, set vars in `mcp.json` (see below).

**Security:** Use a dedicated admin account if possible. Never commit credentials.

## Cursor Configuration

Add the server to your MCP configuration (`~/.cursor/mcp.json` or project-level):

```json
{
  "mcpServers": {
    "nuna-admin": {
      "command": "node",
      "args": ["/var/www/nunaheritage/mcp-admin/dist/index.js"],
      "env": {
        "NUNA_API_URL": "http://localhost:3001",
        "NUNA_ADMIN_EMAIL": "YOUR_ADMIN_EMAIL",
        "NUNA_ADMIN_PASSWORD": "YOUR_ADMIN_PASSWORD"
      }
    }
  }
}
```

For development (without building), use `tsx`:

```json
{
  "mcpServers": {
    "nuna-admin": {
      "command": "npx",
      "args": ["tsx", "/var/www/nunaheritage/mcp-admin/src/index.ts"],
      "env": {
        "NUNA_API_URL": "http://localhost:3001",
        "NUNA_ADMIN_EMAIL": "YOUR_ADMIN_EMAIL",
        "NUNA_ADMIN_PASSWORD": "YOUR_ADMIN_PASSWORD"
      }
    }
  }
}
```

Restart Cursor after changing the config.

## Available Tools

### Users
- **list_users** – Paginated list with search, role filter, sorting
- **get_user** – Get user by ID
- **update_user_role** – Change role (superadmin, admin, moderator, user, member, premium, vip)
- **update_user** – Update firstName, lastName, isCertified
- **delete_user** – Delete user by ID

### Blog
- **list_blog_posts** – Paginated list with search, author filter
- **get_blog_post** – Get article by ID
- **create_blog_post** – Create article (title, content, optional videoUrl)
- **update_blog_post** – Update article
- **delete_blog_post** – Delete article by ID

## Usage

Once configured, you can ask Cursor (or another MCP client) to:

- "List the last 10 users"
- "Show me user with ID 5"
- "Change user 3's role to member"
- "List blog posts"
- "Create a blog post titled 'Welcome' with content 'Hello world'"
- "Delete blog post 7"

## Development

```bash
npm run dev   # Run with tsx (no build)
npm run build # Compile to dist/
npm start     # Run compiled dist/index.js
```

## Troubleshooting

- **Login failed:** Ensure the backend is running, `NUNA_API_URL` is correct, and the admin account exists with the right role.
- **401 Unauthorized:** The JWT may have expired. The server will retry with a refresh; if it still fails, check credentials.
- **Server not starting:** Verify Node 18+ and that all env vars are set in the Cursor MCP config.
