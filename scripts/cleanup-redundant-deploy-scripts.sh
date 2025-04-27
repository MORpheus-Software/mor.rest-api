#!/bin/bash
set -e

# Cleanup script to organize deployment scripts
# This script archives redundant deployment scripts in a directory for reference

# Create archive directory if it doesn't exist
mkdir -p scripts/deprecated_deploy_scripts

# Move redundant scripts to the archive
mv scripts/deploy-to-cloud-run-dev.sh scripts/deprecated_deploy_scripts/ 2>/dev/null || true
mv scripts/deploy-to-cloud-run-dev-fixed.sh scripts/deprecated_deploy_scripts/ 2>/dev/null || true
mv scripts/deploy-to-cloud-run.sh scripts/deprecated_deploy_scripts/ 2>/dev/null || true
mv scripts/deploy-to-cloud-run-original.sh scripts/deprecated_deploy_scripts/ 2>/dev/null || true
mv scripts/simple-deploy-to-cloud-run.sh scripts/deprecated_deploy_scripts/ 2>/dev/null || true

# Create a README file in the archive directory
cat > scripts/deprecated_deploy_scripts/README.md << EOF
# Deprecated Deployment Scripts

These deployment scripts have been archived as part of consolidation.

The main deployment script is now \`../deploy-to-cloud-run-noninteractive.sh\`, which includes all fixes and improvements from these older scripts.

Key improvements in the consolidated script:
1. ES module support for build-for-deploy.js
2. Proper environment variable handling
3. Multiple environment support (dev/staging/prod)
4. Build process with TypeScript error bypass
5. Comprehensive error handling

These scripts are kept for reference purposes only and should not be used for deployment.
EOF

# Make the cleanup script executable
chmod +x scripts/deprecated_deploy_scripts/README.md

echo "✅ Redundant deployment scripts have been moved to scripts/deprecated_deploy_scripts/"
echo "📝 A README.md file has been created to document the changes"
echo "📌 Use scripts/deploy-to-cloud-run-noninteractive.sh for all deployments" 