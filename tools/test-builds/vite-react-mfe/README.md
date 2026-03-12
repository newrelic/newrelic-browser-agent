# Vite React MFE Test Build

This test build is specifically designed to test the Register API's auto-detection capabilities for Micro Frontend (MFE) architectures.

## Purpose

This build validates:

1. **Auto-detection from DOM attributes** - MFE events triggered from elements with `data-nr-mfe-id` attributes
2. **Auto-detection from stack traces** - AJAX requests (fetch/XHR), errors, and logs automatically attributed to the correct MFE based on the calling code's location
3. **Multiple MFEs in one module** - Support for multiple registered entities within the same JavaScript file
4. **Duplication modes** - Testing both exclusive MFE attribution and container+MFE duplication

## Key Features

### MFE Registration
- Multiple MFE registrations via `newrelic.register()` in `src/main.tsx`
- External MFE script loaded via `public/assets/js/2nd-mfe.js`

### Test Scenarios
- **User Actions**: Elements decorated with `data-nr-mfe-id` for automatic MFE attribution
- **AJAX**: Fetch and XHR requests auto-detected based on stack trace
- **Errors**: JavaScript errors attributed to the triggering MFE
- **Logs**: Console logs attributed based on calling context

## Configuration

Feature flags required:
- `register` - Enable the register API with all auto-detection features (AJAX, errors, user actions, and logs)

API configuration:
- `allow_registered_children: true` - Enable auto-detection
- `duplicate_registered_data: true/false` - Control whether events are sent to both container and MFE

## Build Output

Builds to: `tests/assets/test-builds/vite-react-mfe/`

## Difference from vite-react-wrapper

The `vite-react-wrapper` test build is a general-purpose Vite+React test environment, while this build is specifically configured for testing MFE auto-detection features.
