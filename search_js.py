#!/usr/bin/env python3
from pathlib import Path

js_file = Path('/workspace/focus-dashboard/dist/assets/index-D3lv-w_0.js')

with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
    
    # Search for key text elements from the app
    searches = {
        "导入数据": "导入数据" in content,
        "导出数据": "导出数据" in content,
        "专注APP数据看板": "专注APP数据看板" in content,
        "UploadOutlined": "UploadOutlined" in content,
        "DownloadOutlined": "DownloadOutlined" in content,
        "Dropdown": "Dropdown" in content,
        "Upload": "Upload" in content,
    }
    
    print("Searching compiled JS for key elements:")
    for key, found in searches.items():
        status = "✓ FOUND" if found else "✗ NOT FOUND"
        print(f"{status}: {key}")
    
    # Check file size
    size_mb = js_file.stat().st_size / (1024 * 1024)
    print(f"\nFile size: {size_mb:.2f} MB")
    
    # Sample snippet around "导入数据"
    if "导入数据" in content:
        idx = content.index("导入数据")
        snippet = content[max(0, idx-100):min(len(content), idx+200)]
        print(f"\nContext around '导入数据':")
        print(snippet)
