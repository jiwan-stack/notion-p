# Notion Proxy Service with Direct File Upload

A comprehensive Netlify-based service that acts as a proxy to the Notion API, with automatic database ID injection for creating pages, **direct image uploads to Notion**, and automated status change notifications.

## 🚀 Features

- **Notion API Proxy**: Secure proxy service for Notion API calls with automatic database ID injection
- **Direct File Upload**: Upload images directly to Notion using their Direct Upload API
- **Automated Notifications**: Scheduled function that sends email notifications when project status changes
- **Service Request Form**: Complete web form for collecting service requests with file attachments
- **Netlify Blobs Integration**: Temporary file storage with automatic cleanup
- **CORS Support**: Full CORS support for both local development and production
- **Optimized Configuration**: Shared database ID configuration for consistent behavior across functions

## 🏗️ Project Structure

```
notion-p/
├── netlify/
│   ├── functions/
│   │   ├── config.js                # Shared configuration constants
│   │   ├── submit-to-notion.js      # Notion API proxy with database injection
│   │   ├── upload-image.js          # Direct image upload to Notion
│   │   ├── serve-blob.js            # Serve temporary files from Netlify Blobs
│   │   └── check-status-changes.js  # Automated status change notifications
│   └── netlify.toml                 # Netlify configuration
├── public/
│   ├── index.html                   # Service request form
│   └── stackseekers.jpeg            # Branding image
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- Netlify account
- Notion integration token
- SMTP email service (for notifications)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd notion-p
npm install
```

### 2. Install Netlify CLI

```bash
npm install -g netlify-cli
```

### 3. Environment Variables

Create a `.env` file in the project root:

```bash
# Notion Configuration
NOTION_API_KEY=your_notion_integration_token

# Netlify Configuration (auto-configured with netlify dev)
NETLIFY_SITE_ID=your_netlify_site_id
NETLIFY_TOKEN=your_netlify_personal_access_token

# Email Configuration (for status notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
GMAIL_APP_PASSWORD=your-gmail-app-password
FROM_EMAIL=noreply@yourdomain.com
```

### 4. Configure Database ID

Update the database ID in the shared configuration file:

```javascript
// In netlify/functions/config.js
export const NOTION_DATABASE_ID = "your-actual-database-id-here";
```

Replace `"your-actual-database-id-here"` with your actual Notion database ID. This ID is used by both the API proxy function and the status change notification function.

### 5. Start Development Server

```bash
npm run dev
```

This will start the Netlify dev server on `http://localhost:8888` and automatically configure all required environment variables.

## 🔧 API Endpoints

### 1. Notion API Proxy

```
POST /.netlify/functions/submit-to-notion?path=/v1/pages
```

- Proxies requests to Notion API
- Automatically injects database ID from environment variables
- Supports all Notion API endpoints under `/v1/`
- Handles CORS and authentication

### 2. Image Upload

```
POST /.netlify/functions/upload-image
```

- Uploads images directly to Notion using Direct Upload API
- Supports JPEG, PNG, GIF, WebP, SVG formats
- File size limit: 5MB per file
- Automatic file validation and error handling

### 3. File Serving

```
GET /.netlify/functions/serve-blob/{filename}
```

- Serves temporary files from Netlify Blobs
- Used for previewing uploaded images
- Automatic content-type detection

### 4. Status Change Notifications

```
GET /.netlify/functions/check-status-changes
```

- Automated function that runs every 2 minutes
- Checks for pages with "Approved" or "Declined" status
- Sends email notifications to clients
- Can be triggered manually for testing

## 📁 File Upload Workflow

1. **Client Upload**: Images are converted to base64 and sent to the upload function
2. **Temporary Storage**: Files are stored in Netlify Blobs for public access
3. **Notion Integration**: Files are uploaded to Notion using Direct Upload API
4. **Database Linking**: Uploaded files are automatically linked to database entries
5. **Cleanup**: Temporary files are automatically removed after 24 hours

### Supported File Types

- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Size Limit**: 5MB per file (Notion free workspace limit)
- **Batch Upload**: Up to 10 files per submission

## 📧 Email Notifications

The service includes an automated notification system that:

- **Runs every 2 minutes** via Netlify's built-in scheduling
- Monitors database for status changes (Approved/Declined)
- Sends beautifully formatted HTML emails to clients
- Includes project details and status-specific messaging

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

#### Custom SMTP Server

```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
FROM_EMAIL=noreply@yourdomain.com
```

## 🚀 Deployment

### Netlify (Recommended)

1. **Connect Repository**: Link your GitHub/GitLab repository to Netlify
2. **Build Settings**:
   - Build command: `npm run build` (or leave empty if no build step)
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
3. **Environment Variables**: Add all required environment variables in Netlify dashboard
4. **Deploy**: Netlify will automatically deploy on every push

### Manual Deployment

```bash
# Build and deploy
npm run build
netlify deploy --prod
```

## 🔍 Testing

### Local Testing

```bash
npm run dev
# Visit http://localhost:8888
```

### Manual Function Testing

```bash
# Test status notifications
curl "http://localhost:8888/.netlify/functions/check-status-changes?cron=true"

# Test image upload
curl -X POST "http://localhost:8888/.netlify/functions/upload-image" \
  -H "Content-Type: application/json" \
  -d '{"files":[{"name":"test.jpg","type":"image/jpeg","data":"base64data","size":1024}]}'
```

## 🐛 Troubleshooting

### Common Issues

1. **"MissingBlobsEnvironmentError"**

   - Run `npx netlify login` to authenticate
   - Use `npx netlify dev` to start development server
   - Netlify automatically handles blobs context in production

2. **CORS Errors**

   - Make sure you're running the Netlify dev server (`npm run dev`)
   - Access through `http://localhost:8888` (not `file://` protocol)
   - Check that CORS headers are properly set

3. **Email Notifications Not Working**
   - Verify SMTP credentials in environment variables
   - Check Netlify function logs for errors
   - Ensure the function is scheduled correctly in `netlify.toml`

### Environment Variables Checklist

- [ ] `NOTION_API_KEY` - Your Notion integration token
- [ ] `SMTP_HOST` - SMTP server hostname
- [ ] `SMTP_USER` - SMTP username/email
- [ ] `SMTP_PASS` or `GMAIL_APP_PASSWORD` - SMTP password
- [ ] `FROM_EMAIL` - Sender email address

### 🎯 Automatic Blobs Handling

**No manual `NETLIFY_BLOBS_CONTEXT` configuration needed!**

- **Development**: `netlify dev` automatically generates blobs context
- **Production**: Netlify automatically provides blobs authentication
- **Functions**: Use `getStore("temp-uploads")` directly without parameters
- **Cleanup**: Files automatically expire after 24 hours

## 📚 Dependencies

### Production Dependencies

- `@netlify/blobs` - File storage and management
- `busboy` - File upload parsing
- `dotenv` - Environment variable management
- `nodemailer` - Email sending

### Development Dependencies

- `netlify-cli` - Local development and deployment

## 📄 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Netlify function logs
3. Verify environment variable configuration
4. Test functions manually using the provided endpoints
