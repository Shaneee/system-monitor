#!/bin/bash

# push.sh - Build and push script for Ubuntu/Linux

DOCKER_USERNAME="shaneee"
IMAGE_NAME="system-monitor"

# Get version from command line argument
VERSION=$1
if [ -z "$VERSION" ]; then
    # If no version provided, try to get it from version.json
    if [ -f "app/version.json" ]; then
        VERSION=$(grep -o '"version": *"[^"]*"' app/version.json | cut -d'"' -f4)
    fi
    # Fallback to default
    if [ -z "$VERSION" ]; then
        VERSION="0.2.02"
    fi
fi

echo "Building version $VERSION..."

# Ensure version.json is up to date
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
echo "Updated version.json to version $VERSION"

# Build and tag
docker build -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} .
docker tag ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} ${DOCKER_USERNAME}/${IMAGE_NAME}:latest

# Push
docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}
docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:latest

echo "Successfully pushed:"
echo " - ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo " - ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"