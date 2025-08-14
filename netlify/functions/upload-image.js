import { getStore } from "@netlify/blobs";

// Use native fetch instead of axios to avoid module compatibility issues
// Note: This function now creates Notion pages with file attachments using public URLs

// Functions API v2 configuration
export const config = {
  method: ["POST", "OPTIONS"],
};

// Use Functions API v2 for automatic Netlify Blobs context
export default async function handler(event, context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Notion-Version, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests - Functions API v2 uses different event structure
  const method =
    event.httpMethod ||
    event.requestContext?.http?.method ||
    context?.requestContext?.http?.method;
  console.log(
    `Upload function received method: ${method}, event keys: ${Object.keys(
      event
    ).join(", ")}`
  );

  if (method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  if (method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        received: method,
        expected: "POST",
        debug: {
          eventKeys: Object.keys(event),
          contextKeys: Object.keys(context || {}),
        },
      }),
      {
        status: 405,
        headers: corsHeaders,
      }
    );
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    return new Response(JSON.stringify({ error: "Notion API key missing" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const { files } = JSON.parse(event.body);

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const uploadPromises = files.map(async (file) => {
      try {
        console.log(
          `Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`
        );

        const fileName = file.name;
        const mimeType = file.type;
        const fileSize = file.size;

        // Check file size (Notion limit: 5MB for free, 5GB for paid)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (fileSize > maxSize) {
          console.log(
            `File ${fileName} exceeds size limit: ${fileSize} > ${maxSize}`
          );
          return {
            success: false,
            fileName,
            error: `File size ${(fileSize / 1024 / 1024).toFixed(
              2
            )}MB exceeds limit of 5MB`,
          };
        }

        // Validate file type
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
        ];
        if (!allowedTypes.includes(mimeType)) {
          console.log(`File ${fileName} has unsupported type: ${mimeType}`);
          return {
            success: false,
            fileName,
            error: `File type ${mimeType} is not supported`,
          };
        }

        // Convert base64 to buffer
        const fileData = file.data; // This should be base64 encoded from frontend

        if (!fileData) {
          console.log(`File ${fileName} has no data`);
          return {
            success: false,
            fileName,
            error: "No file data provided - file may be corrupted or empty",
          };
        }

        console.log(`File ${fileName} data length: ${fileData.length}`);

        // Validate base64 data
        if (typeof fileData !== "string" || fileData.length === 0) {
          console.log(`File ${fileName} has invalid base64 data`);
          return {
            success: false,
            fileName,
            error: "Invalid file data - file conversion failed",
          };
        }

        // Convert base64 to buffer with error handling
        let buffer;
        try {
          buffer = Buffer.from(fileData, "base64");
          console.log(`File ${fileName} buffer length: ${buffer.length}`);

          // Validate buffer size
          if (buffer.length === 0) {
            console.log(`File ${fileName} resulted in empty buffer`);
            return {
              success: false,
              fileName,
              error: "File conversion resulted in empty data",
            };
          }
        } catch (bufferError) {
          console.error(`Error converting ${fileName} to buffer:`, bufferError);
          return {
            success: false,
            fileName,
            error: `File conversion failed: ${bufferError.message}`,
          };
        }

        // Create unique filename for logging purposes
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}_${fileName}`;
        console.log(`File ${fileName} unique name: ${uniqueFileName}`);

        // No need to store in Netlify Blobs anymore since we're uploading directly to Notion
        console.log(`File ${fileName} ready for direct upload to Notion`);

        // Notion's /v1/files endpoint requires a URL, not direct file data
        // We need to create a publicly accessible URL first
        // Let's use our serve-blob function to create a public endpoint
        const baseUrl =
          process.env.URL ||
          process.env.DEPLOY_URL ||
          "https://notion-p.netlify.app";
        const publicUrl = `${baseUrl}/.netlify/functions/serve-blob/${uniqueFileName}`;

        console.log(`Creating public URL for Notion: ${publicUrl}`);

        // Store the file in Netlify Blobs so our serve-blob function can access it
        // Functions API v2 should provide automatic Blobs context
        let store;
        try {
          // Functions API v2 should automatically provide the context
          store = getStore("temp-uploads");
          console.log(
            "Netlify Blobs store initialized successfully with Functions API v2"
          );
        } catch (storeError) {
          console.log(
            "Automatic configuration failed, trying manual configuration..."
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

          console.log(`Extracted site ID: ${siteId ? "found" : "not found"}`);
          console.log(`Found auth token: ${token ? "present" : "missing"}`);
          console.log(
            `Available env vars: URL=${process.env.URL}, DEPLOY_URL=${
              process.env.DEPLOY_URL
            }, NETLIFY_SITE_ID=${
              process.env.NETLIFY_SITE_ID ? "present" : "missing"
            }`
          );

          // Check for Netlify Blobs context
          const blobsContext = process.env.NETLIFY_BLOBS_CONTEXT;
          console.log(
            `NETLIFY_BLOBS_CONTEXT: ${blobsContext ? "present" : "missing"}`
          );

          // Log all available environment variables that might contain authentication
          const authEnvVars = Object.keys(process.env)
            .filter(
              (key) =>
                key.includes("NETLIFY") ||
                key.includes("TOKEN") ||
                key.includes("AUTH") ||
                key.includes("BLOBS")
            )
            .map((key) => `${key}=${process.env[key] ? "present" : "missing"}`);
          console.log(
            `Available auth-related env vars: ${authEnvVars.join(", ")}`
          );

          // If we have NETLIFY_BLOBS_CONTEXT, try to use it
          if (blobsContext) {
            try {
              const contextData = JSON.parse(
                Buffer.from(blobsContext, "base64").toString()
              );
              console.log("Parsed NETLIFY_BLOBS_CONTEXT successfully");
              store = getStore("temp-uploads", {
                siteID: contextData.siteID,
                token: contextData.token,
                apiURL: contextData.apiURL,
              });
              console.log(
                "Netlify Blobs store initialized with NETLIFY_BLOBS_CONTEXT"
              );
            } catch (contextError) {
              console.error(
                "Failed to use NETLIFY_BLOBS_CONTEXT:",
                contextError
              );
              // Continue with other methods
            }
          }

          if (!store && siteId && token) {
            try {
              // Try with both siteID and token
              store = getStore("temp-uploads", {
                siteID: siteId,
                token: token,
              });
              console.log(
                "Netlify Blobs store initialized with extracted site ID and token"
              );
            } catch (fullConfigError) {
              console.error(
                "Full manual configuration failed:",
                fullConfigError
              );
              return {
                success: false,
                fileName,
                error: `File storage initialization failed: ${storeError.message}. Unable to configure Netlify Blobs automatically.`,
              };
            }
          } else if (!store && siteId) {
            try {
              // Try with just siteID - maybe runtime provides token automatically
              store = getStore("temp-uploads", { siteID: siteId });
              console.log(
                "Netlify Blobs store initialized with extracted site ID only"
              );
            } catch (siteIdError) {
              console.error("Site ID only configuration failed:", siteIdError);
              return {
                success: false,
                fileName,
                error: `File storage initialization failed: ${storeError.message}. Missing authentication token for Netlify Blobs.`,
              };
            }
          } else if (!store) {
            console.error("Could not extract site ID from environment");
            return {
              success: false,
              fileName,
              error: `File storage initialization failed: ${storeError.message}. Could not determine site configuration automatically.`,
            };
          }
        }

        try {
          console.log(
            `Storing file ${fileName} in Netlify Blobs for public access...`
          );

          // Validate store is available
          if (!store) {
            throw new Error("Netlify Blobs store is not available");
          }

          await store.set(uniqueFileName, buffer, {
            contentType: mimeType,
            ttl: 24 * 60 * 60, // 24 hours
            metadata: {
              originalName: fileName,
              uploadTime: new Date().toISOString(),
              fileSize: buffer.length,
            },
          });
          console.log(`File ${fileName} stored successfully in Netlify Blobs`);
        } catch (blobError) {
          console.error(
            `Error storing file ${fileName} in Netlify Blobs:`,
            blobError
          );

          // Provide more specific error messages
          let errorMessage = "Failed to store file for public access";
          if (blobError.message.includes("quota")) {
            errorMessage =
              "Storage quota exceeded - please try with fewer/smaller files";
          } else if (
            blobError.message.includes("network") ||
            blobError.message.includes("timeout")
          ) {
            errorMessage =
              "Network error during file storage - please try again";
          } else {
            errorMessage = `Storage error: ${blobError.message}`;
          }

          return {
            success: false,
            fileName,
            error: errorMessage,
          };
        }

        // Set expiry time to 24 hours from now
        const expiryTime = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();

        // Do not create a Notion page here. Return a file object that submit-to-notion can use
        return {
          success: true,
          fileName,
          publicUrl,
          expiryTime,
          fileForNotion: {
            name: fileName,
            type: "external",
            external: { url: publicUrl },
          },
          originalFile: {
            name: fileName,
            type: mimeType,
            size: fileSize,
          },
        };
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);

        // Handle specific Notion API errors
        let errorMessage = error.message;
        if (error.status === 413) {
          errorMessage = "File too large for Notion";
        } else if (error.status === 400) {
          errorMessage = "Invalid file format or data";
        } else if (error.status === 401) {
          errorMessage = "Notion API authentication failed";
        } else if (error.status === 403) {
          errorMessage = "Notion API access denied";
        } else if (error.status === 429) {
          errorMessage = "Notion API rate limit exceeded";
        }

        return {
          success: false,
          fileName: file.name,
          error: errorMessage,
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((r) => r.success);
    const failedUploads = results.filter((r) => !r.success);

    console.log(
      `Upload batch completed: ${successfulUploads.length} successful, ${failedUploads.length} failed out of ${files.length} total files`
    );

    if (failedUploads.length > 0) {
      console.warn(
        "Failed uploads:",
        failedUploads.map((f) => `${f.fileName}: ${f.error}`)
      );
    }

    if (successfulUploads.length > 0) {
      console.log(
        "Successful uploads:",
        successfulUploads.map((f) => f.fileName)
      );
    }

    // Return detailed response even if some files failed
    return new Response(
      JSON.stringify({
        success: successfulUploads.length > 0, // Success if at least one file uploaded
        uploadedFiles: successfulUploads,
        failedFiles: failedUploads,
        message: `Successfully uploaded ${successfulUploads.length} files${
          failedUploads.length > 0 ? `, ${failedUploads.length} failed` : ""
        }`,
        totalFiles: files.length,
        successfulCount: successfulUploads.length,
        failedCount: failedUploads.length,
        details: {
          successful: successfulUploads.map((f) => ({
            fileName: f.fileName,
            publicUrl: f.publicUrl,
          })),
          failed: failedUploads.map((f) => ({
            fileName: f.fileName,
            error: f.error,
          })),
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({
        error: "Upload failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
