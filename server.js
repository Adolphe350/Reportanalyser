// Ultra-simplified server with minimal dependencies
const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

// Add dotenv to load environment variables from .env file
try {
  require('dotenv').config();
  console.log(`[STARTUP] Loaded dotenv: ${process.env.DOTENV_LOADED ? 'OK' : 'Not found'}`);
} catch (err) {
  console.error(`[STARTUP] Error loading dotenv: ${err.message}`);
}

// Load PDF.js using dynamic import instead of require (since it's an ES Module)
// We'll initialize it later when needed
let pdfjsLib = null;
const initPdfLib = async () => {
  try {
    console.log(`[PDF] Dynamically importing PDF.js library`);
    
    // Try loading from the legacy path
    try {
      pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      console.log(`[PDF] PDF.js library loaded successfully via legacy path`);
    } catch (legacyErr) {
      console.log(`[PDF] Error loading legacy path: ${legacyErr.message}`);
      try {
        // Try loading from the modern path
        pdfjsLib = require('pdfjs-dist/build/pdf.js');
        console.log(`[PDF] PDF.js library loaded successfully via modern path`);
      } catch (modernErr) {
        console.error(`[PDF] Error loading modern path: ${modernErr.message}`);
        try {
          // Try one more path as a fallback
          pdfjsLib = require('pdfjs-dist');
          console.log(`[PDF] PDF.js library loaded successfully via root path`);
        } catch (rootErr) {
          console.error(`[PDF] Error loading root path: ${rootErr.message}`);
          throw new Error(`Could not load PDF.js library from any path`);
        }
      }
    }
    
    // Set up the PDF.js worker
    try {
      if (pdfjsLib.GlobalWorkerOptions) {
        // Try to use the worker from the same path
        const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.js');
        console.log(`[PDF] Setting worker path to: ${workerPath}`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
      } else {
        // Fallback to running without worker
        console.log(`[PDF] GlobalWorkerOptions not available, running in no-worker mode`);
      }
      
      return true;
    } catch (workerErr) {
      console.error(`[PDF] Error loading PDF.js: ${workerErr.message}`);
      return false;
    }
  } catch (err) {
    console.error(`[PDF] Error loading PDF.js library: ${err.message}`);
    console.error(err.stack);
    return false;
  }
};

// Initialize MinIO client
const Minio = require('minio');
let minioClient = null;
let minioBucket = process.env.MINIO_BUCKET || 'generalstorage';
let minioAvailable = false;

// Try to initialize MinIO client
try {
  // Try to read environment variables, with fallback values if not found
  const minioEndpoint = process.env.MINIO_ENDPOINT || 'minio-uk0wsk4sw4o4kow40s8kc0wc.app.kimuse.rw';
  const minioPort = parseInt(process.env.MINIO_PORT || '443');
  const minioUseSSL = process.env.MINIO_USE_SSL === 'true' || true;
  const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'CKaDxWb6gmINhYeuj58T';
  const minioSecretKey = process.env.MINIO_SECRET_KEY || '8WtOaHAOn9oqLgW4JXJTFGNxTLFvCRvGfRhvNvRQ';
  
  console.log(`[MINIO] Debug - Configuration values:
    Endpoint: ${minioEndpoint}
    Port: ${minioPort}
    UseSSL: ${minioUseSSL}
    AccessKey: ${minioAccessKey ? minioAccessKey.substring(0, 5) + '...' : 'undefined'}
    SecretKey: ${minioSecretKey ? '******' : 'undefined'}
    Bucket: ${minioBucket}
  `);
  
  if (minioEndpoint && minioAccessKey && minioSecretKey) {
    console.log(`[STARTUP] MinIO configuration found, initializing client for ${minioEndpoint}`);
    
    minioClient = new Minio.Client({
      endPoint: minioEndpoint,
      port: minioPort,
      useSSL: minioUseSSL,
      accessKey: minioAccessKey,
      secretKey: minioSecretKey
    });
    
    console.log(`[STARTUP] MinIO client initialized successfully with endpoint ${minioClient.host}`);
    minioAvailable = true;
  } else {
    console.log(`[STARTUP] MinIO configuration incomplete, storage will use local filesystem`);
    console.log(`[STARTUP] Missing MinIO parameters: ${!minioEndpoint ? 'endpoint ' : ''}${!minioAccessKey ? 'accessKey ' : ''}${!minioSecretKey ? 'secretKey' : ''}`);
  }
} catch (err) {
  console.error(`[STARTUP] Error initializing MinIO client: ${err.message}`);
  console.log(`[STARTUP] Storage will use local filesystem`);
}

// Check if MinIO bucket exists, create if not
async function ensureMinIOBucket() {
  if (!minioAvailable || !minioClient) return false;
  
  try {
    console.log(`[MINIO] Checking if bucket '${minioBucket}' exists...`);
    const exists = await minioClient.bucketExists(minioBucket);
    if (exists) {
      console.log(`[MINIO] Bucket '${minioBucket}' already exists`);
      return true;
    }
    
    console.log(`[MINIO] Bucket '${minioBucket}' does not exist, creating it now...`);
    await minioClient.makeBucket(minioBucket);
    console.log(`[MINIO] Bucket '${minioBucket}' created successfully`);
    
    // Set bucket policy for public read access if needed
    // This is optional and depends on your requirements
    /*
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${minioBucket}/*`]
        }
      ]
    };
    await minioClient.setBucketPolicy(minioBucket, JSON.stringify(policy));
    console.log(`[MINIO] Bucket policy set to allow public reads`);
    */
    
    // List all available buckets for verification
    const buckets = await minioClient.listBuckets();
    console.log(`[MINIO] Available buckets: ${buckets.map(b => b.name).join(', ')}`);
    
    return true;
  } catch (err) {
    console.error(`[MINIO] Error checking/creating bucket '${minioBucket}': ${err.message}`);
    console.error(`[MINIO] Error details: ${err.stack}`);
    
    // Try to list available buckets even if there was an error
    try {
      const buckets = await minioClient.listBuckets();
      console.log(`[MINIO] Available buckets despite error: ${buckets.map(b => b.name).join(', ')}`);
    } catch (listErr) {
      console.error(`[MINIO] Could not list buckets: ${listErr.message}`);
    }
    
    return false;
  }
}

// Function to upload file to MinIO
async function uploadFileToMinIO(fileBuffer, fileName, contentType) {
  if (!minioAvailable || !minioClient) {
    console.log(`[MINIO] MinIO not available, skipping upload`);
    return null;
  }
  
  try {
    // Ensure the bucket exists
    console.log(`[MINIO] Ensuring bucket '${minioBucket}' exists before upload...`);
    const bucketReady = await ensureMinIOBucket();
    if (!bucketReady) {
      throw new Error(`Failed to ensure bucket '${minioBucket}' exists`);
    }
    
    // Create a unique object name by adding timestamp
    const objectName = `${Date.now()}-${fileName}`;
    
    console.log(`[MINIO] Uploading ${fileName} to bucket '${minioBucket}' as ${objectName} (${fileBuffer.length} bytes)`);
    
    try {
      // Upload the file
      await minioClient.putObject(minioBucket, objectName, fileBuffer, fileBuffer.length, {
        'Content-Type': contentType
      });
      
      console.log(`[MINIO] File uploaded successfully to MinIO bucket '${minioBucket}'`);
      
      // Generate URL for the uploaded file
      const fileUrl = minioClient.protocol + '//' + minioClient.host + ':' + minioClient.port + '/' + minioBucket + '/' + objectName;
      
      // Log more details about the uploaded file for verification
      console.log(`[MINIO] File URL: ${fileUrl}`);
      console.log(`[MINIO] Object storage details: Bucket=${minioBucket}, Object=${objectName}, Size=${fileBuffer.length} bytes`);
      
      // Verify the object exists
      try {
        const stat = await minioClient.statObject(minioBucket, objectName);
        console.log(`[MINIO] Verified object exists: Size=${stat.size}, LastModified=${stat.lastModified}`);
      } catch (statErr) {
        console.warn(`[MINIO] Warning: Could not verify object after upload: ${statErr.message}`);
      }
      
      return {
        bucket: minioBucket,
        objectName: objectName,
        url: fileUrl,
        size: fileBuffer.length
      };
    } catch (uploadErr) {
      console.error(`[MINIO] Error during file upload operation: ${uploadErr.message}`);
      
      if (uploadErr.code === 'AccessDenied') {
        console.error(`[MINIO] Access denied - Check your MinIO permissions and credentials`);
      } else if (uploadErr.code === 'NoSuchBucket') {
        console.error(`[MINIO] Bucket '${minioBucket}' not found despite creation attempt`);
      } else if (uploadErr.code === 'ConnectionClosed' || uploadErr.code === 'ConnectTimeoutError') {
        console.error(`[MINIO] Connection issue - Check network and MinIO endpoint configuration`);
      }
      
      throw uploadErr;
    }
  } catch (err) {
    console.error(`[MINIO] Error uploading file to MinIO bucket '${minioBucket}': ${err.message}`);
    console.error(`[MINIO] Error details: ${err.stack}`);
    
    // Try to reconnect to MinIO in case of connection issues
    if (err.code === 'ConnectionClosed' || err.code === 'ConnectTimeoutError') {
      console.log(`[MINIO] Attempting to reconnect to MinIO server...`);
      await testMinIOConnection();
    }
    
    return null;
  }
}

const port = process.env.PORT || 9000;
const host = process.env.HOST || '0.0.0.0';  // Allow connections from any IP

// Add Gemini API dependency
// To install: npm install @google/generative-ai
let geminiAvailable = false;
let genAI = null;
let geminiModel = null;

// Try to load the Gemini API
try {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  
  // Get API key from environment variable or fallback to direct value
  let apiKey = process.env.GEMINI_API_KEY;
  
  // Display some debug info
  console.log(`[STARTUP] process.env.GEMINI_API_KEY exists: ${!!process.env.GEMINI_API_KEY}`);
  
  // If no API key from environment, use direct value as fallback
  if (!apiKey) {
    console.log(`[STARTUP] API key not found in environment, using hardcoded fallback`);
    apiKey = "AIzaSyCxwvTfvJkjbNbnxTepyQJrD0hqDXW6f0c";
  }
  
  if (apiKey) {
    console.log(`[STARTUP] Gemini API key found (${apiKey.substring(0, 5)}...), initializing AI`);
    genAI = new GoogleGenerativeAI(apiKey);
    // Updated to use the correct model name for the current API version
    geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    geminiAvailable = true;
    console.log(`[STARTUP] Gemini AI initialized successfully`);
  } else {
    console.log(`[STARTUP] No Gemini API key found in environment variable GEMINI_API_KEY`);
    console.log(`[STARTUP] Will run in simulation mode`);
  }
} catch (err) {
  console.error(`[STARTUP] Error initializing Gemini AI: ${err.message}`);
  console.log(`[STARTUP] Will run in simulation mode`);
}

// Startup logging
console.log(`[STARTUP] Node.js ${process.version}`);
console.log(`[STARTUP] Current directory: ${__dirname}`);
console.log(`[STARTUP] Starting server on port ${port}`);
console.log(`[STARTUP] Environment: ${process.env.NODE_ENV}`);
console.log(`[STARTUP] Network interfaces:`);

// Log network interfaces for debugging connection issues
try {
  const networkInterfaces = require('os').networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    networkInterfaces[interfaceName].forEach(iface => {
      console.log(`  ${interfaceName}: ${iface.address} (${iface.family})`);
    });
  }
} catch (err) {
  console.error(`[STARTUP] Error getting network info: ${err.message}`);
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log(`[STARTUP] Creating uploads directory at ${uploadsDir}`);
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[STARTUP] Successfully created uploads directory`);
  } catch (err) {
    console.error(`[STARTUP] Error creating uploads directory: ${err.message}`);
  }
}

// Minimal HTML content as fallback
const fallbackHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>AI Report Analyzer</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #0066cc; }
    .info { background: #f0f0f0; padding: 10px; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>AI Report Analyzer</h1>
  <p>Simple demo page served directly from memory.</p>
  <div class="info">
    <p>Server time: ${new Date().toISOString()}</p>
    <p>Node.js: ${process.version}</p>
  </div>
</body>
</html>
`;

// Content type mapping
const contentTypeMap = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

// Cache frequently used files
const fileCache = {};
const cacheableExtensions = ['.html', '.css', '.js'];

// Preload index.html and dashboard.html
try {
  ['index.html', 'dashboard.html'].forEach(fileName => {
    const filePath = path.join(__dirname, 'public', fileName);
    console.log(`[STARTUP] Preloading ${fileName} from ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      fileCache[`/${fileName}`] = {
        content: fs.readFileSync(filePath, 'utf8'),
        contentType: 'text/html'
      };
      console.log(`[STARTUP] Successfully cached ${fileName} (${fileCache[`/${fileName}`].content.length} bytes)`);
    } else {
      console.log(`[STARTUP] ${fileName} not found, will serve dynamically if requested`);
    }
  });
} catch (err) {
  console.error(`[STARTUP] Error preloading files: ${err.message}`);
}

// Function to analyze document using Gemini AI
async function analyzeDocumentWithGemini(text, fileName) {
  console.log(`[AI] Starting document analysis with Gemini for ${fileName}`);
  
  // Check if Gemini is available
  if (!geminiAvailable || !geminiModel) {
    console.log(`[AI] Gemini is not available, using simulation mode`);
    console.log(`[AI] geminiAvailable: ${geminiAvailable}, geminiModel: ${geminiModel ? 'defined' : 'undefined'}`);
    return getSimulatedAnalysisResults(fileName, text);
  }
  
  try {
    console.log(`[AI] Preparing to analyze document text (${text.length} chars)`);
    
    // Create a more detailed and effective prompt for the Gemini AI model
    const prompt = `
You are an expert document and report analyzer with expertise in multiple domains. I need you to thoroughly analyze the following document and provide a comprehensive assessment.

Document name: "${fileName}"

DOCUMENT TEXT TO ANALYZE:
${text.substring(0, 15000)} 
${text.length > 15000 ? '... (text truncated for size)' : ''}

ANALYSIS INSTRUCTIONS:
1. First determine if the document text appears to be readable content or if it appears to be binary/corrupted content. 
   If it's binary/corrupted, indicate this in your summary and do your best with what you can interpret.

2. Create a concise 1-2 paragraph summary of the document's main content and purpose.

3. Extract 5-6 key insights from the document that represent the most important information.

4. Identify the main themes, topics, and subject areas of the document.

5. Assess the sentiment of the document (positive, negative, neutral) and provide a confidence score.

6. Provide 3-5 specific, actionable recommendations based on the document content.

7. Note any important metrics, data points, or statistics mentioned in the document.

FORMAT YOUR RESPONSE AS STRUCTURED JSON with the following format:
{
  "summary": "1-2 paragraph summary of the document's content and purpose",
  "keyInsights": [
    "First key insight from the document",
    "Second key insight from the document",
    etc.
  ],
  "metrics": {
    "sentiment": number between 0 and 1 representing sentiment score (higher is more positive),
    "confidence": number between 0.7 and 1 representing confidence in analysis,
    "topics": [
      "First main topic/theme",
      "Second main topic/theme",
      etc.
    ]
  },
  "recommendations": [
    "First specific recommendation based on the document",
    "Second specific recommendation based on the document",
    etc.
  ]
}

IMPORTANT: Return ONLY the JSON object as your response, nothing else. Do not include explanation text, formatting, or markdown.
`;

    console.log(`[AI] Creating Gemini request with prompt length: ${prompt.length}`);
    console.log(`[AI] Sending request to Gemini AI`);
    
    // Make the API call with INCREASED timeout handling
    const startTime = Date.now();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini API request timed out after 60 seconds')), 60000)
    );
    
    // Create the Gemini request
    const geminiPromise = geminiModel.generateContent(prompt);
    
    // Wait for either the API response or timeout
    console.log(`[AI] Waiting for Gemini response...`);
    const result = await Promise.race([geminiPromise, timeoutPromise]);
    console.log(`[AI] Received initial response object from Gemini`);
    
    // Extract the text response with another timeout to prevent hanging on response processing
    const responseTimeout = setTimeout(() => {
      console.log(`[AI] Text extraction from response timed out`);
      throw new Error('Timed out while extracting text from Gemini response');
    }, 30000);
    
    const response = await result.response;
    const responseText = response.text();
    clearTimeout(responseTimeout);
    
    const endTime = Date.now();
    console.log(`[AI] Received response from Gemini in ${endTime - startTime}ms`);
    console.log(`[AI] Response text length: ${responseText.length} chars`);
    console.log(`[AI] Response text (first 200 chars): ${responseText.substring(0, 200).replace(/\n/g, ' ')}...`);
    
    // Parse the response to extract the JSON
    try {
      // Extract JSON object from the text response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log(`[AI] Extracted JSON from response (${jsonStr.length} chars)`);
        
        const analysis = JSON.parse(jsonStr);
        console.log(`[AI] Successfully parsed JSON into analysis object`);
        console.log(`[AI] Analysis contains ${analysis.keyInsights ? analysis.keyInsights.length : 0} insights and ${analysis.recommendations ? analysis.recommendations.length : 0} recommendations`);
        
        return analysis;
      } else {
        console.error(`[AI] Could not find JSON in response`);
        console.error(`[AI] Raw response text: ${responseText.substring(0, 500)}...`);
        return getSimulatedAnalysisResults(fileName, text);
      }
    } catch (parseError) {
      console.error(`[AI] Error parsing Gemini response: ${parseError.message}`);
      console.error(`[AI] Raw response text: ${responseText.substring(0, 500)}...`);
      return getSimulatedAnalysisResults(fileName, text);
    }
  } catch (err) {
    console.error(`[AI] Error in Gemini analysis: ${err.message}`);
    console.error(`[AI] Error stack: ${err.stack}`);
    return getSimulatedAnalysisResults(fileName, text);
  }
}

// Get simulated analysis results as fallback
async function getSimulatedAnalysisResults(fileName, documentText = '') {
  console.log(`[AI] Using simulated analysis results for ${fileName || 'unknown file'}`);
  
  // Extract some real content from the document for a summary
  let documentSummary = '';
  let keyTopics = [];
  let keyInsights = [];
  
  if (documentText && documentText.length > 0) {
    console.log(`[AI] Generating analysis based on actual document content (${documentText.length} chars)`);
    
    // Extract the first few paragraphs for a summary (up to 500 chars)
    documentSummary = documentText.substring(0, 2000)
      .split('\n')
      .filter(line => line.trim().length > 30) // Only meaningful paragraphs
      .slice(0, 3)
      .join('\n\n')
      .substring(0, 500)
      .trim();
    
    if (documentSummary.length === 0) {
      // If no good paragraphs found, just use the first 500 chars
      documentSummary = documentText.substring(0, 500).trim();
    }
    
    console.log(`[AI] Generated document summary: ${documentSummary.substring(0, 100)}...`);
    
    // Extract potential topics based on word frequency
    const words = documentText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !['about', 'after', 'again', 'below', 'could', 'every', 'first', 'found', 'great', 'other', 'since', 'sound', 'still', 'their', 'there', 'these', 'thing', 'think', 'those', 'where', 'which', 'would'].includes(word));
    
    // Count word frequency
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Get top words as topics
    keyTopics = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
      
    console.log(`[AI] Extracted key topics: ${keyTopics.join(', ')}`);
    
    // Generate insights based on document content and key topics
    if (keyTopics.length > 0) {
      // Create insights based on identified topics
      keyTopics.forEach((topic, index) => {
        if (index < 3) { // Generate insights for top 3 topics
          keyInsights.push(`The document emphasizes ${topic} as a key area of focus.`);
        }
      });
    }
    
    // Add generic but useful insights based on document length and structure
    const paragraphCount = documentText.split('\n\n').filter(p => p.trim().length > 0).length;
    keyInsights.push(`The document contains approximately ${paragraphCount} paragraphs of content.`);
    
    if (documentText.toLowerCase().includes('table') || documentText.includes('|')) {
      keyInsights.push('The document includes tabular data that may contain important metrics or comparison information.');
    }
    
    if (documentText.match(/\d{4}/g)) {
      keyInsights.push('The document references specific years, indicating historical data or timeline information is present.');
    }
    
    if (documentText.match(/\d+\.\d+/g)) {
      keyInsights.push('The document contains numerical data points which may represent important metrics or financial information.');
    }
  }
  
  // Use extracted insights or fall back to defaults
  if (keyInsights.length === 0) {
    // Get the filename without extension to use in results
    const fileBaseName = path.basename(fileName || 'document', path.extname(fileName || '.pdf'));
    
    keyInsights = [
      `${fileBaseName} appears to cover multiple business or organizational topics`,
      `The document structure suggests it may contain important information for decision-making`,
      `Several sections may require further detailed analysis`,
      `Review recommended for complete understanding of the document's implications`
    ];
  }
  
  // If no topics were extracted, use default ones
  if (keyTopics.length === 0) {
    keyTopics = ['content', 'analysis', 'documentation', 'review', 'information'];
  }
  
  return {
    summary: documentSummary || 'No readable summary could be extracted from this document.',
    keyInsights: keyInsights,
    metrics: {
      sentiment: 0.65,
      confidence: 0.78,
      topics: keyTopics
    },
    recommendations: [
      'Review the document in detail to validate extracted information',
      'Consider using more advanced analysis tools for deeper content extraction',
      'Compare the document with related materials to establish context',
      'Follow up on key topics identified in the analysis',
      'Share this document with relevant team members for additional perspectives'
    ]
  };
}

// Advanced function to extract text from PDF files
async function extractTextFromPDF(pdfBuffer) {
  console.log(`[PDF] Starting PDF text extraction (${pdfBuffer.length} bytes)`);
  
  try {
    // Make sure PDF.js is initialized
    if (!pdfjsLib) {
      console.log(`[PDF] PDF.js not loaded yet, initializing...`);
      const initialized = await initPdfLib();
      if (!initialized) {
        throw new Error('Failed to initialize PDF.js library');
      }
    }
    
    // Load the PDF document
    const pdfData = new Uint8Array(pdfBuffer);
    console.log(`[PDF] Loading PDF document`);
    
    // Use the dynamically loaded PDF.js library
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    console.log(`[PDF] PDF loaded with ${pdf.numPages} pages`);
    
    // Extract text from each page
    let fullText = '';
    
    // Process only the first 20 pages to avoid excessive processing
    const maxPages = Math.min(pdf.numPages, 20);
    
    for (let i = 1; i <= maxPages; i++) {
      console.log(`[PDF] Processing page ${i}/${maxPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate the text items with proper spacing
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
      
      // Log snippet of extracted text
      if (i === 1) {
        console.log(`[PDF] First page text sample: ${pageText.substring(0, 100)}...`);
      }
    }
    
    if (pdf.numPages > maxPages) {
      fullText += `\n\n[Note: Only the first ${maxPages} pages were processed out of ${pdf.numPages} total pages]`;
    }
    
    console.log(`[PDF] Extracted ${fullText.length} characters of text from PDF`);
    return fullText;
  } catch (err) {
    console.error(`[PDF] Error extracting text from PDF: ${err.message}`);
    console.error(err.stack);
    
    // Fallback method to extract at least some text from PDF
    try {
      console.log(`[PDF] Using fallback text extraction method`);
      
      // Look for text patterns in the PDF
      let extractedText = '';
      let foundTextChunks = [];
      
      // First look for common text markers in PDFs
      const textMarkers = ['/Text', '/Contents', '/Title', '/Author', '/Subject', '/Keywords'];
      const reTextAfterMarker = /\/Text\s*\(([^)]+)\)/g;
      const reContentsStream = /stream([\s\S]*?)endstream/g;
      const rePlainText = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
      
      // Convert buffer to string for easier regex
      const pdfStr = pdfBuffer.toString('latin1');
      
      // Extract text from content streams
      let contentMatch;
      while ((contentMatch = reContentsStream.exec(pdfStr)) !== null) {
        const streamContent = contentMatch[1];
        let textMatch;
        while ((textMatch = rePlainText.exec(streamContent)) !== null) {
          if (textMatch[1].length > 3) { // Only consider strings with substantial content
            foundTextChunks.push(textMatch[1]);
          }
        }
      }
      
      // Extract any plain text
      let textMatch;
      while ((textMatch = rePlainText.exec(pdfStr)) !== null) {
        if (textMatch[1].length > 3) {
          foundTextChunks.push(textMatch[1]);
        }
      }
      
      // Try to parse text content from binary format
      for (let i = 0; i < pdfBuffer.length - 30; i++) {
        // Look for ASCII text sequences
        if (pdfBuffer[i] >= 32 && pdfBuffer[i] <= 126) {
          let textChunk = '';
          let j = i;
          
          // Collect printable ASCII characters
          while (j < pdfBuffer.length && j < i + 300 && 
                 ((pdfBuffer[j] >= 32 && pdfBuffer[j] <= 126) || 
                  pdfBuffer[j] === 9 || pdfBuffer[j] === 10 || pdfBuffer[j] === 13)) {
            textChunk += String.fromCharCode(pdfBuffer[j]);
            j++;
          }
          
          // Only keep chunks with substantial content and that look like text
          if (textChunk.length > 20 && /[a-zA-Z]{3,}/.test(textChunk)) {
            foundTextChunks.push(textChunk);
            i = j - 1; // Skip ahead to end of chunk
          }
        }
      }
      
      // Use an alternative approach to find potential readable text blocks
      const chunkSize = 512;
      for (let i = 0; i < pdfBuffer.length; i += chunkSize) {
        const chunk = pdfBuffer.slice(i, i + chunkSize);
        let readableText = '';
        
        for (let j = 0; j < chunk.length; j++) {
          const byte = chunk[j];
          if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
            readableText += String.fromCharCode(byte);
          } else {
            if (readableText.length > 20 && /[a-zA-Z]{3,}/.test(readableText)) {
              foundTextChunks.push(readableText);
            }
            readableText = '';
          }
        }
        
        if (readableText.length > 20 && /[a-zA-Z]{3,}/.test(readableText)) {
          foundTextChunks.push(readableText);
        }
      }
      
      // Filter the text chunks to remove duplicates and garbage
      foundTextChunks = [...new Set(foundTextChunks)]; // Remove duplicates
      
      // Filter out binary-looking and non-meaningful strings
      foundTextChunks = foundTextChunks.filter(chunk => {
        // Filter out chunks that look like binary data
        const binaryCharCount = (chunk.match(/[^\x20-\x7E\n\r\t]/g) || []).length;
        const binaryRatio = binaryCharCount / chunk.length;
        
        // Skip if too many non-printable characters
        if (binaryRatio > 0.2) return false;
        
        // Skip if doesn't contain alphabetic characters
        if (!chunk.match(/[a-zA-Z]{3,}/)) return false;
        
        // Skip if contains too many special characters
        const specialCharCount = (chunk.match(/[^a-zA-Z0-9\s.,;:'"!?()-]/g) || []).length;
        if (specialCharCount / chunk.length > 0.3) return false;
        
        return true;
      });
      
      console.log(`[PDF] Fallback extraction found ${foundTextChunks.length} text chunks`);
      
      // Sort chunks by length (longer chunks are more likely to be meaningful text)
      foundTextChunks.sort((a, b) => b.length - a.length);
      
      // Join the top chunks
      extractedText = foundTextChunks.slice(0, 50).join('\n\n');
      
      if (extractedText.length > 0) {
        console.log(`[PDF] Extracted ${extractedText.length} characters using fallback method`);
        return `[PDF Content (extracted using fallback method)]:\n\n${extractedText}`;
      } else {
        console.log(`[PDF] Fallback extraction could not find readable text`);
        return `[Unable to extract readable text from PDF. The file may be scanned, image-based, or encrypted.]`;
      }
    } catch (fallbackErr) {
      console.error(`[PDF] Fallback extraction also failed: ${fallbackErr.message}`);
      return `Could not extract text from PDF file due to errors.`;
    }
  }
}

// Improved function to extract text from various file types
async function extractTextFromFile(buffer, fileType, fileName) {
  console.log(`[EXTRACT] Extracting text from ${fileName} (${fileType})`);
  
  // If it's a text file, return the actual content
  if (fileType === 'text/plain') {
    console.log(`[EXTRACT] Text file detected, returning actual content`);
    return buffer.toString('utf8');
  } 
  
  // Check if it's a PDF by looking for the PDF signature
  const isPDF = buffer.slice(0, 5).toString().includes('%PDF');
  if (isPDF || fileType === 'application/pdf') {
    console.log(`[EXTRACT] PDF file detected, using PDF.js for extraction`);
    try {
      return await extractTextFromPDF(buffer);
    } catch (err) {
      console.error(`[EXTRACT] Error using PDF.js: ${err.message}, using fallback`);
      
      // Simple fallback to extract some text from the PDF (not as good as PDF.js)
      const textChunks = [];
      for (let i = 0; i < buffer.length - 4; i++) {
        // Look for text between parentheses, a common text encoding in PDFs
        if (buffer[i] === 40 && buffer[i+1] >= 32 && buffer[i+1] <= 126) { // '(' and ASCII text
          let text = '';
          let j = i + 1;
          while (j < buffer.length && buffer[j] !== 41 && text.length < 1000) { // until ')'
            if (buffer[j] >= 32 && buffer[j] <= 126) { // printable ASCII
              text += String.fromCharCode(buffer[j]);
            }
            j++;
          }
          if (text.length > 3) { // Only keep substantial text
            textChunks.push(text);
          }
          i = j;
        }
      }
      
      const fallbackText = textChunks.join(' ').substring(0, 5000);
      return `[PDF text extraction fallback mode - limited text available]:\n\n${fallbackText}`;
    }
  }
  
  // For all other file types
  console.log(`[EXTRACT] Unsupported file type: ${fileType}, using simulated content`);
  
  return `[This is placeholder text for ${fileName}. In a production environment, you would use specialized libraries to extract text from this file type (${fileType}).]`;
}

// Improved multipart form data parser
function parseMultipartFormData(buffer, boundary) {
  console.log(`[PARSER] Parsing multipart form data with boundary: ${boundary}`);
  
  try {
    // Convert buffer to string for easier processing
    const data = buffer.toString('binary');
    
    // Create boundary markers
    const boundaryStart = `--${boundary}`;
    const boundaryEnd = `--${boundary}--`;
    
    // Split the data by boundary
    const parts = data.split(boundaryStart);
    
    // Process each part (skip the first which is usually empty)
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      // Skip if this is the end boundary
      if (part.includes(boundaryEnd)) continue;
      
      // Check if this part contains a file
      if (part.includes('filename=')) {
        // Extract filename
        const filenameMatch = part.match(/filename="([^"]+)"/i);
        const filename = filenameMatch ? filenameMatch[1] : 'unknown';
        
        // Find the header-body separator (double CRLF)
        const headerEndIndex = part.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;
        
        // Get content type
        const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
        const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
        
        // Extract file data (skip the double CRLF)
        let fileData = part.substring(headerEndIndex + 4);
        
        // Remove trailing CR LF if present
        if (fileData.endsWith('\r\n')) {
          fileData = fileData.substring(0, fileData.length - 2);
        }
        
        // Convert binary string back to buffer
        const fileBuffer = Buffer.from(fileData, 'binary');
        
        console.log(`[PARSER] Found file: ${filename}, type: ${contentType}, size: ${fileBuffer.length} bytes`);
        
        return {
          filename,
          contentType,
          data: fileBuffer
        };
      }
    }
    
    throw new Error('No file found in form data');
  } catch (err) {
    console.error(`[PARSER] Error parsing multipart form data: ${err.message}`);
    throw err;
  }
}

// Function to serve a file
function serveFile(req, res, filePath) {
  const start = Date.now();
  const fileUrl = req.url === '/' ? '/index.html' : req.url;
  const ext = path.extname(fileUrl).toLowerCase();
  
  // Check cache first for HTML, CSS and JS files
  if (cacheableExtensions.includes(ext) && fileCache[fileUrl]) {
    console.log(`[FILE] Serving ${fileUrl} from cache`);
    res.writeHead(200, { 
      'Content-Type': fileCache[fileUrl].contentType,
      'Connection': 'close',
      'X-Response-Time': `${Date.now() - start}ms`
    });
    res.end(fileCache[fileUrl].content);
    console.log(`[REQUEST] Response completed in ${Date.now() - start}ms`);
    return;
  }
  
  // For other files, check if they exist
  const localFilePath = path.join(__dirname, 'public', fileUrl === '/' ? 'index.html' : fileUrl.substring(1));
  console.log(`[FILE] Checking for file at ${localFilePath}`);
  
  fs.stat(localFilePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.log(`[FILE] File not found: ${localFilePath}`);
      
      // If not found but is an HTML request, try to serve index.html
      if (fileUrl.endsWith('.html') && fileCache['/index.html']) {
        console.log(`[FILE] Serving index.html as fallback`);
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Connection': 'close',
          'X-Response-Time': `${Date.now() - start}ms`
        });
        res.end(fileCache['/index.html'].content);
      } else {
        // Serve 404
        res.writeHead(404, { 
          'Content-Type': 'text/plain',
          'Connection': 'close'
        });
        res.end('File not found');
      }
      console.log(`[REQUEST] Response completed in ${Date.now() - start}ms`);
      return;
    }
    
    // Determine content type
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Serve file
    fs.readFile(localFilePath, (err, data) => {
      if (err) {
        console.error(`[ERROR] Error reading file: ${err.message}`);
        res.writeHead(500, { 
          'Content-Type': 'text/plain',
          'Connection': 'close'
        });
        res.end('Internal Server Error');
      } else {
        console.log(`[FILE] Serving file: ${localFilePath} (${data.length} bytes)`);
        
        // Cache the file if it's cacheable
        if (cacheableExtensions.includes(ext)) {
          fileCache[fileUrl] = {
            content: data.toString(),
            contentType
          };
          console.log(`[FILE] Cached ${fileUrl} for future requests`);
        }
        
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Connection': 'close',
          'X-Response-Time': `${Date.now() - start}ms`
        });
        res.end(data);
      }
      console.log(`[REQUEST] Response completed in ${Date.now() - start}ms`);
    });
  });
}

// Updated function to handle file uploads with MinIO integration
function handleFileUpload(req, res) {
  console.log(`[UPLOAD] Starting file upload handler`);
  const start = Date.now();
  
  // Generate a boundary from the content-type header
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    console.error(`[UPLOAD] Invalid content type: ${contentType}`);
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: 'Invalid content type. Expected multipart/form-data'
    }));
    return;
  }
  
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    console.error(`[UPLOAD] No boundary found in content-type: ${contentType}`);
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: 'Invalid boundary in multipart/form-data'
    }));
    return;
  }
  
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  console.log(`[UPLOAD] Boundary: ${boundary}`);
  
  // Get content length for upload monitoring
  const contentLength = parseInt(req.headers['content-length'], 10);
  if (isNaN(contentLength)) {
    console.error(`[UPLOAD] Invalid or missing content-length header`);
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: 'Missing or invalid content-length header'
    }));
    return;
  }
  
  console.log(`[UPLOAD] Expected content length: ${contentLength} bytes`);
  
  // Set up variables for tracking data
  let buffer = Buffer.alloc(0);
  let totalBytesReceived = 0;
  
  // Handle data chunks as they arrive
  req.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    totalBytesReceived += chunk.length;
    
    // Log progress for large uploads
    if (totalBytesReceived % 500000 === 0 || totalBytesReceived === contentLength) {
      console.log(`[UPLOAD] Received ${totalBytesReceived} of ${contentLength} bytes (${Math.round(totalBytesReceived / contentLength * 100)}%)`);
    }
  });
  
  // Process the complete upload
  req.on('end', async () => {
    console.log(`[UPLOAD] Upload complete. Processing...`);
    
    try {
      // Parse the multipart form data to extract the file
      const fileInfo = parseMultipartFormData(buffer, boundary);
      
      if (!fileInfo) {
        throw new Error('No file found in the upload data');
      }
      
      const { filename, contentType: fileType, data: fileBuffer } = fileInfo;
      
      // Generate a unique filename for storage
      const uniqueFilename = `${Date.now()}-${filename || 'upload'}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      console.log(`[UPLOAD] Saving file to local path: ${filePath}`);
      
      // Save the file locally first (as a backup)
      fs.writeFileSync(filePath, fileBuffer);
      console.log(`[UPLOAD] File saved successfully to local storage (${fileBuffer.length} bytes)`);
      
      // Upload to MinIO if available
      let minioFileInfo = null;
      if (minioAvailable) {
        console.log(`[UPLOAD] Uploading file to MinIO storage (bucket: '${minioBucket}')`);
        minioFileInfo = await uploadFileToMinIO(fileBuffer, filename, fileType);
      }
      
      // Extract text from the file
      console.log(`[UPLOAD] Extracting text from file`);
      const documentText = await extractTextFromFile(fileBuffer, fileType, filename);
      
      // Analyze the document using Gemini AI
      console.log(`[UPLOAD] Starting AI analysis`);
      const analysisResults = await analyzeDocumentWithGemini(documentText, filename);
      
      // Save analysis results to MinIO if available
      let analysisInfo = null;
      if (minioAvailable && minioFileInfo) {
        console.log(`[UPLOAD] Saving analysis results to MinIO`);
        analysisInfo = await saveAnalysisToMinIO(analysisResults, filename, minioFileInfo.objectName);
      }
      
      // Respond with success and analysis results
      console.log(`[UPLOAD] File processed successfully in ${Date.now() - start}ms`);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Connection': 'close',
        'X-Response-Time': `${Date.now() - start}ms`
      });
      
      // Return analysis results
      res.end(JSON.stringify({
        success: true,
        message: 'File uploaded and analyzed successfully',
        file: {
          originalName: filename,
          size: fileBuffer.length,
          type: fileType,
          savedAs: uniqueFilename,
          storage: minioFileInfo ? 'minio' : 'local',
          storageDetails: minioFileInfo ? {
            bucket: minioFileInfo.bucket,
            objectName: minioFileInfo.objectName,
            size: minioFileInfo.size,
            url: minioFileInfo.url
          } : {
            path: `uploads/${uniqueFilename}`,
            size: fileBuffer.length
          },
          location: minioFileInfo ? minioFileInfo.url : `uploads/${uniqueFilename}`,
          analysisId: analysisInfo ? analysisInfo.analysisId : null,
          analysisUrl: analysisInfo ? analysisInfo.url : null
        },
        analysis: {
          title: 'Analysis Summary',
          timestamp: new Date().toISOString(),
          documentText: documentText.substring(0, 500) + '...',
          ...analysisResults
        }
      }));
      
    } catch (err) {
      console.error(`[UPLOAD] Error processing upload: ${err.message}`);
      console.error(err.stack);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Connection': 'close'
      });
      res.end(JSON.stringify({
        success: false,
        message: `Error processing upload: ${err.message}`
      }));
    }
  });
  
  // Handle upload errors
  req.on('error', (err) => {
    console.error(`[UPLOAD] Upload error: ${err.message}`);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: `Upload error: ${err.message}`
    }));
  });
}

