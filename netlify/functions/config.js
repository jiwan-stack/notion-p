// Email configuration and text content
export const emailConfig = {
  // Email subject templates
  subjects: {
    Completed: "Service Request Status Update: Completed",
    "In Progress": "Service Request Status Update: In Progress",
    Approved: "Service Request Status Update: Approved",
    Rejected: "Service Request Status Update: Rejected",
    default: "Service Request Status Update",
  },

  // Header text
  header: {
    title: "Service Request Status Update",
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
    "In Progress": {
      title: "Service In Progress!",
      message: "Our technicians are currently working on your product.",
      followUp:
        "We'll keep you updated on the progress and notify you when the service is complete.",
    },
    Approved: {
      title: "Service Request Approved!",
      message: "We'll be in touch soon to schedule the service.",
      followUp:
        "Our team will contact you to confirm the service details and schedule.",
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
