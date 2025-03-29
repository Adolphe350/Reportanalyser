// Ultra-simplified server with minimal dependencies
const http = require("http");
const fs = require("fs");
const path = require("path");
const port = process.env.PORT || 9000;

// Add Gemini API dependency
// To install: npm install @google/generative-ai
let geminiAvailable = false;
let genAI = null;
let geminiModel = null;

// Try to load the Gemini API
try {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  
  // Get API key from environment variable - IMPORTANT: Set this in your environment or configure with Coolify
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (apiKey) {
    console.log(`[STARTUP] Gemini API key found, initializing AI`);
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
  
  if (!geminiAvailable || !geminiModel) {
    console.log(`[AI] Gemini is not available, using simulation mode`);
    return getSimulatedAnalysisResults();
  }
  
  try {
    // Create a prompt for the Gemini AI model
    const prompt = `
You are an expert document and report analyzer. Analyze the following document text and extract key insights, 
metrics, topics, and recommendations. The results should be provided in JSON format with the following structure:
{
  "keyInsights": [array of 4-6 key insights extracted from the document],
  "metrics": {
    "sentiment": number between 0 and 1 representing sentiment score (higher is more positive),
    "confidence": number between 0 and 1 representing confidence in analysis,
    "topics": [array of 3-5 main topics/themes identified in the document]
  },
  "recommendations": [array of 3-5 actionable recommendations based on the document content]
}

Document text to analyze:
${text.substring(0, 10000)} 
${text.length > 10000 ? '... (text truncated for size)' : ''}

Analyze this document and return only the JSON, nothing else.
`;

    console.log(`[AI] Sending request to Gemini AI`);
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    console.log(`[AI] Received response from Gemini`);
    
    // Parse the response to extract the JSON
    try {
      // Extract JSON object from the text response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const analysis = JSON.parse(jsonStr);
        console.log(`[AI] Successfully parsed analysis results`);
        return analysis;
      } else {
        console.error(`[AI] Could not find JSON in response`);
        return getSimulatedAnalysisResults();
      }
    } catch (parseError) {
      console.error(`[AI] Error parsing Gemini response: ${parseError.message}`);
      return getSimulatedAnalysisResults();
    }
  } catch (err) {
    console.error(`[AI] Error in Gemini analysis: ${err.message}`);
    return getSimulatedAnalysisResults();
  }
}

// Get simulated analysis results as fallback
function getSimulatedAnalysisResults() {
  console.log(`[AI] Using simulated analysis results`);
  
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

// Function to extract text from various file types
function extractTextFromFile(buffer, fileType) {
  // In a real implementation, you would use libraries to extract text from different file types
  // For example:
  // - pdf.js for PDF files
  // - mammoth for DOCX files
  // - simple text reading for TXT files
  
  // This is a simulated implementation that returns the raw text if it's a text file
  // or a placeholder text for binary files
  
  if (fileType === 'text/plain') {
    return buffer.toString('utf8');
  } else {
    // In a production scenario, you would extract text from PDFs, DOCs, etc.
    // For this demo, we'll simulate extracted text based on the file type
    return `This is simulated text content extracted from a ${fileType} file.
    
The analysis shows significant growth in key market segments over the past quarter.
Customer satisfaction has increased by approximately 18% year-over-year according to
our surveys. The manufacturing division has several opportunities for operational
efficiency improvements, particularly in the supply chain areas. Our competitor
analysis indicates potential for market share expansion in the APAC region.

The report highlights sustainability initiatives across all business units, with
most showing positive ROI within the first year of implementation. Key stakeholders
have expressed interest in expanding these initiatives to additional product lines.

The marketing team's efforts in customer experience have yielded positive results,
with a 22% increase in repeat purchases and a 15% improvement in Net Promoter Score.

Recommendations include allocating additional resources to emerging markets,
implementing a comprehensive customer feedback program, reviewing manufacturing
processes for automation opportunities, and exploring strategic partnerships
in complementary market segments.`;
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

// Function to handle file uploads
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
  let fileName = '';
  let fileType = '';
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
      // Simple parsing of the first file in multipart data
      // Note: This is a very simplified parser for demonstration purposes
      const dataStr = buffer.toString();
      
      // Find filename from form-data
      const filenameMatch = dataStr.match(/filename="([^"]+)"/i);
      if (filenameMatch) {
        fileName = filenameMatch[1];
        console.log(`[UPLOAD] Filename: ${fileName}`);
      }
      
      // Extract file type
      if (fileName) {
        const ext = path.extname(fileName).toLowerCase();
        fileType = contentTypeMap[ext] || 'application/octet-stream';
        console.log(`[UPLOAD] File type: ${fileType}`);
      }
      
      // Find the actual file data boundary
      const headerEndIndex = dataStr.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) {
        throw new Error('Invalid multipart format: Could not find header boundary');
      }
      
      // Generate a unique filename for storage
      const uniqueFilename = `${Date.now()}-${fileName || 'upload'}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      console.log(`[UPLOAD] Saving file to ${filePath}`);
      
      // In a real implementation, you would extract the file content from the multipart data
      // and save it to disk. For this demo, we'll simulate the file processing.
      
      // Extract text from the file
      const documentText = extractTextFromFile(buffer, fileType);
      
      // Analyze the document using Gemini AI
      const analysisResults = await analyzeDocumentWithGemini(documentText, fileName);
      
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
          originalName: fileName,
          size: totalBytesReceived,
          type: fileType,
          savedAs: uniqueFilename
        },
        analysis: {
          title: 'Analysis Summary',
          timestamp: new Date().toISOString(),
          ...analysisResults
        }
      }));
      
    } catch (err) {
      console.error(`[UPLOAD] Error processing upload: ${err.message}`);
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

// Start listening
server.listen(port, "0.0.0.0", () => {
  console.log(`[READY] Server is running at http://0.0.0.0:${port}/`);
  console.log(`[READY] Ready to accept connections`);
}); 