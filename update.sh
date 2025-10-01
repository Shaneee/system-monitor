#!/bin/bash

# update.sh - Version management script for Ubuntu/Linux

# Get version from command line or use default
VERSION=$1
if [ -z "$VERSION" ]; then
    VERSION="0.2.02"  # Set your default version
fi

echo "Updating to version: $VERSION"

# ONLY update version.json - nothing else!
VERSION_JSON=$(cat <<EOF
{
    "version": "$VERSION",
    "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)

# Ensure the app directory exists
mkdir -p app

echo "$VERSION_JSON" > app/version.json

echo "Successfully updated to version $VERSION"
echo " - Updated app/version.json"