import { join, resolve } from 'node:path';

export const skillName = 'elegantly-delegated';

export const targets = {
  'claude-code': { project: '.claude', global: '.claude', workers: 'markdown', activation: '/elegantly-delegated' },
  antigravity: { project: '.agents', global: '.gemini/config', workers: 'markdown', activation: '/elegantly-delegated' },
  codex: { project: '.agents', global: '.agents', workers: 'toml', activation: '$elegantly-delegated' },
  opencode: { project: '.opencode', global: '.config/opencode', workers: 'markdown', activation: 'ask to use elegantly-delegated' },
  cursor: { project: '.cursor', global: '.cursor', workers: 'markdown', activation: '/elegantly-delegated' },
  'copilot-cli': { project: '.github', global: '.copilot', workers: 'agent-markdown', activation: 'ask to use elegantly-delegated' },
  'gemini-cli': { project: '.gemini', global: '.gemini', activation: 'ask to use elegantly-delegated' },
  pi: { project: '.agents', global: '.agents', activation: '/skill:elegantly-delegated' },
  cline: { project: '.cline', global: '.cline', activation: 'ask to use elegantly-delegated' },
  kilo: { project: '.kilo', global: '.kilo', activation: 'ask to use elegantly-delegated' },
  augment: { project: '.augment', global: '.augment', activation: 'ask to use elegantly-delegated' },
  amp: { project: '.agents', global: '.agents', activation: '/elegantly-delegated' },
  'qwen-code': { project: '.qwen', global: '.qwen', activation: '/elegantly-delegated' },
};

const roles = [
  {
    name: 'ed-recon',
    description: 'Read-only reconnaissance or artifact review for a bounded elegantly-delegated assignment.',
    instructions: 'Inspect the named paths and return concise findings with file and symbol evidence, uncertainties, and suggested checks. Do not change files or run commands. Ask the supervisor to run checks requiring a shell.',
  },
  {
    name: 'ed-implement',
    description: 'Implement and test a bounded change after the elegantly-delegated supervisor has chosen the approach.',
    instructions: 'Implement the assigned contract within your owned paths. Run the stated checks and return the changed paths, outcomes, and any unresolved issue. Stop if the work requires a design decision, additional permission, or changes outside your assignment.',
  },
];

export function validateModel(target, model) {
  if (!model || !/^[A-Za-z0-9][A-Za-z0-9_.:/@+#-]{0,199}$/.test(model) ||
      /^(inherit|default|auto)$/i.test(model)) {
    throw new Error('Supply an explicit native model identifier. Inherited and automatic selections are unsupported.');
  }
  if (target === 'antigravity' && !['flash', 'pro'].includes(model)) {
    throw new Error('Antigravity custom workers accept the documented explicit tiers flash and pro.');
  }
  if (target === 'opencode' && !/^[^/#]+\/[^/#]+(?:#[^/#]+)?$/.test(model)) {
    throw new Error('OpenCode workers require provider/model with an optional #variant.');
  }
  if (target === 'copilot-cli' && !/^[^/#]+\/[^/#]+$/.test(model)) {
    throw new Error('Copilot CLI workers require a configured provider/model ID.');
  }
}

export function harnessPaths(target, scope, root, env) {
  const harness = targets[target];
  const configured = target === 'claude-code' && scope === 'global' && env.CLAUDE_CONFIG_DIR;
  const config = configured ? resolve(configured) : join(root, harness[scope]);
  const workers = target === 'codex'
    ? join(scope === 'global' && env.CODEX_HOME ? resolve(env.CODEX_HOME) : join(root, '.codex'), 'agents')
    : join(config, 'agents');
  const extension = { toml: '.toml', markdown: '.md', 'agent-markdown': '.agent.md' }[harness.workers];

  return {
    config,
    skill: join(config, 'skills', skillName, 'SKILL.md'),
    workers: harness.workers ? roles.map(role => ({
      role,
      path: join(workers, role.name + extension),
      alternate: target === 'antigravity' ? join(workers, role.name, 'agent.md')
        : target === 'copilot-cli' ? join(workers, role.name + '.md') : undefined,
    })) : [],
  };
}

export function renderWorker(target, role, model) {
  const { name, description } = role;
  const readOnly = name === 'ed-recon';
  const instructions = role.instructions + ' Do not spawn workers. Follow the supervisor’s contract and report any blocker.';
  const fields = [JSON.stringify(name), JSON.stringify(description)];
  if (target === 'codex') {
    return [
      'name = ' + fields[0],
      'description = ' + fields[1],
      'model = ' + JSON.stringify(model),
      'developer_instructions = ' + JSON.stringify(instructions),
      '',
    ].join('\n');
  }
  const frontmatter = [
    '---',
    'name: ' + fields[0],
    'description: ' + fields[1],
    'model: ' + JSON.stringify(model),
  ];
  if (target === 'claude-code') {
    const tools = readOnly ? 'Read, Grep, Glob' : 'Read, Grep, Glob, Edit, Write, Bash';
    frontmatter.push('tools: ' + tools);
  } else if (target === 'antigravity') {
    const tools = readOnly ? 'view_file, grep_search' : 'view_file, grep_search, replace_file_content, run_command';
    frontmatter.push('subagent: true', 'mainAgent: false', 'tools: [' + tools + ']',
      'commandExecutionPolicy: ' + JSON.stringify(readOnly ? 'off' : 'sandbox'));
  } else if (target === 'cursor') {
    frontmatter.push('readonly: ' + readOnly);
  } else if (target === 'copilot-cli') {
    const permitted = readOnly ? ['read', 'grep', 'glob'] : ['read', 'grep', 'glob', 'edit', 'execute'];
    frontmatter.push('model-policy: required', 'tools: ' + JSON.stringify(permitted));
  } else {
    const permitted = readOnly ? ['read', 'glob', 'grep'] : ['read', 'glob', 'grep', 'edit', 'shell'];
    frontmatter.splice(1, 1); // OpenCode takes the agent ID from the filename.
    frontmatter.push('mode: subagent', 'permissions:',
      '  - { action: "*", resource: "*", effect: deny }',
      ...permitted.map(action => '  - { action: ' + action + ', resource: "*", effect: ' +
        (action === 'shell' ? 'ask' : 'allow') + ' }'));
  }
  return [...frontmatter, '---', '', instructions, ''].join('\n');
}
