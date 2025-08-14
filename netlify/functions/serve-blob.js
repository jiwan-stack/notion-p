import { getStore } from "@netlify/blobs";

// Use Functions API v2 for automatic Netlify Blobs context
export default async function handler(event, context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  if (event.httpMethod !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Functions API v2 should provide automatic Blobs context
    // For local development, use netlify dev command
    let store;
    try {
      // Functions API v2 should automatically provide the context
      store = getStore("temp-uploads");
      console.log(
        "Netlify Blobs store initialized successfully with Functions API v2"
      );
    } catch (storeError) {
      console.log(
        "Automatic configuration failed for serve-blob, trying manual configuration..."
      );

      // Extract site ID from Netlify environment automatically
      const siteId =
        process.env.NETLIFY_SITE_ID ||
        (process.env.URL && process.env.URL.includes(".netlify.app")
          ? process.env.URL.match(/https?:\/\/([^.]+)\.netlify\.app/)?.[1]
          : null) ||
        (process.env.DEPLOY_URL &&
        process.env.DEPLOY_URL.includes(".netlify.app")
          ? process.env.DEPLOY_URL.match(
              /https?:\/\/([^.]+)\.netlify\.app/
            )?.[1]
          : null);

      // Look for available authentication tokens in Netlify environment
      const token =
        process.env.NETLIFY_TOKEN ||
        process.env.NETLIFY_AUTH_TOKEN ||
        process.env.NETLIFY_API_TOKEN ||
        process.env.NETLIFY_ACCESS_TOKEN ||
        process.env.NETLIFY_PERSONAL_ACCESS_TOKEN ||
        process.env.NETLIFY_FUNCTIONS_TOKEN; // This is the key token Netlify provides!

      console.log(
        `Serve-blob extracted site ID: ${siteId ? "found" : "not found"}`
      );
      console.log(
        `Serve-blob found auth token: ${token ? "present" : "missing"}`
      );

      if (siteId && token) {
        try {
          // Try with both siteID and token
          store = getStore("temp-uploads", { siteID: siteId, token: token });
          console.log(
            "Netlify Blobs store initialized for serving with site ID and token"
          );
        } catch (fullConfigError) {
          console.error(
            "Full manual configuration failed for serve-blob:",
            fullConfigError
          );
          return new Response(
            JSON.stringify({
              error: `File storage not available: ${storeError.message}. Unable to configure Netlify Blobs automatically.`,
            }),
            {
              status: 500,
              headers: corsHeaders,
            }
          );
        }
      } else if (siteId) {
        try {
          // Try with just siteID - maybe runtime provides token automatically
          store = getStore("temp-uploads", { siteID: siteId });
          console.log(
            "Netlify Blobs store initialized for serving with extracted site ID only"
          );
        } catch (siteIdError) {
          console.error(
            "Site ID only configuration failed for serve-blob:",
            siteIdError
          );
          return new Response(
            JSON.stringify({
              error: `File storage not available: ${storeError.message}. Missing authentication token for Netlify Blobs.`,
            }),
            {
              status: 500,
              headers: corsHeaders,
            }
          );
        }
      } else {
        console.error(
          "Could not extract site ID from environment for serve-blob"
        );
        return new Response(
          JSON.stringify({
            error: `File storage not available: ${storeError.message}. Could not determine site configuration automatically.`,
          }),
          {
            status: 500,
            headers: corsHeaders,
          }
        );
      }
    }

    // Extract filename from the path
    const pathSegments = event.path.split("/");
    const filename = pathSegments[pathSegments.length - 1];

    if (!filename) {
      return new Response(JSON.stringify({ error: "No filename provided" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(`Attempting to serve file: ${filename}`);

    // Read binary as ArrayBuffer and fetch metadata
    const [arrayBufferValue, metaResult] = await Promise.all([
      store.get(filename, { type: "arrayBuffer" }),
      store.getWithMetadata(filename),
    ]);
    const meta = metaResult?.metadata ?? {};

    if (!arrayBufferValue) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Encode to base64 from ArrayBuffer
    const base64Body = Buffer.from(new Uint8Array(arrayBufferValue)).toString(
      "base64"
    );

    // Validate base64 body
    if (!base64Body || typeof base64Body !== "string") {
      return new Response(
        JSON.stringify({ error: "Failed to encode file as base64" }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // Guess content-type if missing
    const lower = filename.toLowerCase();
    const guessFromExt = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
      ? "image/jpeg"
      : lower.endsWith(".gif")
      ? "image/gif"
      : lower.endsWith(".webp")
      ? "image/webp"
      : lower.endsWith(".svg")
      ? "image/svg+xml"
      : "application/octet-stream";
    const contentType =
      meta.contentType || meta["content-type"] || guessFromExt;

    // Return the file with proper headers
    const buffer = Buffer.from(base64Body, "base64");
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error serving blob:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to serve file",
        details: error.message,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
