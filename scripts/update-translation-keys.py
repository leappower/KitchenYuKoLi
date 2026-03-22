#!/usr/bin/env python3
"""
Script to update translation keys in all language files.
Changes:
- nav_produkte -> nav_products
- nav_case_studies -> nav_cases
- footer_support_title -> nav_support (for navigation context)
"""

import os
import json
import glob

def update_file(file_path):
    """Update keys in a single JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Track changes
        changes = []
        
        # Update nav_produkte -> nav_products
        if 'nav_produkte' in data:
            data['nav_products'] = data['nav_produkte']
            del data['nav_produkte']
            changes.append('nav_produkte -> nav_products')
        
        # Update nav_case_studies -> nav_cases
        if 'nav_case_studies' in data:
            data['nav_cases'] = data['nav_case_studies']
            del data['nav_case_studies']
            changes.append('nav_case_studies -> nav_cases')
        
        # Update footer_support_title -> nav_support (for navigation context)
        # Note: We keep footer_support_title for footer usage, but add nav_support for navigation
        if 'footer_support_title' in data:
            # Only add nav_support if it doesn't already exist
            if 'nav_support' not in data:
                data['nav_support'] = data['footer_support_title']
                changes.append('footer_support_title -> nav_support (added)')
        
        # Write back if changes were made
        if changes:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated {file_path}: {', '.join(changes)}")
            return True
        else:
            print(f"No changes needed for {file_path}")
            return False
    
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    # Get all UI language files
    lang_dir = os.path.join('src', 'assets', 'lang')
    ui_files = glob.glob(os.path.join(lang_dir, '*-ui.json'))
    
    print(f"Found {len(ui_files)} UI language files")
    
    updated_count = 0
    for file_path in ui_files:
        if update_file(file_path):
            updated_count += 1
    
    print(f"\nUpdated {updated_count} out of {len(ui_files)} files")
    
    # Also update the merged UI file
    merged_file = os.path.join('src', 'assets', 'ui-i18n-merged.json')
    if os.path.exists(merged_file):
        print(f"\nUpdating merged file: {merged_file}")
        update_file(merged_file)
    
    # Update the main UI file
    main_ui_file = os.path.join('src', 'assets', 'ui-i18n.json')
    if os.path.exists(main_ui_file):
        print(f"\nUpdating main UI file: {main_ui_file}")
        update_file(main_ui_file)

if __name__ == '__main__':
    main()
