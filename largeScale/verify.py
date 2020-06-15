#!/usr/bin/env python

import sys
import time
import requests

from multiprocessing import Pool

url = ""
local_file = "/home/jamis/Virtual-Random-File/build/mnt/testfile"
file_size = 6 * 1024 * 1024 * 1024 * 1024
block_size = 32 * 1024 * 1024

def download_range(blockIndex):
    length = block_size
    offset = block_index*block_size
    h = { "x-ms-range": "bytes=" + str(offset) + "-" + str(offset + length - 1) }

    retries = 1
    while True:
        try:
            r = requests.get(url, headers=h)
            r.raise_for_status()
            break
        except Exception as E:
            print str(offset) + "retry " + str(retries)
            if retries > 5:
                break
            time.sleep(retries)
            retries += 1

    f = open(local_file, "r")
    f.seek(offset)
    f_content = f.read(length)

    if f_content != r.content:
        print str(offset) + "failed"
    else:
        print str(offset) + "pass"
    sys.stdout.flush()

num_blocks = file_size / block_size
pool = Pool(64)
pool.map(download_range, range(num_blocks))