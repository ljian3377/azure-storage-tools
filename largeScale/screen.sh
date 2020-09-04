#!/bin/bash

range=50000*4000*1024*1024/8;
for i in $(seq 0 7); 
do
    screen -dmS "download$i" ts-node verifyRanges.ts $range*$i $range*$(($i+1)) > ./out$i
done
