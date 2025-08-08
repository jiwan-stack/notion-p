const axios = require("axios");

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

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Notion-Version, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  const notionApiKey = process.env.VITE_NOTION_API_KEY;
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
    "Notion-Version": query.version || "2022-06-28",
    "Content-Type": requestContentType,
  };

  try {
    const hasBodyMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    let data = undefined;
    if (hasBodyMethod && event.body) {
      const isBase64Encoded = !!event.isBase64Encoded;
      const rawBody = isBase64Encoded
        ? Buffer.from(event.body, "base64").toString()
        : event.body;
      if (requestContentType.includes("application/json")) {
        data = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      } else {
        data = rawBody;
      }
    }

    // Auto-inject default parent.database_id for creating pages when not provided
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
        const defaultDatabaseId = process.env.VITE_NOTION_DATABASE_ID;
        if (!defaultDatabaseId) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              error:
                "Missing parent in request and VITE_NOTION_DATABASE_ID is not set on server",
            }),
          };
        }
        if (!data || typeof data !== "object") data = {};
        data.parent = {
          ...(data.parent || {}),
          database_id: defaultDatabaseId,
        };
      }
    }

    const { path: _omitPath, version: _omitVersion, ...restParams } = query;

    const response = await axios({
      url: targetUrl,
      method,
      headers: upstreamHeaders,
      data,
      params: restParams,
      timeout: 15000,
      validateStatus: () => true,
    });

    const responseBody =
      typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: responseBody,
    };
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const data = error.response?.data || {
      error: error.message || "Unknown error",
    };
    const body = typeof data === "string" ? data : JSON.stringify(data);
    return { statusCode, headers: corsHeaders, body };
  }
};
