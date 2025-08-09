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

    // Get the file from Netlify Blobs (prefer Buffer if available)
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

    // Ensure base64 body regardless of how the store returns data
    let base64Body;
    if (Buffer.isBuffer(file)) {
      base64Body = file.toString("base64");
    } else if (file && typeof file === "string") {
      base64Body = Buffer.from(file).toString("base64");
    } else if (file && typeof file.arrayBuffer === "function") {
      const ab = await file.arrayBuffer();
      base64Body = Buffer.from(new Uint8Array(ab)).toString("base64");
    } else {
      base64Body = Buffer.from(String(file)).toString("base64");
    }

    // Validate base64 body
    if (!base64Body || typeof base64Body !== "string") {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Failed to encode file as base64" }),
      };
    }

    // Return the file with proper headers
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type":
          metadata.metadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      body: base64Body,
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
