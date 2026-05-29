#!/usr/bin/env node
/**
 * manage-lefthook.js — 替代 sed 管理 lefthook.yml
 *
 * 用法:
 *   node scripts/manage-lefthook.js list                      # 列出所有 hooks
 *   node scripts/manage-lefthook.js add-command <hook> <name> <glob> <run>
 *   node scripts/manage-lefthook.js remove-command <hook> <name>
 *   node scripts/manage-lefthook.js update-command <hook> <name> <key> <value>
 *
 * 示例:
 *   node scripts/manage-lefthook.js add-command pre-push my-check "*.js" "node check.js"
 *   node scripts/manage-lefthook.js remove-command pre-commit lint-js
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = path.resolve(__dirname, '..', 'lefthook.yml');

function load() {
  return yaml.load(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function save(data) {
  // 用 block scalar 格式保持可读性
  const yamlStr = yaml.dump(data, {
    indent: 2,
    lineWidth: 120,
    quotingType: "'",
    forceQuotes: true,
    noRefs: true,
  });
  fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf-8');
  console.log('✅ lefthook.yml updated');
}

function listCommands() {
  const data = load();
  for (const [hook, config] of Object.entries(data)) {
    if (config && config.commands) {
      console.log(`\n${hook}:`);
      for (const [name, cmd] of Object.entries(config.commands)) {
        console.log(`  ${name}:`);
        console.log(`    glob: ${cmd.glob || '(none)'}`);
        console.log(`    run: ${cmd.run ? cmd.run.substring(0, 80) + (cmd.run.length > 80 ? '...' : '') : '(none)'}`);
      }
    }
  }
}

function addCommand(hook, name, glob, run) {
  const data = load();
  if (!data[hook]) data[hook] = { parallel: true, commands: {} };
  if (!data[hook].commands) data[hook].commands = {};
  if (data[hook].commands[name]) {
    console.error(`❌ Command '${name}' already exists in '${hook}'`);
    process.exit(1);
  }
  data[hook].commands[name] = { glob: glob, run: run };
  save(data);
  console.log(`  Added '${name}' to ${hook}`);
}

function removeCommand(hook, name) {
  const data = load();
  if (!data[hook] || !data[hook].commands || !data[hook].commands[name]) {
    console.error(`❌ Command '${name}' not found in '${hook}'`);
    process.exit(1);
  }
  delete data[hook].commands[name];
  save(data);
  console.log(`  Removed '${name}' from ${hook}`);
}

function updateCommand(hook, name, key, value) {
  const data = load();
  if (!data[hook] || !data[hook].commands || !data[hook].commands[name]) {
    console.error(`❌ Command '${name}' not found in '${hook}'`);
    process.exit(1);
  }
  data[hook].commands[name][key] = value;
  save(data);
  console.log(`  Updated '${hook}/${name}/${key}' = ${value}`);
}

// CLI
const args = process.argv.slice(2);
const action = args[0];

switch (action) {
  case 'list':
    listCommands();
    break;
  case 'add-command':
    if (args.length < 4) {
      console.error('Usage: manage-lefthook.js add-command <hook> <name> <glob> <run>');
      process.exit(1);
    }
    addCommand(args[1], args[2], args[3], args.slice(4).join(' '));
    break;
  case 'remove-command':
    if (args.length < 3) {
      console.error('Usage: manage-lefthook.js remove-command <hook> <name>');
      process.exit(1);
    }
    removeCommand(args[1], args[2]);
    break;
  case 'update-command':
    if (args.length < 5) {
      console.error('Usage: manage-lefthook.js update-command <hook> <name> <key> <value>');
      process.exit(1);
    }
    updateCommand(args[1], args[2], args[3], args.slice(4).join(' '));
    break;
  default:
    console.log('Usage:');
    console.log('  node scripts/manage-lefthook.js list');
    console.log('  node scripts/manage-lefthook.js add-command <hook> <name> <glob> <run>');
    console.log('  node scripts/manage-lefthook.js remove-command <hook> <name>');
    console.log('  node scripts/manage-lefthook.js update-command <hook> <name> <key> <value>');
    process.exit(1);
}