// Function to list files from MinIO
async function listFilesFromMinIO() {
  if (!minioAvailable || !minioClient) {
    console.log(`[MINIO] MinIO not available, cannot list files`);
    return [];
  }
  
  try {
    // Add timeout handling to ensure this operation doesn't hang indefinitely
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timed out retrieving files from MinIO')), 15000); // 15 second timeout
    });
    
    const listPromise = new Promise((resolve, reject) => {
      console.log(`[MINIO] Listing files from bucket '${minioBucket}'`);
      const filesList = [];
      const analysisMap = new Map();
      
      // Set a limit on the number of files to retrieve to prevent overload
      let fileCount = 0;
      const FILE_LIMIT = 100; // Increased from 20 to 100 for testing
      
      console.log(`[MINIO] Starting listObjects stream from MinIO...`);
      const objectsStream = minioClient.listObjects(minioBucket, '', true);
      
      objectsStream.on('data', (obj) => {
        console.log(`[MINIO] Object found: ${obj.name}, size: ${obj.size}, lastModified: ${obj.lastModified}`);
        
        // Create a URL for the file
        const fileUrl = minioClient.protocol + '//' + minioClient.host + ':' + minioClient.port + '/' + minioBucket + '/' + obj.name;
        
        // Check if this is an analysis object
        if (obj.name.startsWith('analysis-')) {
          // Add to analysis map to associate with file later
          analysisMap.set(obj.name, {
            analysisId: obj.name,
            url: fileUrl,
            lastModified: obj.lastModified
          });
          console.log(`[MINIO] Analysis object found: ${obj.name}`);
          return; // Skip adding analysis objects to the files list
        }
        
        // Extract original filename from the object name (removes timestamp prefix)
        const originalName = obj.name.substring(obj.name.indexOf('-') + 1);
        
        filesList.push({
          name: originalName,
          originalName: originalName,
          size: obj.size,
          lastModified: obj.lastModified,
          url: fileUrl,
          objectName: obj.name,
          storage: 'minio',
          hasAnalysis: false,  // Will update this later if analysis exists
          analysisUrl: null    // Will update this later if analysis exists
        });
        
        console.log(`[MINIO] Added regular object to files list: ${obj.name}`);
        
        // Add a file count limit
        fileCount++;
        if (fileCount > FILE_LIMIT && !obj.name.startsWith('analysis-')) {
          console.log(`[MINIO] Reached file limit of ${FILE_LIMIT}, skipping remaining files`);
          objectsStream.destroy(); // Stop streaming more objects
          return;
        }
      });
      
      objectsStream.on('error', (err) => {
        console.error(`[MINIO] Error listing files: ${err.message}`);
        console.error(`[MINIO] Error details: ${err.stack}`);
        reject(err);
      });
      
      objectsStream.on('end', async () => {
        console.log(`[MINIO] Found ${filesList.length} files and ${analysisMap.size} analysis objects in bucket '${minioBucket}'`);
        
        // Detailed logging of file list
        if (filesList.length > 0) {
          console.log(`[MINIO] First file in list: ${JSON.stringify(filesList[0])}`);
        } else {
          console.log(`[MINIO] File list is empty`);
        }
        
        // Associate analysis objects with their files
        for (let file of filesList) {
          const expectedAnalysisId = `analysis-${file.objectName.substring(file.objectName.indexOf('-') + 1)}`;
          const analysisObj = analysisMap.get(expectedAnalysisId);
          
          if (analysisObj) {
            file.hasAnalysis = true;
            file.analysisUrl = analysisObj.url;
            file.analysisId = analysisObj.analysisId;
            console.log(`[MINIO] Associated analysis ${expectedAnalysisId} with file ${file.objectName}`);
          }
        }
        
        // Sort by lastModified (newest first)
        filesList.sort((a, b) => b.lastModified - a.lastModified);
        
        resolve(filesList);
      });
    });
    
    // Race between the actual operation and the timeout
    return await Promise.race([listPromise, timeoutPromise]);
    
  } catch (err) {
    console.error(`[MINIO] Error listing files from MinIO bucket '${minioBucket}': ${err.message}`);
    console.error(`[MINIO] Error details: ${err.stack}`);
    return [];
  }
}

