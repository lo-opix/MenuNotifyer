#!/bin/bash
echo "------------Date------------" >> logs.txt &&
date >> logs.txt &&
echo "------------Git-------------">> logs.txt &&
git pull >> logs.txt &&
echo "------------Npm-------------">> logs.txt &&
npm i >> logs.txt &&
echo "------------App-------------">> logs.txt &&
node app.js >> logs.txt &&
echo "------------END------------">> logs.txt 