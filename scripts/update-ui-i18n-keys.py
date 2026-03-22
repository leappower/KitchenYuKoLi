#!/usr/bin/env python3
"""
Script to update translation keys in src/assets/ui-i18n.json.
Changes:
- nav_produkte -> nav_products
- nav_case_studies -> nav_cases
- Add nav_support from footer_support_title
"""

import json

def update_ui_i18n_file():
    file_path = 'src/assets/ui-i18n.json'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        updated = False
        
        # Process each language
        for lang_code, translations in data.items():
            # Update nav_produkte -> nav_products
            if 'nav_produkte' in translations:
                translations['nav_products'] = translations['nav_produkte']
                del translations['nav_produkte']
                updated = True
            
            # Update nav_case_studies -> nav_cases
            if 'nav_case_studies' in translations:
                translations['nav_cases'] = translations['nav_case_studies']
                del translations['nav_case_studies']
                updated = True
            
            # Add nav_support from footer_support_title if not exists
            if 'footer_support_title' in translations and 'nav_support' not in translations:
                translations['nav_support'] = translations['footer_support_title']
                updated = True
        
        if updated:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated {file_path}")
            return True
        else:
            print(f"No changes needed for {file_path}")
            return False
    
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

if __name__ == '__main__':
    update_ui_i18n_file()
