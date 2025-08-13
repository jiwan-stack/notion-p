// Email configuration and text content
export const emailConfig = {
  // Email subject templates
  subjects: {
    Completed: "Service Request Status: Completed",
    Rejected: "Service Request Status: Rejected",
    default: "Service Request Status",
  },

  // Header text
  header: {
    title: "Service Request Status",
    greeting: "Dear",
    statusUpdate: "Your service request status has been updated to:",
  },

  // Section titles
  sections: {
    serviceRequestDetails: "Service Request Details:",
    productName: "Product:",
    serialNumber: "Serial Number:",
    purchaseDate: "Purchase Date:",
    issueType: "Issue Type:",
    issueDetails: "Issue Description & Details:",
    preferredEngineerDate: "Preferred Engineer Date:",
    productImage: "Product Reference Image:",
  },

  // Status-specific messages
  statusMessages: {
    Completed: {
      title: "Service Completed!",
      message:
        "Your product has been successfully repaired. Thank you for choosing our services!",
      followUp:
        "If you have any questions about the service performed or need further assistance, please don't hesitate to reach out.",
    },
    Rejected: {
      title: "Service Request Rejected",
      message:
        "We regret to inform you that your service request has been rejected at this time.",
      followUp:
        "If you'd like to discuss this decision or explore alternative options, please feel free to contact us.",
    },
  },

  // Footer text
  footer: {
    regards: "Best regards,",
    team: "Service Team",
    website: "Stackseekers.com",
    websiteUrl: "https://www.stackseekers.com",
  },
};
