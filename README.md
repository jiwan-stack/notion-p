# Notion Proxy Service

A Netlify function that acts as a proxy to the Notion API, with automatic database ID injection for creating pages.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Install Netlify CLI globally (if not already installed):

```bash
npm install -g netlify-cli
```

3. Set up environment variables in a `.env` file:

```bash
VITE_NOTION_API_KEY=your_notion_integration_token
VITE_NOTION_DATABASE_ID=your_notion_database_id
```

4. Start the development server:

```bash
npm run dev
```

This will start the Netlify dev server on `http://localhost:8888` and you can test the form locally.

## CORS Issues

If you're getting CORS errors when testing locally:

1. Make sure you're running the Netlify dev server (`npm run dev`)
2. Access the site through `http://localhost:8888` (not `file://` protocol)
3. The function includes comprehensive CORS headers for local development

## Usage

The form submits to `/.netlify/functions/submit-to-notion?path=/v1/pages` and automatically:

- Injects the `parent.database_id` from environment variables
- Handles CORS for local and production environments
- Provides proper error handling and feedback

## Environment Variables

- `VITE_NOTION_API_KEY`: Your Notion integration token
- `VITE_NOTION_DATABASE_ID`: Your Notion database ID (for auto-injection)
