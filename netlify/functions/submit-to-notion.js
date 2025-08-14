// No imports needed - using environment variables directly

// Functions API v2 configuration
export const config = {
  method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

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

export default async function handler(request, context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Notion-Version, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    return new Response(JSON.stringify({ error: "Notion API key missing" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  let path = query.path || "/v1/pages";
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.startsWith("/v1/")) {
    return new Response(
      JSON.stringify({ error: "Only Notion /v1 endpoints are allowed" }),
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }

  const targetUrl = `https://api.notion.com${path}`;
  const method = request.method.toUpperCase();
  const requestContentType =
    request.headers.get("content-type") || "application/json";

  const upstreamHeaders = {
    Authorization: `Bearer ${notionApiKey}`,
    "Notion-Version": query.version || "2022-06-28",
    "Content-Type": requestContentType,
  };

  try {
    const hasBodyMethod = ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(
      method
    );
    let data = undefined;

    if (hasBodyMethod && request.body) {
      if (requestContentType.includes("application/json")) {
        data = await request.json();
      } else {
        data = await request.text();
      }
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
          database_id: process.env.NOTION_DATABASE_ID,
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

    // Debug: Log what we're sending to Notion
    if (hasBodyMethod && data) {
      console.log("Sending to Notion:", JSON.stringify(data, null, 2));
    }

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

    return new Response(
      typeof responseData === "string"
        ? responseData
        : JSON.stringify(responseData),
      {
        status: response.status,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Submit to Notion error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
