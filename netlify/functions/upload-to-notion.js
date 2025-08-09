import { getStore } from "@netlify/blobs";

// Use native fetch instead of axios to avoid module compatibility issues

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
            error: "No file data provided",
          };
        }

        console.log(`File ${fileName} data length: ${fileData.length}`);

        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, "base64");
        console.log(`File ${fileName} buffer length: ${buffer.length}`);

        // Create unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}_${fileName}`;
        console.log(`File ${fileName} unique name: ${uniqueFileName}`);

        // Store file temporarily in Netlify Blobs
        const store = getStore("temp-uploads");

        try {
          console.log(`Storing file ${fileName} in Netlify Blobs...`);
          await store.set(uniqueFileName, buffer, {
            contentType: mimeType,
            access: "public",
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
            error: "Failed to store file temporarily: " + blobError.message,
          };
        }

        // Get public URL - use fallback if URL env var not set
        const baseUrl =
          process.env.URL ||
          process.env.DEPLOY_URL ||
          "https://notion-p.netlify.app";
        const publicUrl = `${baseUrl}/.netlify/blobs/temp-uploads/${uniqueFileName}`;
        console.log(`File ${fileName} temporary URL:`, publicUrl);

        // Set expiry time to 24 hours from now
        const expiryTime = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();

        console.log(
          `Uploading file ${fileName} to Notion with URL:`,
          publicUrl
        );

        // Upload to Notion using Direct Upload API with fetch
        const notionResponse = await fetch("https://api.notion.com/v1/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: {
              type: "file",
              file: {
                url: publicUrl,
                expiry_time: expiryTime,
              },
            },
          }),
        });

        if (!notionResponse.ok) {
          throw new Error(
            `Notion API error: ${notionResponse.status} ${notionResponse.statusText}`
          );
        }

        const notionData = await notionResponse.json();
        console.log(`File ${fileName} Notion API response:`, notionData);

        return {
          success: true,
          fileName,
          notionFile: notionData,
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
