// Functions API v2 configuration
export const config = {
  method: ["GET", "OPTIONS"]
};

export default async function handler(request, context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    return new Response(JSON.stringify({ error: "Notion configuration missing" }), {
      status: 500,
      headers: corsHeaders,
    });
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
      return new Response(JSON.stringify({
        error: "Issue Type property not found or not a select field",
      }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Extract the select options
    const issueTypes = issueTypeProperty.select.options || [];

    // Format the options for the frontend
    const formattedOptions = issueTypes.map((option) => ({
      name: option.name,
      color: option.color,
    }));

    return new Response(JSON.stringify({
      success: true,
      issueTypes: formattedOptions,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching issue types:", error);
    return new Response(JSON.stringify({
      error: "Failed to fetch issue types",
      message: error.message,
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
