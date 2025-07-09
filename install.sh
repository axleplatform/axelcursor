#!/bin/bash
echo "Cleaning package.json before install..."
# Remove any https: entries before npm sees them
sed -i '/"https:"/d' package.json
# Now run npm install
npm install --omit=dev 