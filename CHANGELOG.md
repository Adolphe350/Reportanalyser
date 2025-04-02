# Changelog

All notable changes to the AI Report Analyzer project will be documented in this file.

## [Unreleased]

## [1.0.17] - 2024-04-02

### Fixed
- Enhanced analytics configuration with proper CORS settings
- Added explicit endpoint configuration for analytics tracking
- Improved cross-domain tracking support
- Added debug mode for better troubleshooting
- Updated analytics script attributes for better compatibility

## [1.0.16] - 2024-04-02

### Fixed
- Fixed analytics tracking by switching to direct analytics API endpoint
- Removed proxy configuration that was causing 404 errors
- Updated analytics script source to use the official tracking endpoint

## [1.0.15] - 2024-04-02

### Fixed
- Fixed "Missing project ID" error by updating analytics script configuration
- Changed analytics script initialization to use data-project-id attribute
- Removed window.analyticsConfig in favor of direct script attribute configuration

## [1.0.14] - 2024-04-02

### Fixed
- Fixed "Missing project ID" error in analytics initialization
- Added proper analytics script loading sequence
- Added debug logging for analytics configuration
- Improved analytics script loading with async attribute

## [1.0.13] - 2024-04-02

### Added
- Added `/api/pixel` endpoint for handling pixel tracking requests
- Added proxy configuration for analytics script to improve cross-origin handling

### Changed
- Updated analytics script configuration to use proxy endpoint
- Improved CORS headers for pixel tracking requests
- Enhanced error handling for pixel tracking

### Fixed
- Fixed cross-origin issues with pixel tracking
- Added fallback handling for failed pixel requests
- Improved retry mechanism for tracking events

## [1.0.12] - 2024-04-02

### Fixed
- Fixed analytics pixel tracking issues:
  - Added proxy endpoint for pixel tracking
  - Improved CORS configuration
  - Added retry mechanism for failed pixel requests
  - Enhanced error handling for cross-origin requests
  - Added fallback tracking configuration

## [1.0.11] - 2024-04-02

### Fixed
- Enhanced Gateway Timeout (504) handling:
  - Increased server timeouts to 3 minutes
  - Added TCP keep-alive settings
  - Improved Traefik configuration with retry logic
  - Added better CORS and connection handling
  - Enhanced error reporting for timeouts

## [1.0.10] - 2024-04-02

### Fixed
- Fixed analytics script initialization issues:
  - Removed redundant analytics script tags
  - Added proper initialization check before sending events
  - Updated analytics script loading to use direct URL
  - Added event queuing when analytics is not initialized
  - Improved DOM ready handling for script loading

## [1.0.9] - 2024-04-02

### Fixed
- Fixed analytics script initialization issues:
  - Added proper analytics configuration initialization
  - Prevented duplicate script loading
  - Added initialization status tracking
  - Improved error handling and logging
  - Removed redundant script tags

## [1.0.8] - 2024-04-02

### Fixed
- Fixed analytics script cross-origin issues by:
  - Adding proper CORS headers to analytics proxy
  - Implementing robust error handling and retries
  - Adding pixel tracking fallback mechanism
  - Improving script loading with retry logic
  - Adding better logging for debugging

## [1.0.7] - 2024-04-02

### Fixed
- Fixed Gateway Timeout (504) issues by implementing:
  - Increased server and client timeouts to 2 minutes
  - Added keep-alive connections
  - Improved MinIO client configuration
  - Added retry logic with exponential backoff
  - Enhanced error handling and user feedback
  - Implemented connection persistence

## [1.0.6] - 2024-04-02

### Changed
- Updated analytics tracking script project ID to db60ea84-01e7-48fd-b1f0-b181dbb5863d

## [1.0.5] - 2024-04-02

### Fixed
- Fixed analytics tracking script implementation to properly pass the project ID

## [1.0.4] - 2024-04-02

### Changed
- Updated analytics tracking script with new project ID

## [1.0.3] - 2024-04-02

### Fixed
- Fixed CORS issues with analytics tracking script
- Added error handling for analytics script to provide fallback functionality

## [1.0.2] - 2024-04-02

### Fixed
- Fixed Gateway Timeout (504) errors by increasing server and client timeouts
- Implemented automatic retry mechanism for failed API requests
- Added better error handling and user feedback during long-running operations
- Enhanced server-side logging to better diagnose timeout issues

## [1.0.1] - 2024-04-02

### Added
- Added analytics tracking code to index.html and dashboard.html
- Added CHANGELOG.md file to track changes to the project

## [1.0.0] - 2024-03-29

### Added
- Initial release of the AI Report Analyzer application
- Upload PDF, DOCX, and TXT files for analysis
- Document analysis using Google's Gemini AI
- Interactive dashboard displaying analysis results
- Responsive design for all device sizes 