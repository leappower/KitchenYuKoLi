import re

with open('src/assets/js/ui/floating-actions.js', 'r') as f:
    content = f.read()

# 提取 IIFE 中的代码
iife_start = content.find('(function (global) {')
iife_end = content.rfind('}(window)')

if iife_start == -1 or iife_end == -1:
    print("Could not find IIFE")
    exit(1)

iife_content = content[iife_start:iife_end]

# 逐个字符检查括号
lines = iife_content.split('\n')
balance = 0
in_string = False
string_char = None
unbalanced_positions = []

for line_num, line in enumerate(lines, start=1):
    for char_num, char in enumerate(line):
        # 检查字符串开始/结束
        if char in "'\"":
            if not in_string:
                in_string = True
                string_char = char
            elif string_char == char:
                in_string = False

        # 只在不在字符串中时计算括号
        if not in_string:
            if char == '(':
                balance += 1
                unbalanced_positions.append((line_num, char_num + 1, 'open', balance))
            elif char == ')':
                balance -= 1
                if balance < 0:
                    print(f"Error: More closing than opening at line {line_num}, col {char_num + 1}")
                    print(f"  {line[:char_num + 1]}^")
                    print(f"  Balance: {balance}")
                    exit(1)
                else:
                    # 找到匹配的开括号
                    for i in range(len(unbalanced_positions) - 1, -1, -1):
                        if unbalanced_positions[i][2] == 'open' and unbalanced_positions[i][3] == balance + 1:
                            unbalanced_positions.pop(i)
                            break

print(f"Final balance: {balance}")
if balance != 0:
    print(f"ERROR: Unbalanced parentheses! {balance} extra opening parentheses.")
    print("\nUnmatched opening parentheses:")
    for pos in unbalanced_positions:
        line, col, type, bal = pos
        print(f"  Line {line}, col {col} (balance after opening: {bal})")
else:
    print("OK: Parentheses are balanced")
