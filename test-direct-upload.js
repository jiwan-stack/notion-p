#!/usr/bin/env node

/**
 * Test script for the new direct upload to Notion functionality
 * Run with: node test-direct-upload.js
 */

const fs = require("fs");
const path = require("path");

// Test configuration
const TEST_CONFIG = {
  baseUrl: "http://localhost:8888", // Netlify dev server
  endpoint: "/.netlify/functions/upload-to-notion",
  testImagePath: "./public/uploads/test.png", // Use existing test image
};

async function testDirectUpload() {
  console.log("🧪 Testing Direct Upload to Notion...\n");

  try {
    // Check if test image exists
    if (!fs.existsSync(TEST_CONFIG.testImagePath)) {
      console.log(
        "❌ Test image not found. Please ensure test.png exists in public/uploads/"
      );
      return;
    }

    console.log("✅ Test image found");
    console.log(`📁 Path: ${TEST_CONFIG.testImagePath}`);

    // Get file stats
    const stats = fs.statSync(TEST_CONFIG.testImagePath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📏 File size: ${fileSizeInMB} MB`);

    // Check file size limit
    if (stats.size > 5 * 1024 * 1024) {
      console.log("❌ File exceeds 5MB limit for free Notion workspaces");
      return;
    }

    console.log("✅ File size within limits");

    // Read and convert file to base64
    const fileBuffer = fs.readFileSync(TEST_CONFIG.testImagePath);
    const base64Data = fileBuffer.toString("base64");
    console.log("✅ File converted to base64");

    // Prepare test data
    const testData = {
      files: [
        {
          name: "test.png",
          type: "image/png",
          size: stats.size,
          data: base64Data,
        },
      ],
    };

    console.log("\n📤 Attempting upload to Notion...");
    console.log(`🌐 Endpoint: ${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoint}`);

    // Make the request
    const response = await fetch(
      `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Upload failed with status ${response.status}`);
      console.log(`📝 Error details: ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log("\n✅ Upload successful!");
    console.log("📊 Response:");
    console.log(JSON.stringify(result, null, 2));

    if (result.uploadedFiles && result.uploadedFiles.length > 0) {
      console.log("\n🎉 Direct upload to Notion is working correctly!");
      console.log(`📁 Successfully uploaded ${result.successfulCount} files`);

      if (result.failedFiles && result.failedFiles.length > 0) {
        console.log(`⚠️  ${result.failedCount} files failed to upload`);
      }
    }
  } catch (error) {
    console.log("\n❌ Test failed with error:");
    console.log(error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Make sure the Netlify dev server is running:");
      console.log("   npm run dev");
    }
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === "undefined") {
  console.log("❌ This script requires Node.js 18+ or the fetch polyfill");
  console.log("💡 Consider using: npm install node-fetch");
  process.exit(1);
}

// Run the test
testDirectUpload();