// Handler for the list files API endpoint
async function handleListFiles(req, res) {
  console.log(`[API] Starting list files handler`);
  const start = Date.now();
  
  // Set a timeout for the entire operation
  const timeout = setTimeout(() => {
    console.log(`[API] List files operation timed out after ${Date.now() - start}ms`);
    if (!res.headersSent) {
      res.writeHead(408, {
        'Content-Type': 'application/json',
        'Connection': 'close',
        'X-Response-Time': `${Date.now() - start}ms`
      });
      res.end(JSON.stringify({
        success: false,
        message: 'Request timed out while retrieving files',
        files: [] // Return empty array instead of null
      }));
    }
  }, 25000); // 25 second timeout
  
  try {
    let filesList = [];
    
    // Get files from MinIO if available
    if (minioAvailable) {
      console.log(`[API] Retrieving files from MinIO`);
      try {
        filesList = await listFilesFromMinIO() || [];
      } catch (minioErr) {
        console.error(`[API] Error retrieving files from MinIO: ${minioErr.message}`);
        // Continue with empty list rather than failing entirely
      }
    } else {
      console.log(`[API] MinIO not available, only checking local files`);
      // Could implement local file listing here if needed
    }
    
    console.log(`[API] Files found: ${filesList.length}`);
    
    // Clear the timeout since we're done
    clearTimeout(timeout);
    
    // If headers haven't been sent yet (response not timed out)
    if (!res.headersSent) {
      // Return the list of files
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Connection': 'close',
        'X-Response-Time': `${Date.now() - start}ms`
      });
      
      // Create a more detailed response for debugging
      const responseData = {
        success: true,
        message: 'Files retrieved successfully',
        timestamp: new Date().toISOString(),
        minio_status: minioAvailable ? 'available' : 'unavailable',
        response_time_ms: Date.now() - start,
        files_count: filesList.length,
        files: filesList
      };
      
      // Print the full response for debugging
      console.log(`[API] Response summary: success=${responseData.success}, files_count=${responseData.files_count}, minio_status=${responseData.minio_status}`);
      
      res.end(JSON.stringify(responseData));
    }
    
  } catch (err) {
    // Clear the timeout
    clearTimeout(timeout);
    
    console.error(`[API] Error listing files: ${err.message}`);
    console.error(err.stack);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Connection': 'close'
      });
      res.end(JSON.stringify({
        success: false,
        message: `Error listing files: ${err.message}`,
        files: [] // Return empty array instead of null
      }));
    }
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle file uploads
  if (req.method === 'POST' && req.url === '/api/upload') {
    handleFileUpload(req, res);
    return;
  }

  // Handle file listing
  if (req.method === 'GET' && req.url === '/api/files') {
    handleListFiles(req, res);
    return;
  }

  // Serve static files
  serveFile(req, res, req.url);
});

// Start server
server.listen(port, host, () => {
  console.log(`[STARTUP] Server running at http://${host}:${port}/`);
  console.log(`[STARTUP] Local access: http://localhost:${port}/`);
});
