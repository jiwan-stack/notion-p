# Testing the check-status-changes Function Locally

This guide will help you test the `check-status-changes.js` Netlify function locally before deploying.

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **Notion API Key** - Get this from [Notion Integrations](https://www.notion.so/my-integrations)
3. **Notion Database ID** - The ID of your database (found in the URL)
4. **SMTP Credentials** - For sending email notifications

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy the example environment file and fill in your values:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
NOTION_API_KEY=secret_your_actual_api_key
NOTION_DATABASE_ID=your_actual_database_id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Gmail Setup

If you're using Gmail, you'll need to:

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `SMTP_PASS`

## Running the Test

### Option 1: Using npm script

```bash
npm run test:check-status
```

### Option 2: Direct execution

```bash
node test-check-status.js
```

## What the Test Does

The test script will:

1. ✅ Check if all required environment variables are set
2. 🚀 Execute the function with a mock scheduled event
3. 📊 Query your Notion database for pages with "Completed" or "Rejected" status
4. 📧 Send email notifications to clients (if any are found)
5. 📋 Display the results

## Expected Output

```
🧪 Testing check-status-changes function locally...

✅ Environment variables loaded successfully
📊 Database ID: your_database_id
📧 SMTP Host: smtp.gmail.com
👤 SMTP User: your_email@gmail.com

🚀 Executing function...

📋 Function Result:
Status Code: 200
Response Body: {
  "success": true,
  "pagesChecked": 2,
  "emailsSent": 1,
  "errors": 0,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "trigger": "scheduled"
}
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**

   - Ensure all required variables are set in your `.env` file
   - Check that the file is named exactly `.env` (not `.env.txt`)

2. **Notion API Errors**

   - Verify your API key is correct
   - Ensure your integration has access to the database
   - Check that the database ID is correct

3. **SMTP Errors**

   - Verify SMTP credentials
   - Check if your email provider requires specific settings
   - For Gmail, ensure you're using an App Password, not your regular password

4. **Module Import Errors**
   - Ensure you're using Node.js 16+ (supports ES modules)
   - Check that all dependencies are installed

### Debug Mode

To see more detailed logs, you can modify the test script to add more console.log statements or check the function's internal logging.

## Production Deployment

Once testing is successful locally, the function can be deployed to Netlify where it will run on the schedule defined in `netlify.toml` (every 2 minutes in this case).

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables in production for security
- Regularly rotate your API keys and passwords
- Consider using Netlify's environment variable management for production
