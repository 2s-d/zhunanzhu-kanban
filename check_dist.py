#!/usr/bin/env python3
import os
import time
from pathlib import Path

# Check dist build time
dist_dir = Path('/workspace/focus-dashboard/dist')
if dist_dir.exists():
    index_file = dist_dir / 'index.html'
    if index_file.exists():
        mtime = index_file.stat().st_mtime
        build_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
        print(f"Dist build time: {build_time}")
    
    # Check if js file contains export keywords
    assets_dir = dist_dir / 'assets'
    if assets_dir.exists():
        for js_file in assets_dir.glob('*.js'):
            print(f"\nChecking {js_file.name}...")
            with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                keywords = ['导出', 'exportTo', 'exportToExcel', 'exportToPDF', 'exportToCSV', 'DownloadOutlined', 'jsPDF', 'XLSX']
                found = []
                for keyword in keywords:
                    if keyword in content:
                        found.append(keyword)
                
                if found:
                    print(f"✓ Found export keywords: {', '.join(found)}")
                else:
                    print(f"✗ No export keywords found")
                    
                # Check file size
                size_mb = js_file.stat().st_size / (1024 * 1024)
                print(f"File size: {size_mb:.2f} MB")
            break
else:
    print("Dist directory does not exist")

# Check App.tsx modification time
app_tsx = Path('/workspace/focus-dashboard/src/App.tsx')
if app_tsx.exists():
    mtime = app_tsx.stat().st_mtime
    mod_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
    print(f"\nApp.tsx last modified: {mod_time}")

# Check exportData.ts modification time
export_data = Path('/workspace/focus-dashboard/src/utils/exportData.ts')
if export_data.exists():
    mtime = export_data.stat().st_mtime
    mod_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
    print(f"exportData.ts last modified: {mod_time}")
