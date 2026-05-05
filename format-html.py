#!/usr/bin/env python3
"""
Format a compressed HTML file into readable form.
Uses a simple tag-based approach (not a full parser) since
we need to preserve the exact content.
"""
import re, sys

def format_html(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    lines = []
    i = 0
    indent = 0
    
    while i < len(content):
        # Find next tag
        tag_start = content.find('<', i)
        
        if tag_start == -1:
            # Remaining text
            text = content[i:].strip()
            if text:
                lines.append('  ' * indent + text)
            break
        
        # Text before tag
        text = content[i:tag_start].strip()
        if text and text != '\n':
            lines.append('  ' * indent + text)
        
        # Get full tag
        tag_end = content.find('>', tag_start)
        if tag_end == -1:
            tag_end = len(content) - 1
        
        tag = content[tag_start:tag_end+1]
        
        # Determine tag type
        is_closing = tag.startswith('</')
        is_self_closing = tag.endswith('/>') or tag in ('<br>', '<br/>', '<hr>', '<hr/>', '<img>', '<meta>', '<link>', '<input>')
        is_comment = tag.startswith('<!--')
        is_doctype = tag.startswith('<!')
        
        # Extract tag name
        if is_closing:
            tag_name = re.match(r'</(\w+)', tag)
            tag_name = tag_name.group(1) if tag_name else ''
        elif is_comment:
            tag_name = 'comment'
        elif is_doctype:
            tag_name = 'doctype'
        else:
            tag_name = re.match(r'<(\w+)', tag)
            tag_name = tag_name.group(1) if tag_name else ''
        
        # Void elements (self-closing)
        void_elements = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
        
        if is_closing:
            indent = max(0, indent - 1)
            lines.append('  ' * indent + tag)
        elif tag_name in void_elements:
            lines.append('  ' * indent + tag)
        elif is_self_closing:
            lines.append('  ' * indent + tag)
        elif is_comment:
            lines.append('  ' * indent + tag)
        elif is_doctype:
            lines.append(tag)
        else:
            lines.append('  ' * indent + tag)
            # Don't indent for inline elements
            inline_elements = {'span', 'a', 'strong', 'b', 'em', 'i', 'small', 'code', 'label', 'time', 'abbr'}
            if tag_name not in inline_elements:
                # Check if this is an opening tag with content on same line
                if not tag.endswith('/>'):
                    indent += 1
        
        i = tag_end + 1
    
    # Join and clean up excessive blank lines
    result = '\n'.join(lines)
    result = re.sub(r'\n{3,}', '\n\n', result)
    
    return result

if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else 'src/pages/support/index-mobile.html'
    formatted = format_html(filepath)
    with open(filepath, 'w') as f:
        f.write(formatted + '\n')
    print(f"Formatted {filepath}: {len(formatted.splitlines())} lines")
