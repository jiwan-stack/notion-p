// Import email configuration
import { emailConfig } from "./config.js";

// Email styling configuration
const emailStyling = {
  // Status colors and styling with improved contrast and meaning
  statusStyles: {
    Completed: {
      color: "#0f5132",
      bgColor: "#d1e7dd",
      borderColor: "#badbcc",
      icon: "🎉",
      gradient: "linear-gradient(135deg, #d1e7dd 0%, #c3e6cb 100%)",
    },
    "In Progress": {
      color: "#664d03",
      bgColor: "#fff3cd",
      borderColor: "#ffecb5",
      icon: "🔧",
      gradient: "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
    },
    Approved: {
      color: "#055160",
      bgColor: "#cff4fc",
      borderColor: "#b6effb",
      icon: "✅",
      gradient: "linear-gradient(135deg, #cff4fc 0%, #b6effb 100%)",
    },
    Rejected: {
      color: "#842029",
      bgColor: "#f8d7da",
      borderColor: "#f5c2c7",
      icon: "❌",
      gradient: "linear-gradient(135deg, #f8d7da 0%, #f5c2c7 100%)",
    },
  },

  // Enhanced email styling with better typography and spacing
  styling: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: "650px",
    primaryColor: "#1a202c",
    secondaryColor: "#4a5568",
    backgroundColor: "#ffffff",
    cardBackground: "#f7fafc",
    borderColor: "#e2e8f0",
    borderRadius: "12px",
    padding: "24px",
    margin: "24px 0",
    shadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    headerBg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    headerTextColor: "#ffffff",
  },
};

