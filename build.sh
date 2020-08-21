#!/bin/bash

set -ex

if [ ! -d "ecma262" ]; then
  git clone https://github.com/tc39/ecma262 --depth 1
fi
cd ./ecma262
git pull
npm install
npm run build
cd ..

rm -rf ./build
mkdir -p ./build
cp -r ./ecma262/out/* build

npm install
node ./build.js
