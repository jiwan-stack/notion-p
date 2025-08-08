# Scheduled Function Setup Guide

This guide shows you how the status change notification function is automatically scheduled using Netlify's built-in scheduling feature.

## ✅ Automatic Setup (Netlify Scheduled Functions)

### Configuration

The function is automatically configured in `netlify.toml`:

```toml
[[functions]]
  function = "check-status-changes"
  schedule = "@every 15m"
```

This means:

- ✅ **No external services needed**
- ✅ **No manual configuration required**
- ✅ **Runs every 15 minutes automatically**
- ✅ **Managed by Netlify**

### How It Works

1. **Automatic Scheduling**: Netlify automatically triggers the function every 15 minutes
2. **Built-in Monitoring**: View execution logs in Netlify dashboard
3. **No External Dependencies**: Everything runs within Netlify's infrastructure

## Email Configuration

### Required Environment Variables

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

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a 16-character app password
3. **Set Environment Variables**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-app-password
   FROM_EMAIL=your-email@gmail.com
   ```

### Other Email Providers

#### Outlook/Hotmail

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

## Manual Testing

You can test the function manually by visiting:

```
https://your-site.netlify.app/.netlify/functions/check-status-changes?cron=true
```

## Monitoring

### Check Function Logs

1. Go to your Netlify dashboard
2. Navigate to "Functions" → "check-status-changes"
3. View the function logs for any errors

### Email Delivery

- Check your email service dashboard for delivery status
- Monitor bounce rates and delivery issues

## Troubleshooting

### Common Issues

1. **Function not found**: Make sure the function is deployed to Netlify
2. **Email not sent**: Check SMTP configuration and credentials
3. **No status changes**: Verify that pages have "Approved" or "Declined" status
4. **Scheduling not working**: Check Netlify dashboard for scheduled function status

### Debug Mode

Add `&debug=true` to the URL for additional logging:

```
https://your-site.netlify.app/.netlify/functions/check-status-changes?cron=true&debug=true
```

## Alternative External Triggers (Optional)

If you prefer external scheduling, you can still use:

### cron-job.org

- URL: `https://your-site.netlify.app/.netlify/functions/check-status-changes?cron=true`
- Schedule: Every 15 minutes

### GitHub Actions

- Use the existing `.github/workflows/cron.yml` file
- Set up secrets in GitHub repository settings

### Manual Testing

- Visit the function URL directly with `?cron=true` parameter
