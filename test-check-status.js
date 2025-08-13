import dotenv from "dotenv";
import { handler } from "./netlify/functions/check-status-changes.js";

// Load environment variables
dotenv.config();

// Mock event object for local testing
const mockEvent = {
  headers: {
    "x-netlify-scheduled": "true",
  },
  queryStringParameters: null,
};

// Mock context object
const mockContext = {};

async function testFunction() {
  console.log("🧪 Testing check-status-changes function locally...\n");

  try {
    // Check required environment variables
    const requiredEnvVars = [
      "NOTION_API_KEY",
      "NOTION_DATABASE_ID",
      "SMTP_USER",
      "SMTP_PASS",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      console.log("❌ Missing required environment variables:");
      missingVars.forEach((varName) => console.log(`   - ${varName}`));
      console.log(
        "\nPlease check your .env file and ensure all required variables are set."
      );
      return;
    }

    console.log("✅ Environment variables loaded successfully");
    console.log(`📊 Database ID: ${process.env.NOTION_DATABASE_ID}`);
    console.log(`📧 SMTP Host: smtp.gmail.com (hardcoded)`);
    console.log(`👤 SMTP User: ${process.env.SMTP_USER}`);
    console.log("");

    // Test the function
    console.log("🚀 Executing function...");
    const result = await handler(mockEvent, mockContext);

    console.log("\n📋 Function Result:");
    console.log(`Status Code: ${result.statusCode}`);
    console.log("Response Body:");
    console.log(JSON.stringify(JSON.parse(result.body), null, 2));
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
  }
}

// Run the test
testFunction();
