# -*- coding: utf-8 -*-
import os
import re
import fnmatch
import argparse
from textwrap import dedent

parser = argparse.ArgumentParser(description='Add/update copyright on C# files')
parser.add_argument('root', nargs=1, help='Path to the root of the C# project')
args = parser.parse_args()

# Descend into the 'root' directory and find all *.ts files
files = []
for root, dirnames, filenames in os.walk(args.root[0]):
    for filename in fnmatch.filter(filenames, "*.ts"):
        files.append(os.path.join(root, filename))
        print(files[len(files) -1])
print('Found {0} *.ts files'.format(len(files)))

for filepath in files:
    with open(filepath) as f:
        contents = f.read()
        
    match = re.search(r"^.*\/\/ Copyright \(c\) Microsoft Corporation\..*$", contents, re.DOTALL) 
    if match:
        print ('{} already contains a copy right header.'.format(filepath))
    else:
        # Make the file's now contain the user defined copyright (below)
        # followed by a blank line followed by the actual code.
        contents = dedent('''\
            // Copyright (c) Microsoft Corporation.
            // Licensed under the MIT license.

            ''').format(os.path.basename(filepath)) + contents
        with open(filepath, 'w') as f:
            f.write(contents)
        print("Wrote new: {0}".format(filepath))
