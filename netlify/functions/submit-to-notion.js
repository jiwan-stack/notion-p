const axios = require("axios");

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse the request body
    const payload = JSON.parse(event.body);

    // Validate required fields
    const requiredFields = ["name", "email", "details", "service", "budget"];
    for (const field of requiredFields) {
      if (!payload[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` }),
        };
      }
    }

    // Get environment variables
    const notionApiKey = process.env.VITE_NOTION_API_KEY;
    const notionDatabaseId = process.env.VITE_NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Notion configuration missing" }),
      };
    }

    // Create Notion page request
    const notionPageRequest = {
      parent: {
        database_id: notionDatabaseId,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: payload.name,
              },
            },
          ],
        },
        Email: {
          email: payload.email,
        },
        "Project Details": {
          rich_text: [
            {
              text: {
                content: payload.details,
              },
            },
          ],
        },
        Service: {
          select: {
            name: payload.service,
          },
        },
        Budget: {
          select: {
            name: payload.budget,
          },
        },
        Status: {
          select: {
            name: "New",
          },
        },
      },
    };

    // Make request to Notion API
    const response = await axios.post(
      "https://api.notion.com/v1/pages",
      notionPageRequest,
      {
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: response.data,
      }),
    };
  } catch (error) {
    console.error("Error submitting to Notion:", error);

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Unknown error";

    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
      }),
    };
  }
};
