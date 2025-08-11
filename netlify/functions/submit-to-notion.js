import { NOTION_DATABASE_ID, NOTION_API_VERSION } from "./config.js";

const getHeader = (headers, name) => {
  if (!headers) return undefined;
  const lowercaseName = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowercaseName) {
      return headers[key];
    }
  }
  return undefined;
};

export const handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Notion-Version, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Notion API key missing" }),
    };
  }

  const query = event.queryStringParameters || {};
  let path = query.path || "/v1/pages";
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.startsWith("/v1/")) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Only Notion /v1 endpoints are allowed" }),
    };
  }

  const targetUrl = `https://api.notion.com${path}`;
  const method = (event.httpMethod || "POST").toUpperCase();
  const requestContentType =
    getHeader(event.headers, "content-type") || "application/json";

  const upstreamHeaders = {
    Authorization: `Bearer ${notionApiKey}`,
    "Notion-Version": query.version || NOTION_API_VERSION,
    "Content-Type": requestContentType,
  };

  try {
    const hasBodyMethod = ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(
      method
    );
    let data = undefined;

    if (hasBodyMethod && event.body) {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString()
        : event.body;
      data = requestContentType.includes("application/json")
        ? typeof rawBody === "string"
          ? JSON.parse(rawBody)
          : rawBody
        : rawBody;
    }

    // If creating a page and no parent is set, inject the database_id from shared config
    if (
      requestContentType.includes("application/json") &&
      method === "POST" &&
      path === "/v1/pages"
    ) {
      const hasParentFromClient =
        data &&
        typeof data === "object" &&
        data.parent &&
        (data.parent.database_id || data.parent.page_id);

      if (!hasParentFromClient) {
        if (!data || typeof data !== "object") data = {};

        // No validation needed - using shared database ID

        data.parent = {
          ...(data.parent || {}),
          database_id: NOTION_DATABASE_ID,
        };

        // Remove helper field so it’s not sent to Notion
      }
    }

    const { path: _omitPath, version: _omitVersion, ...restParams } = query;

    // Build query string from params
    const queryString = Object.keys(restParams)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(restParams[key])}`
      )
      .join("&");

    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    const response = await fetch(fullUrl, {
      method,
      headers: upstreamHeaders,
      body: hasBodyMethod && data ? JSON.stringify(data) : undefined,
    });

    let responseData;
    try {
      responseData = await response.text();
      // Try to parse as JSON, fallback to text
      try {
        responseData = JSON.parse(responseData);
      } catch {
        // Keep as text if not JSON
      }
    } catch {
      responseData = "";
    }

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body:
        typeof responseData === "string"
          ? responseData
          : JSON.stringify(responseData),
    };
  } catch (error) {
    console.error("Submit to Notion error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || "Unknown error",
      }),
    };
  }
};
