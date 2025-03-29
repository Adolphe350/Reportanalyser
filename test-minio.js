// Test script to verify MinIO connectivity
const Minio = require('minio');
const fs = require('fs');
const path = require('path');

// Check for .env file existence
const envPath = path.join(__dirname, '.env');
console.log(`Checking for .env file at: ${envPath}`);
console.log(`File exists: ${fs.existsSync(envPath)}`);

if (fs.existsSync(envPath)) {
  console.log('Contents of .env file:');
  const envContents = fs.readFileSync(envPath, 'utf8');
  console.log(envContents);
}

// Try to load .env manually
try {
  require('dotenv').config();
  console.log('Dotenv loaded, checking process.env keys:');
  console.log(Object.keys(process.env).filter(key => key.startsWith('MINIO')));
} catch (err) {
  console.error(`Error loading dotenv: ${err.message}`);
}

// Manually set the credentials if not found in environment
const minioEndpoint = process.env.MINIO_ENDPOINT || 'minio-uk0wsk4sw4o4kow40s8kc0wc.app.kimuse.rw';
const minioPort = parseInt(process.env.MINIO_PORT || '443');
const minioUseSSL = process.env.MINIO_USE_SSL === 'true' || true;
const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'CKaDxWb6gmINhYeuj58T';
const minioSecretKey = process.env.MINIO_SECRET_KEY || '8WtOaHAOn9oqLgW4JXJTFGNxTLFvCRvGfRhvNvRQ';
const minioBucket = process.env.MINIO_BUCKET || 'generalstorage';

console.log(`
=== MinIO Connection Test ===
Endpoint: ${minioEndpoint}
Port: ${minioPort}
UseSSL: ${minioUseSSL}
AccessKey: ${minioAccessKey ? minioAccessKey.substring(0, 5) + '...' : 'undefined'}
SecretKey: ${minioSecretKey ? '******' : 'undefined'}
Target Bucket: ${minioBucket}
`);

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: minioEndpoint,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey
});

console.log(`MinIO client initialized, testing connection...`);
console.log(`Client host: ${minioClient.host}`);
console.log(`Client port: ${minioClient.port}`);
console.log(`Client protocol: ${minioClient.protocol}`);

// Test listing buckets
async function testConnection() {
  try {
    // List all buckets
    console.log('Attempting to list all buckets...');
    const buckets = await minioClient.listBuckets();
    console.log(`Connection successful! Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => console.log(` - ${bucket.name} (created: ${bucket.creationDate})`));
    
    // Check if our target bucket exists
    console.log(`\nChecking if target bucket '${minioBucket}' exists...`);
    const exists = await minioClient.bucketExists(minioBucket);
    
    if (exists) {
      console.log(`Bucket '${minioBucket}' exists!`);
      
      // List objects in the bucket
      console.log(`Listing objects in '${minioBucket}'...`);
      const objectsStream = minioClient.listObjects(minioBucket, '', true);
      
      const objects = [];
      objectsStream.on('data', obj => {
        objects.push(obj);
        console.log(` - ${obj.name} (size: ${obj.size} bytes, last modified: ${obj.lastModified})`);
      });
      
      objectsStream.on('error', err => {
        console.error(`Error listing objects: ${err.message}`);
      });
      
      objectsStream.on('end', () => {
        console.log(`Found ${objects.length} objects in bucket '${minioBucket}'`);
        
        if (objects.length === 0) {
          console.log(`\nBucket is empty. Let's try to upload a test file...`);
          uploadTestFile();
        }
      });
    } else {
      console.log(`Bucket '${minioBucket}' does not exist. Attempting to create it...`);
      try {
        await minioClient.makeBucket(minioBucket);
        console.log(`Successfully created bucket '${minioBucket}'`);
        uploadTestFile();
      } catch (err) {
        console.error(`Failed to create bucket: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Connection failed: ${err.message}`);
    console.error(`Error code: ${err.code}`);
    console.error(`Error stack: ${err.stack}`);
    
    if (err.code === 'AccessDenied') {
      console.log('\nAccess denied error: This typically means your credentials are incorrect or the user doesn\'t have sufficient permissions.');
    } else if (err.code === 'ConnectTimeoutError' || err.code === 'ConnectionClosed') {
      console.log('\nConnection error: Check if the endpoint is correct and accessible from your network.');
    }
  }
}

// Upload a simple test file
async function uploadTestFile() {
  try {
    const testFileName = 'test-file-' + Date.now() + '.txt';
    const testContent = Buffer.from('This is a test file to verify MinIO connectivity.');
    
    console.log(`\nUploading test file '${testFileName}' to bucket '${minioBucket}'...`);
    
    await minioClient.putObject(minioBucket, testFileName, testContent);
    console.log(`Test file uploaded successfully!`);
    
    // Generate a URL for the file
    console.log(`File URL: ${minioClient.protocol}//${minioClient.host}:${minioClient.port}/${minioBucket}/${testFileName}`);
  } catch (err) {
    console.error(`Failed to upload test file: ${err.message}`);
  }
}

// Run the test
testConnection().catch(err => {
  console.error(`Unhandled error: ${err.message}`);
}); 