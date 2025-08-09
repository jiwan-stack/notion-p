# Notion Proxy Service with Direct File Upload

A Netlify function that acts as a proxy to the Notion API, with automatic database ID injection for creating pages and **direct image uploads to Notion**.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Install Netlify CLI globally (if not already installed):

```bash
npm install -g netlify-cli
```

3. Set up environment variables in a `.env` file:

```bash
VITE_NOTION_API_KEY=your_notion_integration_token
VITE_NOTION_DATABASE_ID=your_notion_database_id
```

4. Start the development server:

```bash
npm run dev
```

This will start the Netlify dev server on `http://localhost:8888` and you can test the form locally.

## CORS Issues

If you're getting CORS errors when testing locally:

1. Make sure you're running the Netlify dev server (`npm run dev`)
2. Access the site through `http://localhost:8888` (not `file://` protocol)
3. The function includes comprehensive CORS headers for local development

## Usage

The form submits to `/.netlify/functions/submit-to-notion?path=/v1/pages` and automatically:

- Injects the `parent.database_id` from environment variables
- Handles CORS for local and production environments
- Provides proper error handling and feedback
- **Uploads images directly to Notion** using the Direct Upload API

### File Upload Features

- **Temporary Storage**: Images are temporarily stored in Netlify Blobs
- **Notion Integration**: Files are then uploaded to Notion using Direct Upload API
- **Automatic Cleanup**: Temporary files are automatically removed after 24 hours
- **Automatic Validation**: File size, type, and format validation
- **Progress Tracking**: Real-time upload progress with visual feedback
- **Error Handling**: Comprehensive error handling for upload failures

## Direct File Upload to Notion

The service now supports **direct image uploads to Notion** without requiring external storage services.

### How It Works

1. **Client-side Processing**: Images are converted to base64 using the FileReader API
2. **Temporary Storage**: Files are temporarily stored in Netlify Blobs for public access
3. **Notion Upload**: Files are uploaded to Notion using their Direct Upload API with the public URL
4. **Database Integration**: Uploaded files are automatically linked to database entries
5. **Automatic Cleanup**: Temporary files in Netlify Blobs are automatically removed after 24 hours

### Supported Features

- **File Types**: JPEG, PNG, GIF, WebP, SVG
- **File Size**: Up to 5MB per file (free workspace limit)
- **Batch Upload**: Up to 10 files per submission
- **Progress Tracking**: Real-time upload progress with visual feedback
- **Error Handling**: Comprehensive validation and error reporting

### API Endpoint

```
POST /.netlify/functions/upload-to-notion
```

For detailed documentation, see [DIRECT_UPLOAD_README.md](./DIRECT_UPLOAD_README.md).

## Cron Function - Status Change Notifications

A scheduled function is available at `/.netlify/functions/check-status-changes` that:

- **Automatically runs every 15 minutes** via Netlify's built-in scheduling
- Checks for pages with "Approved" or "Declined" status
- Sends automated emails to clients when their project status changes
- Uses Nodemailer for email delivery

### Setting up the Scheduled Function

1. **Install Nodemailer dependency:**

   ```bash
   npm install nodemailer
   ```

2. **Set up environment variables:**

   ```bash
   # SMTP Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@yourdomain.com

   # Alternative: Gmail App Password
   GMAIL_APP_PASSWORD=your-gmail-app-password
   ```

3. **Configuration is automatic** - The function is already configured in `netlify.toml`:

   ```toml
   [[functions]]
     function = "check-status-changes"
     schedule = "@every 15m"
   ```

### Email Configuration Examples

#### Gmail Setup

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
FROM_EMAIL=your-email@gmail.com
```

#### Outlook/Hotmail Setup

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
FROM_EMAIL=your-email@outlook.com
```

#### Custom SMTP Server

```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
FROM_EMAIL=noreply@yourdomain.com
```

### Manual Testing

You can test the function manually by visiting:

```
https://your-site.netlify.app/.netlify/functions/check-status-changes?cron=true
```

### Email Templates

The function sends beautifully formatted HTML emails with:

- Project details (service type, budget, description)
- Status-specific messaging (congratulations for approved, alternative options for declined)
- Professional styling and branding

### Monitoring

- **Function Logs**: Check Netlify dashboard → Functions → check-status-changes
- **Email Delivery**: Monitor your email service dashboard
- **Scheduled Runs**: View scheduled function execution in Netlify dashboard

## Netlify Blobs Setup

This service uses Netlify Blobs for temporary file storage before uploading to Notion. Here's how to set it up:

### Quick Setup (Recommended)

1. **Login to Netlify CLI:**

   ```bash
   npx netlify login
   ```

2. **Start development server:**

   ```bash
   npx netlify dev
   ```

   This automatically configures all required environment variables.

### Manual Setup

If you prefer to set up environment variables manually:

1. **Get your Netlify Site ID:**

   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Select your site
   - Go to **Site Settings** → **General** → **Site Information**
   - Copy the **Site ID**

2. **Get your Netlify Personal Access Token:**

   - Go to [User Settings](https://app.netlify.com/user/settings)
   - Click **Applications** → **Personal Access Tokens**
   - Click **New Access Token**
   - Give it a name (e.g., "Notion Upload Function")
   - Copy the generated token

3. **Create NETLIFY_BLOBS_CONTEXT:**

   ```bash
   # Create this JSON object:
   {
     "apiURL": "https://api.netlify.com",
     "token": "your-netlify-token",
     "siteID": "your-site-id"
   }

   # Convert to Base64 and add to .env:
   NETLIFY_BLOBS_CONTEXT=your-base64-encoded-string
   ```

### Environment Variables

- `NOTION_API_KEY`: Your Notion integration token (for direct uploads)
- `VITE_NOTION_API_KEY`: Your Notion integration token (for API proxy)
- `VITE_NOTION_DATABASE_ID`: Your Notion database ID (for auto-injection)
- `NETLIFY_SITE_ID`: Your Netlify site ID (for Blobs)
- `NETLIFY_TOKEN`: Your Netlify personal access token (for Blobs)
- `NETLIFY_BLOBS_CONTEXT`: Base64-encoded Blobs configuration (auto-generated)
- `SMTP_HOST`: SMTP server host (default: smtp.gmail.com)
- `SMTP_PORT`: SMTP server port (default: 587)
- `SMTP_SECURE`: Use SSL/TLS (default: false)
- `SMTP_USER`: SMTP username/email
- `SMTP_PASS`: SMTP password
- `GMAIL_APP_PASSWORD`: Gmail app password (alternative to SMTP_PASS)
- `FROM_EMAIL`: Sender email address (defaults to noreply@yourdomain.com)

### Troubleshooting Netlify Blobs

#### Common Issues

1. **"MissingBlobsEnvironmentError"**

   - Run `npx netlify login` to authenticate
   - Use `npx netlify dev` to start development server
   - Ensure `NETLIFY_BLOBS_CONTEXT` is set in production environment

2. **"Failed retrieving site information"**

   - Check your Netlify login status: `npx netlify status`
   - Verify your site ID is correct
   - Ensure your personal access token has proper permissions

3. **Environment Variables Not Loading**
   - Use `npx netlify dev` instead of `node` directly
   - Check that `.env` file is in project root
   - Verify environment variables are set in Netlify dashboard for production

#### Production Deployment

For production, set these environment variables in your Netlify dashboard:

- Go to **Site Settings** → **Environment Variables**
- Add `NETLIFY_BLOBS_CONTEXT` with the Base64-encoded value
- Redeploy your site after adding variables
