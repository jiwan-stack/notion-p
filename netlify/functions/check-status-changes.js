const axios = require("axios");
const nodemailer = require("nodemailer");

// Configure Nodemailer transporter
const createTransporter = () => {
  const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // If using Gmail with app password
  if (emailConfig.host === "smtp.gmail.com" && !emailConfig.auth.pass) {
    emailConfig.auth.pass = process.env.GMAIL_APP_PASSWORD;
  }

  return nodemailer.createTransporter(emailConfig);
};

// Send email using Nodemailer
const sendEmail = async (to, subject, body) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.error("Email transporter not configured");
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
      to,
      subject,
      html: body,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}:`, info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return false;
  }
};

// Get all pages from the database that have status changes
const getDatabasePages = async (databaseId, notionApiKey) => {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        filter: {
          or: [
            {
              property: "Status",
              status: {
                equals: "Approved",
              },
            },
            {
              property: "Status",
              status: {
                equals: "Declined",
              },
            },
          ],
        },
        sorts: [
          {
            property: "Date Received",
            direction: "descending",
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data.results);
    return response.data.results || [];
  } catch (error) {
    console.error("Failed to fetch database pages:", error.message);
    return [];
  }
};

// Check if status has changed and send email
const checkStatusAndNotify = async (page, notionApiKey) => {
  const status = page.properties?.Status?.status?.name;
  const clientName =
    page.properties?.["Client Name"]?.title?.[0]?.text?.content || "Unknown";
  const email = page.properties?.Email?.email || "";
  const projectDetails =
    page.properties?.["Project Details"]?.rich_text?.[0]?.text?.content || "";
  const serviceType = page.properties?.["Service Type"]?.select?.name || "";
  const budgetRange = page.properties?.["Budget Range"]?.select?.name || "";

  if (!email || !status) {
    console.log(`Skipping page ${page.id}: missing email or status`);
    return false;
  }

  // Check if status is approved or declined
  if (status === "Approved" || status === "Declined") {
    const subject = `Project Status Update: ${status}`;

    let body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Project Status Update</h2>
        <p>Dear ${clientName},</p>
        <p>Your project status has been updated to: <strong style="color: ${
          status === "Approved" ? "#28a745" : "#dc3545"
        }">${status}</strong></p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Project Details:</h3>
          <ul style="margin: 10px 0;">
            <li><strong>Service Type:</strong> ${serviceType}</li>
            <li><strong>Budget Range:</strong> ${budgetRange}</li>
            <li><strong>Project Details:</strong> ${projectDetails}</li>
          </ul>
        </div>
    `;

    if (status === "Approved") {
      body += `
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #155724;">🎉 <strong>Congratulations!</strong> Your project has been approved. We'll be in touch soon with next steps.</p>
        </div>
        <p>If you have any questions, please don't hesitate to reach out.</p>
      `;
    } else if (status === "Declined") {
      body += `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #721c24;">We regret to inform you that your project has been declined at this time.</p>
        </div>
        <p>If you'd like to discuss this decision or explore alternative options, please feel free to contact us.</p>
      `;
    }

    body += `
        <p>Best regards,<br>Your Team</p>
      </div>
    `;

    const emailSent = await sendEmail(email, subject, body);
    return emailSent;
  }

  return false;
};

exports.handler = async (event, context) => {
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

  const notionApiKey = process.env.VITE_NOTION_API_KEY;
  const databaseId = process.env.VITE_NOTION_DATABASE_ID;
  console.log("VITE_NOTION_DATABASE_ID-->", databaseId);
  if (!notionApiKey || !databaseId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Notion configuration missing" }),
    };
  }

  try {
    console.log("Starting status check scheduled job...");

    // Get all pages from the database with approved or declined status
    const pages = await getDatabasePages(databaseId, notionApiKey);
    console.log(`Found ${pages.length} pages to check`);

    let emailsSent = 0;
    let errors = 0;

    // Check each page for status changes
    for (const page of pages) {
      try {
        const emailSent = await checkStatusAndNotify(page, notionApiKey);
        if (emailSent) {
          emailsSent++;
        }
      } catch (error) {
        console.error(`Error processing page ${page.id}:`, error.message);
        errors++;
      }
    }

    const result = {
      success: true,
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
