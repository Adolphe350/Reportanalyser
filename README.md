# AI Report Analyzer

A powerful document analysis tool that uses AI to extract insights from reports.

## Features

- Upload and analyze PDF, DOCX, and TXT files
- AI-powered document analysis using Google's Gemini AI
- Interactive dashboard for viewing analysis results
- MinIO integration for secure file storage
- Real-time analytics tracking

## Environment Variables

```env
PORT=9000
HOST=0.0.0.0
NODE_ENV=production

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# MinIO Configuration
MINIO_ENDPOINT=your_minio_endpoint
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_BUCKET=your_bucket_name
```

## Deployment with Coolify

1. Push the repository to GitHub
2. In Coolify dashboard, create a new service
3. Select the GitHub repository
4. Configure the environment variables
5. Deploy the service

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a .env file with the required environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /api/upload` - Upload and analyze documents
- `GET /api/files` - List analyzed documents
- `GET /api/analytics.js` - Analytics tracking script

## License

MIT