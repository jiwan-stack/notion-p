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
    // Netlify automatically provides blobs context in production
    // For local development, use netlify dev command

    // Extract site ID from URL if not available in environment
    let extractedSiteId = null;
    const siteUrl = process.env.URL || process.env.DEPLOY_URL;
    if (siteUrl && siteUrl.includes(".netlify.app")) {
      const match = siteUrl.match(/https?:\/\/([^.]+)\.netlify\.app/);
      if (match) {
        extractedSiteId = match[1];
        console.log(
          `Extracted site identifier from URL for serve-blob: ${extractedSiteId}`
        );
      }
    }

    let store;
    try {
      store = getStore("temp-uploads");
      console.log(
        "Netlify Blobs store initialized successfully for file serving"
      );
    } catch (storeError) {
      console.log(
        "Automatic Netlify Blobs configuration failed for serve-blob, trying manual setup..."
      );

      // Try manual configuration with multiple approaches
      const siteId =
        process.env.NETLIFY_SITE_ID || process.env.SITE_ID || extractedSiteId;
      const token =
        process.env.NETLIFY_TOKEN ||
        process.env.NETLIFY_AUTH_TOKEN ||
        process.env.NETLIFY_API_TOKEN;

      console.log(
        `Serve-blob manual config attempt with siteId: ${
          siteId ? "present" : "missing"
        }, token: ${token ? "present" : "missing"}`
      );

      let storeInitialized = false;
      let lastError = null;

      // Approach 1: Manual configuration with token
      if (siteId && token) {
        try {
          store = getStore({
            name: "temp-uploads",
            siteID: siteId,
            token: token,
          });
          console.log(
            "Netlify Blobs store initialized with manual token configuration for serving"
          );
          storeInitialized = true;
        } catch (manualError) {
          console.error(
            "Manual token configuration failed for serve-blob:",
            manualError
          );
          lastError = manualError;
        }
      }

      // Approach 2: Try with just siteID
      if (!storeInitialized && siteId) {
        try {
          store = getStore({
            name: "temp-uploads",
            siteID: siteId,
          });
          console.log(
            "Netlify Blobs store initialized with siteID-only configuration for serving"
          );
          storeInitialized = true;
        } catch (siteIdError) {
          console.error(
            "SiteID-only configuration failed for serve-blob:",
            siteIdError
          );
          lastError = siteIdError;
        }
      }

      // Approach 3: Try minimal configuration
      if (!storeInitialized) {
        try {
          store = getStore("temp-uploads");
          console.log(
            "Netlify Blobs store initialized with minimal configuration for serving"
          );
          storeInitialized = true;
        } catch (minimalError) {
          console.error(
            "Minimal configuration failed for serve-blob:",
            minimalError
          );
          lastError = minimalError;
        }
      }

      if (!storeInitialized) {
        console.error(
          "All Netlify Blobs configuration attempts failed for serve-blob"
        );
        const errorMessage = lastError?.message || "Unknown error";

        if (errorMessage.includes("not been configured")) {
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              error: `Netlify Blobs is not enabled for this site. Please enable Netlify Blobs in your site settings.`,
            }),
          };
        }

        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            error: `File storage not available: ${errorMessage}. Netlify Blobs may not be properly configured.`,
          }),
        };
      }
    }

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

    // Read binary as ArrayBuffer and fetch metadata
    const [arrayBufferValue, metaResult] = await Promise.all([
      store.get(filename, { type: "arrayBuffer" }),
      store.getWithMetadata(filename),
    ]);
    const meta = metaResult?.metadata ?? {};

    if (!arrayBufferValue) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "File not found" }),
      };
    }

    // Encode to base64 from ArrayBuffer
    const base64Body = Buffer.from(new Uint8Array(arrayBufferValue)).toString(
      "base64"
    );

    // Validate base64 body
    if (!base64Body || typeof base64Body !== "string") {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Failed to encode file as base64" }),
      };
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
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Content-Disposition": `inline; filename="${filename}"`,
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
