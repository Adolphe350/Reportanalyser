# AI Report Analyzer - BEST WORKING VERSION

> **Note:** This is the verified best working version of the application. Commit hash: e79a774bb062c0c6204aae2ba08502283bd3bf28
> 
> **Update (2024-04-02):** Analytics tracking has been updated with a new project ID.

An application that uses Gemini AI to analyze uploaded reports and documents, extracting key insights, metrics, and recommendations.

## Features

- Upload PDF, DOCX, and TXT files for analysis
- Document analysis using Google's Gemini AI
- Interactive dashboard displaying analysis results
- Responsive design for all device sizes
- Analytics tracking for monitoring user interactions
- Robust timeout handling and automatic retry mechanism
- Cross-browser compatibility with CORS error handling

## Setup for Gemini AI Integration

### Prerequisites

- Node.js 18 or higher
- Google AI Platform account with access to Gemini API
- Gemini API Key

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/Adolphe350/Reportanalyser.git
   cd Reportanalyser
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:9000`

### Deployment with Coolify

1. In your Coolify dashboard, go to the environment variables section for your deployment.

2. Add the `GEMINI_API_KEY` environment variable with your Gemini API key.

3. Redeploy the application.

4. The server will automatically detect the API key and use Gemini for document analysis.

## How It Works

1. When a document is uploaded, the server extracts text from the file.
2. The text is sent to the Gemini AI using the provided prompt format.
3. Gemini analyzes the text and returns structured data with insights, metrics, and recommendations.
4. The results are displayed in the dashboard interface.

## Fallback Mode

If the Gemini API key is not available or there's an error in the API call, the application will switch to a simulation mode where it generates mock analysis results.

## Technical Implementation

The integration uses the `@google/generative-ai` npm package to communicate with the Gemini API. The document text is sent to the API with a structured prompt that asks for specific analysis components. The response is then parsed and formatted for display in the dashboard UI.

The application also includes analytics tracking (using a custom analytics service) to monitor user interactions and usage patterns.

### Performance Optimizations

The application includes several optimizations to handle large documents and long-running operations:

1. **Extended timeouts**: Server and client timeout thresholds have been increased to accommodate larger documents.
2. **Automatic retry mechanism**: Client automatically retries failed API requests with a backoff strategy.
3. **Progressive loading indicators**: Users are shown real-time feedback on long-running operations.
4. **Enhanced error handling**: Clear error messages with troubleshooting suggestions.
5. **Server-side optimizations**: Improved memory management and Gemini API prompt handling.
6. **CORS error handling**: Graceful fallback for analytics tracking when cross-origin restrictions are encountered.

## Customizing the Analysis

To modify the analysis prompt or output format, edit the `analyzeDocumentWithGemini` function in `server.js`. The prompt template can be adjusted to focus on different aspects of the document analysis based on your specific needs.

## Project Structure

- `docker-compose.yml` - Development configuration
- `docker-compose.production.yml`