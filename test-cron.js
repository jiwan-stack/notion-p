// Test script for the cron function
// Run with: node test-cron.js

const axios = require("axios");

async function testCronFunction() {
  try {
    console.log("Testing cron function...");

    const response = await axios.get(
      "http://localhost:8888/.netlify/functions/check-status-changes?cron=true"
    );

    console.log("Status:", response.status);
    console.log("Response:", response.data);
  } catch (error) {
    console.error(
      "Error testing cron function:",
      error.response?.data || error.message
    );
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testCronFunction();
}

module.exports = { testCronFunction };
