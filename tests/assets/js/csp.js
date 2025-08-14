// This script will trigger a CSP violation
var script = document.createElement('script')
script.src = 'https://example.com'
document.body.appendChild(script)
