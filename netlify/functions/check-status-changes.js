import { checkStatusAndNotify } from "./email-utils.js";

// Get total count of pages in database for comparison
const getDatabaseTotalCount = async (databaseId, notionApiKey) => {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 1, // Just get 1 page to get the total count
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Notion API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    console.error("Failed to get database total count:", error.message);
    return 0;
  }
};

// Get all pages from the database that have relevant statuses and haven't been emailed yet
const getDatabasePages = async (databaseId, notionApiKey) => {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: {
            and: [
              {
                or: [
                  {
                    property: "Status",
                    status: {
                      equals: "Completed",
                    },
                  },
                  {
                    property: "Status",
                    status: {
                      equals: "Rejected",
                    },
                  },
                ],
              },
              {
                property: "Email Sent",
                checkbox: {
                  equals: false,
                },
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Notion API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(data.results);
    return data.results || [];
  } catch (error) {
    console.error("Failed to fetch database pages:", error.message);
    return [];
  }
};

export const handler = async (event, context) => {
  // Check if this is a scheduled function trigger or manual trigger
  const isScheduled =
    event.headers?.["x-netlify-scheduled"] ||
    event.headers?.["x-cron-trigger"] ||
    event.queryStringParameters?.cron === "true";

  if (!isScheduled) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error:
          "This function can only be triggered by scheduled events or manual testing",
        message: "Use ?cron=true for manual testing",
      }),
    };
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  console.log("Database ID:", databaseId);
  if (!notionApiKey || !databaseId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Notion configuration missing or database ID not set",
      }),
    };
  }

  try {
    console.log("Starting status check scheduled job...");

    // Get total count and filtered pages from the database
    const totalPages = await getDatabaseTotalCount(databaseId, notionApiKey);
    const pages = await getDatabasePages(databaseId, notionApiKey);

    console.log(`Database filtering results:`);
    console.log(`  - Total pages in database: ${totalPages}`);
    console.log(
      `  - Pages matching criteria (relevant status + email not sent): ${pages.length}`
    );
    console.log(
      `  - Pages filtered out at database level: ${totalPages - pages.length}`
    );

    let emailsSent = 0;
    let errors = 0;

    // Check each page for status changes
    for (const page of pages) {
      try {
        const emailSentResult = await checkStatusAndNotify(page, notionApiKey);
        if (emailSentResult) {
          emailsSent++;
        }
      } catch (error) {
        console.error(`Error processing page ${page.id}:`, error.message);
        errors++;
      }
    }

    const result = {
      success: true,
      totalDatabasePages: totalPages,
      pagesFound: pages.length,
      pagesChecked: pages.length,
      emailsSent,
      errors,
      timestamp: new Date().toISOString(),
      trigger: isScheduled ? "scheduled" : "manual",
    };

    console.log("Scheduled job completed:", result);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Scheduled job failed:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Scheduled job failed",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
