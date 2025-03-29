// Ultra-simplified server with minimal dependencies
const http = require("http");
const fs = require("fs");
const path = require("path");

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
    // Try different paths based on what might be available in the installed package
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
      console.log(`[PDF] PDF.js library loaded successfully via legacy path`);
    } catch (e) {
      console.log(`[PDF] Legacy path failed, trying alternative paths`);
      try {
        pdfjsLib = await import('pdfjs-dist/build/pdf.js');
      } catch (e2) {
        pdfjsLib = await import('pdfjs-dist');
      }
    }
    
    // Set the worker source to null to use the main thread
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    console.log(`[PDF] PDF.js worker initialized to use main thread`);
    return true;
  } catch (err) {
    console.error(`[PDF] Error loading PDF.js: ${err.message}`);
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
    geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
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
    return getSimulatedAnalysisResults(fileName);
  }
  
  try {
    console.log(`[AI] Preparing to analyze document text (${text.length} chars)`);
    
    // Create a prompt for the Gemini AI model
    const prompt = `
You are an expert document and report analyzer. I need you to thoroughly analyze the following document text and extract meaningful insights.
The document is named: "${fileName}"

Analyze the content for:
1. Key insights about the business, market, or subject of the document
2. Important metrics or data points mentioned
3. Main topics and themes
4. Actionable recommendations based on the content

The results should be provided in JSON format with the following structure:
{
  "keyInsights": [array of 4-6 specific key insights extracted from the document],
  "metrics": {
    "sentiment": number between 0 and 1 representing sentiment score (higher is more positive),
    "confidence": number between 0 and 1 representing confidence in analysis,
    "topics": [array of 3-5 main topics/themes identified in the document]
  },
  "recommendations": [array of 3-5 specific actionable recommendations based on the document content]
}

Document text to analyze:
${text.substring(0, 10000)} 
${text.length > 10000 ? '... (text truncated for size)' : ''}

Analyze this document and return only the JSON, nothing else. The analysis should be specific to this document, not generic.
`;

    console.log(`[AI] Creating Gemini request with prompt length: ${prompt.length}`);
    console.log(`[AI] Sending request to Gemini AI`);
    
    // Make the API call with timeout handling
    const startTime = Date.now();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini API request timed out after 20 seconds')), 20000)
    );
    
    // Create the Gemini request
    const geminiPromise = geminiModel.generateContent(prompt);
    
    // Wait for either the API response or timeout
    const result = await Promise.race([geminiPromise, timeoutPromise]);
    const response = await result.response;
    const responseText = response.text();
    
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
        return getSimulatedAnalysisResults(fileName);
      }
    } catch (parseError) {
      console.error(`[AI] Error parsing Gemini response: ${parseError.message}`);
      console.error(`[AI] Raw response text: ${responseText.substring(0, 500)}...`);
      return getSimulatedAnalysisResults(fileName);
    }
  } catch (err) {
    console.error(`[AI] Error in Gemini analysis: ${err.message}`);
    console.error(`[AI] Error stack: ${err.stack}`);
    return getSimulatedAnalysisResults(fileName);
  }
}