// Email HTML Templates for Service Requests
export const emailTemplates = {
  // Header template with client name and status
  header: (clientName, status) => {
    const statusColor =
      status === "Completed"
        ? "#059669"
        : status === "In Progress"
        ? "#d97706"
        : status === "Approved"
        ? "#0891b2"
        : status === "Rejected"
        ? "#dc2626"
        : "#6b7280";

    return `
      <div style="font-family: ${emailStyling.styling.fontFamily}; max-width: ${emailStyling.styling.maxWidth}; margin: 0 auto; background: ${emailStyling.styling.backgroundColor}; border-radius: ${emailStyling.styling.borderRadius}; box-shadow: ${emailStyling.styling.shadow}; overflow: hidden;">
        <!-- Header with gradient background -->
        <div style="background: ${emailStyling.styling.headerBg}; padding: 32px 24px; text-align: center;">
          <h1 style="color: ${emailStyling.styling.headerTextColor}; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.025em;">${emailConfig.header.title}</h1>
        </div>
        
        <!-- Content area -->
        <div style="padding: 32px 24px;">
          <p style="color: ${emailStyling.styling.secondaryColor}; font-size: 16px; margin: 0 0 16px 0; line-height: 1.6;">
            ${emailConfig.header.greeting} <strong style="color: ${emailStyling.styling.primaryColor};">${clientName}</strong>,
          </p>
          <p style="color: ${emailStyling.styling.secondaryColor}; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
            ${emailConfig.header.statusUpdate} 
            <span style="display: inline-block; background: ${statusColor}; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">${status}</span>
          </p>
    `;
  },

  // Service request details section
  serviceRequestDetails: (
    productName,
    serialNumber,
    purchaseDate,
    issueType,
    issueDetails,
    engineerDate,
    imageUrl
  ) => {
    return `
      <div style="background: ${
        emailStyling.styling.cardBackground
      }; border: 1px solid ${
      emailStyling.styling.borderColor
    }; border-radius: ${emailStyling.styling.borderRadius}; padding: ${
      emailStyling.styling.padding
    }; margin: ${emailStyling.styling.margin}; box-shadow: ${
      emailStyling.styling.shadow
    };">
        <h3 style="margin: 0 0 20px 0; color: ${
          emailStyling.styling.primaryColor
        }; font-size: 20px; font-weight: 600; border-bottom: 2px solid ${
      emailStyling.styling.borderColor
    }; padding-bottom: 12px;">
          📋 ${emailConfig.sections.serviceRequestDetails}
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: white; padding: 16px;">
            <h4 style="margin: 0 0 8px 0; color: ${
              emailStyling.styling.primaryColor
            }; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${
      emailConfig.sections.productName
    }</h4>
            <p style="margin: 0; color: ${
              emailStyling.styling.secondaryColor
            }; font-size: 16px; font-weight: 500;">${productName}</p>
          </div>
          <div style="background: white; padding: 16px;">
            <h4 style="margin: 0 0 8px 0; color: ${
              emailStyling.styling.primaryColor
            }; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${
      emailConfig.sections.serialNumber
    }</h4>
            <p style="margin: 0; color: ${
              emailStyling.styling.secondaryColor
            }; font-size: 16px; font-weight: 500; font-family: 'Courier New', monospace;">${serialNumber}</p>
          </div>
          <div style="background: white; padding: 16px;">
            <h4 style="margin: 0 0 8px 0; color: ${
              emailStyling.styling.primaryColor
            }; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${
      emailConfig.sections.purchaseDate
    }</h4>
            <p style="margin: 0; color: ${
              emailStyling.styling.secondaryColor
            }; font-size: 16px; font-weight: 500;">${purchaseDate}</p>
          </div>
          <div style="background: white; padding: 16px;">
            <h4 style="margin: 0 0 8px 0; color: ${
              emailStyling.styling.primaryColor
            }; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${
      emailConfig.sections.issueType
    }</h4>
            <p style="margin: 0; color: ${
              emailStyling.styling.secondaryColor
            }; font-size: 16px; font-weight: 500; background: #f3f4f6; padding: 6px 12px; display: inline-block;">${issueType}</p>
          </div>
        </div>
        <div style="background: white; padding: 20px; margin-top: 20px; border-left: 4px solid #667eea;">
          <h4 style="margin: 0 0 12px 0; color: ${
            emailStyling.styling.primaryColor
          }; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
            🔍 ${emailConfig.sections.issueDetails}
          </h4>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; color: ${
              emailStyling.styling.primaryColor
            }; font-size: 16px; font-weight: 500; line-height: 1.7; font-family: 'Georgia', serif;">${issueDetails}</p>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">
                💡 This information helps our technicians understand and resolve your issue more effectively.
              </p>
            </div>
          </div>
        </div>
        ${
          engineerDate
            ? `<div style="background: white; padding: 16px; margin-top: 16px;">
                <h4 style="margin: 0 0 8px 0; color: ${emailStyling.styling.primaryColor}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${emailConfig.sections.preferredEngineerDate}</h4>
                <p style="margin: 0; color: ${emailStyling.styling.secondaryColor}; font-size: 16px; font-weight: 500;">${engineerDate}</p>
               </div>`
            : ""
        }
        ${
          imageUrl
            ? `<div style="background: white; padding: 16px; margin-top: 16px;">
                <h4 style="margin: 0 0 8px 0; color: ${emailStyling.styling.primaryColor}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${emailConfig.sections.productImage}</h4>
                <div style="text-align: center;">
                  <img src="${imageUrl}" alt="Product Image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-height: 300px;" />
                  <p style="margin: 8px 0 0 0; color: ${emailStyling.styling.secondaryColor}; font-size: 14px; font-style: italic;">Product reference image</p>
                </div>
               </div>`
            : ""
        }
      </div>
    `;
  },

  // Status-specific content
  statusContent: (status) => {
    const statusData = emailConfig.statusMessages[status];
    if (!statusData) return "";

    const statusStyle = emailStyling.statusStyles[status];
    if (!statusStyle) return "";

    return `
      <div style="background: ${statusStyle.gradient}; border: 1px solid ${statusStyle.borderColor}; border-radius: ${emailStyling.styling.borderRadius}; padding: ${emailStyling.styling.padding}; margin: ${emailStyling.styling.margin}; box-shadow: ${emailStyling.styling.shadow}; position: relative; overflow: hidden;">        
        <!-- Status content -->
        <div style="position: relative; z-index: 1;">
          <h3 style="margin: 0 0 12px 0; color: ${statusStyle.color}; font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            ${statusStyle.icon} ${statusData.title}
          </h3>
          <p style="margin: 0 0 16px 0; color: ${statusStyle.color}; font-size: 16px; line-height: 1.6; font-weight: 500;">
            ${statusData.message}
          </p>
        </div>
      </div>
      
      <!-- Follow-up message -->
      <div style="background: white; border: 1px solid ${emailStyling.styling.borderColor}; border-radius: ${emailStyling.styling.borderRadius}; padding: 20px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="margin: 0; color: ${emailStyling.styling.secondaryColor}; font-size: 16px; line-height: 1.6; text-align: center; font-style: italic;">
          💡 ${statusData.followUp}
        </p>
      </div>
    `;
  },

  // Footer
  footer: () => {
    return `
      <div style="background: ${emailStyling.styling.cardBackground}; border-top: 3px solid ${emailStyling.styling.borderColor}; padding: 24px; margin: 24px 0 0 0; text-align: center;">
        <p style="margin: 0 0 16px 0; color: ${emailStyling.styling.secondaryColor}; font-size: 16px; font-weight: 500;">
          ${emailConfig.footer.regards}
        </p>
        <p style="margin: 0 0 20px 0; color: ${emailStyling.styling.primaryColor}; font-size: 18px; font-weight: 600;">
          ${emailConfig.footer.team}
        </p>
        <div style="background: white; display: inline-block; padding: 12px 24px; border-radius: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <a href="${emailConfig.footer.websiteUrl}" style="color: #667eea; text-decoration: none; font-weight: 600; font-size: 16px; display: flex; align-items: center; gap: 8px;">
            🌐 ${emailConfig.footer.website}
          </a>
        </div>
      </div>
    </div>
    `;
  },
};

// Helper function to build complete email body for service requests
export const buildEmailBody = (
  clientName,
  status,
  productName,
  serialNumber,
  purchaseDate,
  issueType,
  issueDetails,
  engineerDate,
  imageUrl
) => {
  const header = emailTemplates.header(clientName, status);
  const serviceRequestDetails = emailTemplates.serviceRequestDetails(
    productName,
    serialNumber,
    purchaseDate,
    issueType,
    issueDetails,
    engineerDate,
    imageUrl
  );
  const statusContent = emailTemplates.statusContent(status);
  const footer = emailTemplates.footer();

  return header + serviceRequestDetails + statusContent + footer;
};
