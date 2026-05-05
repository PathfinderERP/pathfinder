import os, sys

finance_dir = r'C:\Users\Pathfinder\Desktop\Pathfinder\ERP\pathfinder\frontend\src\pages\Finance'

for fname in os.listdir(finance_dir):
    if not fname.endswith('.jsx'):
        continue
    fpath = os.path.join(finance_dir, fname)
    with open(fpath, encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if 'text-white' in line and 'isDarkMode' not in line and 'className=' in line:
                out = f'{fname}:{i}: {line.strip()[:100]}'
                sys.stdout.buffer.write((out + '\n').encode('utf-8', errors='replace'))
