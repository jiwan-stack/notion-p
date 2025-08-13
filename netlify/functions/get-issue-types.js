export const handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
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
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Notion configuration missing" }),
    };
  }

  try {
    // Get database properties to find the Issue Type select options
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Notion API error: ${response.status} ${response.statusText}`
      );
    }

    const database = await response.json();

    // Find the Issue Type property
    const issueTypeProperty = database.properties["Issue Type"];

    if (!issueTypeProperty || issueTypeProperty.type !== "select") {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Issue Type property not found or not a select field",
        }),
      };
    }

    // Extract the select options
    const issueTypes = issueTypeProperty.select.options || [];

    // Format the options for the frontend
    const formattedOptions = issueTypes.map((option) => ({
      name: option.name,
      color: option.color,
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        issueTypes: formattedOptions,
      }),
    };
  } catch (error) {
    console.error("Error fetching issue types:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Failed to fetch issue types",
        message: error.message,
      }),
    };
  }
};
