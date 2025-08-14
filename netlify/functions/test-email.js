import { createTransport } from "nodemailer";

export const config = {
  method: ["GET", "POST"],
};

export default async function handler(request, context) {
  console.log("=== TEST EMAIL FUNCTION ===");
  
  // Log environment variables (without exposing passwords)
  console.log("SMTP_USER exists:", !!process.env.SMTP_USER);
  console.log("SMTP_PASS exists:", !!process.env.SMTP_PASS);
  console.log("SMTP_USER length:", process.env.SMTP_USER?.length || 0);
  console.log("SMTP_PASS length:", process.env.SMTP_PASS?.length || 0);
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return new Response(JSON.stringify({
      error: "Missing SMTP credentials",
      smtp_user_exists: !!process.env.SMTP_USER,
      smtp_pass_exists: !!process.env.SMTP_PASS
    }), { 
      status: 400, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    // Create transporter
    const transporter = createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    console.log("Testing SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection successful!");

    // Try to send a test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself as test
      subject: "Test Email from Notion-P",
      text: "This is a test email to verify SMTP configuration.",
    });

    console.log("Test email sent:", info.messageId);

    return new Response(JSON.stringify({
      success: true,
      message: "SMTP test successful",
      messageId: info.messageId,
      smtp_user: process.env.SMTP_USER,
      smtp_pass_length: process.env.SMTP_PASS.length
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("SMTP test failed:", error.message);
    
    return new Response(JSON.stringify({
      error: "SMTP test failed",
      message: error.message,
      code: error.code,
      command: error.command,
      smtp_user: process.env.SMTP_USER,
      smtp_pass_length: process.env.SMTP_PASS?.length || 0
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
