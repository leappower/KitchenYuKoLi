#!/usr/bin/env python3
"""
Script to add missing navigation keys to src/assets/ui-i18n.json.
Adds:
- nav_home
- nav_devices
- nav_solutions (already exists, ensure it's there)
- nav_roi
"""

import json

def add_nav_keys():
    file_path = 'src/assets/ui-i18n.json'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        updated = False
        
        # Define the new keys and their default English translations
        new_keys = {
            'nav_home': 'Home',
            'nav_devices': 'Devices',
            'nav_roi': 'ROI'
        }
        
        # Process each language
        for lang_code, translations in data.items():
            # Add missing keys
            for key, default_value in new_keys.items():
                if key not in translations:
                    # Use appropriate translation based on language
                    if lang_code == 'zh-CN':
                        if key == 'nav_home':
                            translations[key] = '首页'
                        elif key == 'nav_devices':
                            translations[key] = '设备'
                        elif key == 'nav_roi':
                            translations[key] = 'ROI计算器'
                    elif lang_code == 'zh-TW':
                        if key == 'nav_home':
                            translations[key] = '首頁'
                        elif key == 'nav_devices':
                            translations[key] = '設備'
                        elif key == 'nav_roi':
                            translations[key] = 'ROI計算器'
                    elif lang_code == 'en':
                        translations[key] = default_value
                    else:
                        # For other languages, use English as fallback
                        translations[key] = default_value
                    updated = True
        
        if updated:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated {file_path} with new navigation keys")
            return True
        else:
            print(f"No new navigation keys needed for {file_path}")
            return False
    
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

if __name__ == '__main__':
    add_nav_keys()
