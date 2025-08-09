import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Parse the NETLIFY_BLOBS_CONTEXT environment variable
    const blobsContext = process.env.NETLIFY_BLOBS_CONTEXT;
    if (!blobsContext) {
      throw new Error("NETLIFY_BLOBS_CONTEXT environment variable is required");
    }

    const store = getStore("temp-uploads", {
      siteID: JSON.parse(Buffer.from(blobsContext, "base64").toString()).siteID,
      token: JSON.parse(Buffer.from(blobsContext, "base64").toString()).token,
    });

    // Extract filename from the path
    const pathSegments = event.path.split("/");
    const filename = pathSegments[pathSegments.length - 1];

    if (!filename) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No filename provided" }),
      };
    }

    console.log(`Attempting to serve file: ${filename}`);

    // Get the file from Netlify Blobs
    const file = await store.get(filename);

    if (!file) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "File not found" }),
      };
    }

    // Get file metadata
    const metadata = await store.getWithMetadata(filename);

    // Return the file with proper headers
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type":
          metadata.metadata?.contentType || "application/octet-stream",
        "Content-Length": file.length,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      body: file.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Error serving blob:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Failed to serve file",
        details: error.message,
      }),
    };
  }
};
