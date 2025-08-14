import { getStore } from "@netlify/blobs";

// Use native fetch instead of axios to avoid module compatibility issues
// Note: This function now creates Notion pages with file attachments using public URLs

export const handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Notion-Version, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Notion API key missing" }),
    };
  }

  try {
    const { files } = JSON.parse(event.body);

    if (!files || !Array.isArray(files) || files.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No files provided" }),
      };
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
        // Since this was working before, use the simple approach
        let store;
        try {
          store = getStore("temp-uploads");
          console.log("Netlify Blobs store initialized successfully");
        } catch (storeError) {
          console.error("Failed to initialize Netlify Blobs store:", storeError);
          return {
            success: false,
            fileName,
            error: `File storage initialization failed: ${storeError.message}. Please check that Netlify Blobs is still enabled for your site.`,
          };
        }

          // Check for various automatic Netlify tokens
          const token =
            process.env.NETLIFY_TOKEN ||
            process.env.NETLIFY_AUTH_TOKEN ||
            process.env.NETLIFY_API_TOKEN ||
            process.env.DEPLOY_TOKEN ||
            process.env.GITHUB_TOKEN || // Sometimes available in build context
            process.env.BUILD_TOKEN ||
            // Try to construct from context if available
            (process.env.NETLIFY && process.env.CONTEXT
              ? "auto-generated"
              : null);

          console.log(
            `Attempting manual configuration with siteId: ${
              siteId ? "present" : "missing"
            }, token: ${token ? "present" : "missing"}`
          );

          // Log all available environment variables for debugging
          const netlifyVars = Object.keys(process.env).filter(
            (key) =>
              key.includes("NETLIFY") ||
              key.includes("TOKEN") ||
              key.includes("AUTH") ||
              key.includes("API") ||
              key.includes("DEPLOY") ||
              key.includes("BUILD")
          );
          console.log(
            "Available Netlify/Auth environment variables:",
            netlifyVars
          );

          // Try different approaches to initialize the store
          let storeInitialized = false;
          let lastError = null;

          // Approach 1: Manual configuration with token
          if (siteId && token && token !== "auto-generated") {
            try {
              store = getStore({
                name: "temp-uploads",
                siteID: siteId,
                token: token,
              });
              console.log(
                "Netlify Blobs store initialized with manual token configuration"
              );
              storeInitialized = true;
            } catch (manualError) {
              console.error("Manual token configuration failed:", manualError);
              lastError = manualError;
            }
          }

          // Approach 2: Try with just siteID (sometimes works in Netlify environment)
          if (!storeInitialized && siteId) {
            try {
              store = getStore({
                name: "temp-uploads",
                siteID: siteId,
              });
              console.log(
                "Netlify Blobs store initialized with siteID-only configuration"
              );
              storeInitialized = true;
            } catch (siteIdError) {
              console.error("SiteID-only configuration failed:", siteIdError);
              lastError = siteIdError;
            }
          }

          // Approach 3: Try with minimal configuration
          if (!storeInitialized) {
            try {
              // Sometimes Netlify provides implicit authentication in the runtime
              store = getStore("temp-uploads");
              console.log(
                "Netlify Blobs store initialized with minimal configuration"
              );
              storeInitialized = true;
            } catch (minimalError) {
              console.error("Minimal configuration failed:", minimalError);
              lastError = minimalError;
            }
          }

          if (!storeInitialized) {
            console.error("All Netlify Blobs configuration attempts failed");
            console.error("Last error:", lastError);

            // Check if this might be a Netlify Blobs availability issue
            const errorMessage = lastError?.message || "Unknown error";
            if (errorMessage.includes("not been configured")) {
              return {
                success: false,
                fileName,
                error: `Netlify Blobs is not enabled for this site. Please enable Netlify Blobs in your site settings at https://app.netlify.com/sites/${
                  siteId || "your-site"
                }/configuration/functions#blobs`,
              };
            }

            return {
              success: false,
              fileName,
              error: `File storage initialization failed: ${errorMessage}. This may indicate Netlify Blobs is not available or properly configured for this site.`,
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
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
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
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Upload failed",
        details: error.message,
      }),
    };
  }
};
