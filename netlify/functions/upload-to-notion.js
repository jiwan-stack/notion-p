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
    const { files, clientDatabaseId } = JSON.parse(event.body);

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
            error: "No file data provided",
          };
        }

        console.log(`File ${fileName} data length: ${fileData.length}`);

        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, "base64");
        console.log(`File ${fileName} buffer length: ${buffer.length}`);

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
        const blobsContext = process.env.NETLIFY_BLOBS_CONTEXT;
        if (!blobsContext) {
          throw new Error(
            "NETLIFY_BLOBS_CONTEXT environment variable is required"
          );
        }

        const store = getStore("temp-uploads", {
          siteID: JSON.parse(Buffer.from(blobsContext, "base64").toString())
            .siteID,
          token: JSON.parse(Buffer.from(blobsContext, "base64").toString())
            .token,
        });

        try {
          console.log(
            `Storing file ${fileName} in Netlify Blobs for public access...`
          );
          await store.set(uniqueFileName, buffer, {
            contentType: mimeType,
            ttl: 24 * 60 * 60, // 24 hours
          });
          console.log(`File ${fileName} stored successfully in Netlify Blobs`);
        } catch (blobError) {
          console.error(
            `Error storing file ${fileName} in Netlify Blobs:`,
            blobError
          );
          return {
            success: false,
            fileName,
            error:
              "Failed to store file for public access: " + blobError.message,
          };
        }

        // Set expiry time to 24 hours from now
        const expiryTime = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();

        console.log(`Creating Notion page with file attachment: ${publicUrl}`);

        // Instead of using /v1/files (which is for Direct Upload),
        // we'll create a page with the file attached using the public URL
        // This is the correct way according to Notion's documentation

        // First, let's try to get the database schema to see what properties exist
        console.log(`Getting database schema for: ${clientDatabaseId}`);

        const dbResponse = await fetch(
          `https://api.notion.com/v1/databases/${clientDatabaseId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${notionApiKey}`,
              "Notion-Version": "2022-06-28",
            },
          }
        );

        if (!dbResponse.ok) {
          console.error(
            `Failed to get database schema: ${dbResponse.status} ${dbResponse.statusText}`
          );
          throw new Error(
            `Failed to get database schema: ${dbResponse.status}`
          );
        }

        const dbData = await dbResponse.json();
        console.log(`Database properties:`, Object.keys(dbData.properties));

        // Find the first title property and files property
        const titleProperty = Object.keys(dbData.properties).find(
          (key) => dbData.properties[key].type === "title"
        );

        const filesProperty = Object.keys(dbData.properties).find(
          (key) => dbData.properties[key].type === "files"
        );

        if (!titleProperty) {
          throw new Error("No title property found in database");
        }

        console.log(
          `Using title property: ${titleProperty}, files property: ${
            filesProperty || "none"
          }`
        );

        // Create the request body with the actual property names from the database
        const requestBody = {
          parent: { database_id: clientDatabaseId },
          properties: {
            [titleProperty]: {
              title: [
                {
                  text: {
                    content: fileName,
                  },
                },
              ],
            },
          },
        };

        // Only add files property if it exists
        if (filesProperty) {
          requestBody.properties[filesProperty] = {
            files: [
              {
                name: fileName,
                type: "external",
                external: {
                  url: publicUrl,
                },
              },
            ],
          };
        } else {
          console.log(
            `No files property found, file will be accessible via URL: ${publicUrl}`
          );
        }

        console.log(
          `Full Notion API request body:`,
          JSON.stringify(requestBody, null, 2)
        );

        // Create a page with the file attached
        const notionResponse = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!notionResponse.ok) {
          const errorText = await notionResponse.text();
          console.error(`Notion API error for ${fileName}:`, errorText);
          throw new Error(
            `Notion API error: ${notionResponse.status} ${notionResponse.statusText}`
          );
        }

        const notionData = await notionResponse.json();
        console.log(`File ${fileName} Notion page created:`, notionData);

        return {
          success: true,
          fileName,
          notionPage: notionData,
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

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        uploadedFiles: successfulUploads,
        failedFiles: failedUploads,
        message: `Successfully uploaded ${successfulUploads.length} files${
          failedUploads.length > 0 ? `, ${failedUploads.length} failed` : ""
        }`,
        totalFiles: files.length,
        successfulCount: successfulUploads.length,
        failedCount: failedUploads.length,
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
