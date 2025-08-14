import { createTransport } from "nodemailer";
import { buildEmailBody } from "./email-templates.js";
import { emailConfig } from "./config.js";

const createTransporter = () => {
  const emailConfig = {
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // false for port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  return createTransport(emailConfig);
};

// Send email using Nodemailer
export const sendEmail = async (to, subject, body) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.error("Email transporter not configured");
    return false;
  }

  try {
    const mailOptions = {
      from: "noreply@yourdomain.com",
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

// Check if status has changed and send email
// This function prevents duplicate emails by checking the "Email Sent" checkbox
export const checkStatusAndNotify = async (page, notionApiKey) => {
  const status = page.properties?.Status?.status?.name;
  const clientName =
    page.properties?.["Full Name"]?.title?.[0]?.text?.content || "Unknown";
  const email = page.properties?.Email?.email || "";
  const productName =
    page.properties?.["Product"]?.rich_text?.[0]?.text?.content || "";
  const serialNumber =
    page.properties?.["Serial Number"]?.rich_text?.[0]?.text?.content || "";
  const purchaseDate = page.properties?.["Purchase Date"]?.date?.start || "";
  const issueType = page.properties?.["Issue Type"]?.select?.name || "";
  const issueDetails =
    page.properties?.["Issue Details"]?.rich_text?.[0]?.text?.content || "";
  const engineerDate = page.properties?.["Engineer Date"]?.date?.start || "";
  const imageUrl = page.properties?.["Image Upload"]?.url || "";

  // Check if email has already been sent for this status
  const emailSent = page.properties?.["Email Sent"]?.checkbox || false;
  const emailSentDate = page.properties?.["Email Sent Date"]?.date?.start || "";

  if (!email || !status) {
    console.log(`Skipping page ${page.id}: missing email or status`);
    return false;
  }

  // Check if email has already been sent for this status to prevent duplicates
  if (emailSent) {
    console.log(
      `Skipping request for ${clientName} with email ${email} and status ${status} because email already sent on ${emailSentDate}`
    );
    return false;
  }

  // Check if status is one of the supported statuses
  if (["Completed", "Rejected"].includes(status)) {
    const subject =
      emailConfig.subjects[status] || emailConfig.subjects.default;
    const body = buildEmailBody(
      clientName,
      status,
      productName,
      serialNumber,
      purchaseDate,
      issueType,
      issueDetails,
      engineerDate,
      imageUrl
    );

    const emailSentSuccess = await sendEmail(email, subject, body);

    if (emailSentSuccess) {
      console.log(
        `Email sent successfully to ${email} for page ${page.id} with status "${status}"`
      );
      // Update Notion to mark email as sent
      const updateSuccess = await updateEmailSentStatus(page.id, notionApiKey);
      if (!updateSuccess) {
        console.warn(`Email sent but failed to update Notion page ${page.id}`);
      }
    } else {
      console.log(
        `Failed to send email to ${email} for page ${page.id} with status "${status}"`
      );
    }

    return emailSentSuccess;
  }

  return false;
};

// Update Notion page to mark email as sent
export const updateEmailSentStatus = async (pageId, notionApiKey) => {
  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          "Email Sent": {
            checkbox: true,
          },
          "Email Sent Date": {
            date: {
              start: new Date().toISOString(),
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        `Failed to update Notion page ${pageId}: ${response.status} ${response.statusText}`
      );
      console.warn(`Error details: ${errorText}`);

      // If the "Email Sent" property doesn't exist, we'll just log it but not fail
      if (response.status === 400) {
        console.log(
          `Note: "Email Sent" property may not exist in database yet. You may need to add this property to your Notion database.`
        );
        return true; // Don't fail the email sending process
      }

      return false;
    }

    console.log(`Updated page ${pageId}: Email marked as sent`);
    return true;
  } catch (error) {
    console.error(`Failed to update page ${pageId}:`, error.message);
    return false;
  }
};
