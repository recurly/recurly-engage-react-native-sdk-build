#!/bin/bash

rm -rf dist
mkdir dist

cd engage-core
npm pack
mv *.tgz ../dist

cd ..
npm pack
mv *.tgz ./dist