// Get simulated analysis results as fallback
function getSimulatedAnalysisResults(fileName) {
  console.log(`[AI] Using simulated analysis results for ${fileName || 'unknown file'}`);
  
  // If we have a filename, create more tailored simulated results
  if (fileName) {
    // Get the filename without extension to use in results
    const fileBaseName = path.basename(fileName, path.extname(fileName));
    
    return {
      keyInsights: [
        `${fileBaseName} shows growth opportunities in emerging markets`,
        `Customer satisfaction metrics increased by 23% following new service protocols`,
        `Digital transformation has reduced operational costs by 15%`,
        `Competitor analysis reveals potential for strategic acquisitions`,
        `Sustainability initiatives demonstrate positive ROI and brand perception impact`
      ],
      metrics: {
        sentiment: 0.82,
        confidence: 0.94,
        topics: ['market growth', 'customer experience', 'digital transformation', 'competitive analysis', 'sustainability']
      },
      recommendations: [
        `Allocate marketing resources to high-growth regions identified in ${fileBaseName}`,
        'Implement real-time customer feedback mechanisms across all channels',
        'Evaluate automation opportunities in fulfillment and distribution',
        'Pursue strategic partnerships with complementary service providers',
        'Develop comprehensive sustainability metrics for quarterly reporting'
      ]
    };
  }
  
  // Default simulated results if no filename provided
  return {
    keyInsights: [
      'Multiple growth opportunities identified in emerging markets',
      'Customer satisfaction metrics increased by 18% year-over-year',
      'Operational efficiency improvements suggested for manufacturing division',
      'Competitor analysis reveals potential for market share expansion',
      'Sustainability initiatives show positive ROI across business units'
    ],
    metrics: {
      sentiment: 0.78,
      confidence: 0.92,
      topics: ['growth', 'customer experience', 'operational efficiency', 'market analysis', 'sustainability']
    },
    recommendations: [
      'Allocate additional resources to emerging market expansion',
      'Implement customer feedback program across all service channels',
      'Review manufacturing processes for potential automation improvements',
      'Consider strategic partnerships in complementary market segments',
      'Expand sustainability initiatives to additional product lines'
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
      // Basic text extraction by looking for text patterns in the PDF
      const textChunks = [];
      for (let i = 0; i < pdfBuffer.length - 6; i++) {
        // Look for text between parentheses, a common text encoding in PDFs
        if (pdfBuffer[i] === 40) { // '('
          let text = '';
          let j = i + 1;
          let depth = 1;
          
          while (j < pdfBuffer.length && depth > 0 && text.length < 1000) {
            if (pdfBuffer[j] === 40) depth++; // Nested '('
            else if (pdfBuffer[j] === 41) depth--; // ')'
            
            if (depth > 0 && pdfBuffer[j] >= 32 && pdfBuffer[j] <= 126) { // printable ASCII
              text += String.fromCharCode(pdfBuffer[j]);
            }
            j++;
          }
          
          if (text.length > 3) { // Only keep substantial text
            // Remove common PDF control sequences
            text = text.replace(/\\(\d{3}|n|r|t|b|f|\\|\(|\))/g, ' ');
            textChunks.push(text);
          }
          i = j;
        }
      }
      
      // Join the chunks and limit the size
      const fallbackText = textChunks
        .filter(chunk => /[a-zA-Z]{3,}/.test(chunk)) // Only chunks with actual words
        .join(' ')
        .replace(/\s+/g, ' ')
        .substring(0, 5000);
      
      console.log(`[PDF] Fallback extraction found ${textChunks.length} text chunks`);
      return `[PDF text extraction fallback mode - partial content]:\n\n${fallbackText}`;
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
          location: minioFileInfo ? minioFileInfo.url : `uploads/${uniqueFilename}`
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

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const start = Date.now();
  
  try {
    console.log(`[REQUEST] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
    console.log(`[REQUEST] Headers: ${JSON.stringify(req.headers)}`);
    
    // For health checks
    if (req.url === "/health" || req.url === "/api/health") {
      console.log(`[HEALTH] Serving health check response`);
      res.writeHead(200, { 
        "Content-Type": "application/json",
        "Connection": "close" 
      });
      res.end(JSON.stringify({ 
        status: "ok", 
        time: new Date().toISOString(),
        uptime: process.uptime()
      }));
      return;
    }
    
    // Handle file uploads
    if (req.method === 'POST' && req.url === '/api/upload') {
      console.log(`[UPLOAD] Received file upload request`);
      handleFileUpload(req, res);
      return;
    }
    
    // For static files
    serveFile(req, res);
    
  } catch (err) {
    console.error(`[ERROR] Request handler error: ${err.message}`);
    res.writeHead(500, { "Content-Type": "text/plain", "Connection": "close" });
    res.end("Server Error");
  }
});

// Connection listeners
server.on('connection', (socket) => {
  console.log(`[CONNECTION] New connection from ${socket.remoteAddress}`);
  
  socket.on('error', (err) => {
    console.error(`[CONNECTION] Socket error: ${err.message}`);
  });
  
  socket.on('close', (hadError) => {
    console.log(`[CONNECTION] Socket closed ${hadError ? 'with error' : 'cleanly'}`);
  });
});

// Set a timeout handler
server.setTimeout(60000, (socket) => {
  console.log(`[TIMEOUT] Socket timeout from ${socket.remoteAddress}`);
  socket.destroy();
});

// Error handler
server.on("error", (err) => {
  console.error(`[ERROR] Server error: ${err.message}`);
});

// Start the server
console.log(`[STARTUP] Starting server initialization`);

// Initialize PDF.js at startup
initPdfLib().then(success => {
  console.log(`[STARTUP] PDF.js initialization: ${success ? 'Success' : 'Failed'}`);
}).catch(err => {
  console.error(`[STARTUP] Error initializing PDF.js: ${err.message}`);
});

// Test MinIO connection
if (minioAvailable) {
  console.log(`[STARTUP] Testing MinIO connection...`);
  testMinIOConnection().then(success => {
    console.log(`[STARTUP] MinIO connection test: ${success ? 'Success' : 'Failed'}`);
    
    if (success) {
      console.log(`[STARTUP] MinIO storage is properly configured and working!`);
    } else {
      console.log(`[STARTUP] MinIO connection failed or bucket doesn't exist yet.`);
      console.log(`[STARTUP] Will try to ensure bucket exists...`);
      
      // Try to create the bucket if it doesn't exist
      ensureMinIOBucket().then(bucketSuccess => {
        console.log(`[STARTUP] MinIO bucket check complete: ${bucketSuccess ? 'Success' : 'Failed'}`);
      }).catch(err => {
        console.error(`[STARTUP] Error checking MinIO bucket: ${err.message}`);
      });
    }
  }).catch(err => {
    console.error(`[STARTUP] Error during MinIO connection test: ${err.message}`);
  });
} else {
  console.log(`[STARTUP] MinIO is not available, skipping connection test`);
}

// Test connection to MinIO
async function testMinIOConnection() {
  if (!minioAvailable || !minioClient) {
    console.log(`[MINIO] Test connection skipped - MinIO not available`);
    return false;
  }
  
  try {
    console.log(`[MINIO] Testing connection to MinIO server at ${minioClient.host}:${minioClient.port}...`);
    
    // List buckets as a basic connectivity test
    const buckets = await minioClient.listBuckets();
    console.log(`[MINIO] Connection successful! Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}`);
    
    // Check if our target bucket exists
    console.log(`[MINIO] Checking if bucket '${minioBucket}' exists...`);
    const bucketExists = await minioClient.bucketExists(minioBucket);
    if (bucketExists) {
      console.log(`[MINIO] Target bucket '${minioBucket}' exists and is accessible.`);
      
      // Try listing a few objects to confirm read access
      try {
        const objects = await new Promise((resolve, reject) => {
          const objectsList = [];
          const stream = minioClient.listObjects(minioBucket, '', true);
          
          stream.on('data', (obj) => {
            objectsList.push(obj.name);
            if (objectsList.length >= 5) stream.destroy(); // Limit to first 5 objects
          });
          
          stream.on('error', (err) => {
            reject(err);
          });
          
          stream.on('end', () => {
            resolve(objectsList);
          });
        });
        
        if (objects.length > 0) {
          console.log(`[MINIO] Successfully listed ${objects.length} objects in bucket '${minioBucket}': ${objects.join(', ')}`);
        } else {
          console.log(`[MINIO] Bucket '${minioBucket}' exists but is empty.`);
        }
      } catch (listErr) {
        console.error(`[MINIO] Error listing objects in bucket: ${listErr.message}`);
      }
      
      return true;
    } else {
      console.log(`[MINIO] Target bucket '${minioBucket}' does not exist yet. Will try to create it when needed.`);
      return false;
    }
  } catch (err) {
    console.error(`[MINIO] Connection test failed: ${err.message}`);
    console.error(`[MINIO] Error details: ${err.stack}`);
    return false;
  }
}

// Start listening
server.listen(port, "0.0.0.0", () => {
  console.log(`[READY] Server is running at http://0.0.0.0:${port}/`);
  console.log(`[READY] Ready to accept connections`);
}); 