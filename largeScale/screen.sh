#!/bin/bash

range=50000*4000*1024*1024/8;
for i in $(seq 0 7); 
do
    if [ -z "$STY" ]; then exec screen -dm -S `download$i` ts-node verifyRange $range*i $range*(i+1); fi
done
