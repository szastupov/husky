'use strict'

const fs = require('fs')
const path = require('path')
const mock = require('mock-fs')
const installFrom = require('../src/install')
const uninstallFrom = require('../src/uninstall')

const gitDir = '/.git'

function readHook(hookPath) {
  return fs.readFileSync(path.join(gitDir, hookPath), 'utf-8')
}

function exists(hookPath) {
  return fs.existsSync(path.join(gitDir, hookPath))
}

describe('husky', function() {
  afterEach(function() {
    mock.restore()
  })

  it('should support basic layout', function() {
    mock({
      '/.git/hooks': {},
      '/node_modules/husky': {}
    })

    installFrom('/node_modules/husky')
    const hook = readHook('hooks/pre-commit')

    expect(hook).toMatch('#husky')
    expect(hook).toMatch('cd .')
    expect(hook).toMatch('npm run precommit')
    expect(hook).toMatch('--no-verify')

    const prepareCommitMsg = readHook('hooks/prepare-commit-msg')
    expect(prepareCommitMsg).toMatch('cannot be bypassed')

    uninstallFrom('/node_modules/husky')
    expect(exists('hooks/pre-push')).toBeFalsy()
  })

  it('should support project installed in sub directory', function() {
    mock({
      '/.git/hooks': {},
      '/A/B/node_modules/husky': {}
    })

    installFrom('/A/B/node_modules/husky')
    const hook = readHook('hooks/pre-commit')

    expect(hook).toMatch('cd A/B')

    uninstallFrom('/A/B/node_modules/husky')
    expect(exists('hooks/pre-push')).toBeFalsy()
  })

  it('should support git submodule', function() {
    mock({
      '/.git/modules/A/B': {},
      '/A/B/.git': 'git: ../../.git/modules/A/B',
      '/A/B/node_modules/husky': {}
    })

    installFrom('/A/B/node_modules/husky')
    const hook = readHook('modules/A/B/hooks/pre-commit')

    expect(hook).toMatch('cd .')

    uninstallFrom('/A/B/node_modules/husky')
    expect(exists('hooks/pre-push')).toBeFalsy()
  })

  it('should support git submodule and sub directory', function() {
    mock({
      '/.git/modules/A/B': {},
      '/A/B/.git': 'git: ../../.git/modules/A/B',
      '/A/B/C/node_modules/husky': {}
    })

    installFrom('/A/B/C/node_modules/husky')
    const hook = readHook('modules/A/B/hooks/pre-commit')

    expect(hook).toMatch('cd C')

    uninstallFrom('/A/B/app/node_modules/husky')
    expect(exists('hooks/pre-push')).toBeFalsy()
  })

  it('should support git worktrees', function() {
    mock({
      '/.git/worktrees/B': {},
      '/A/B/.git': 'git: /.git/worktrees/B',
      '/A/B/node_modules/husky': {}
    })

    installFrom('/A/B/node_modules/husky')
    const hook = readHook('worktrees/B/hooks/pre-commit')

    expect(hook).toMatch('cd .')

    uninstallFrom('/A/B/node_modules/husky')
    expect(exists('hooks/pre-commit')).toBeFalsy()
  })

  it('should not modify user hooks', function() {
    mock({
      '/.git/hooks': {},
      '/.git/hooks/pre-push': 'foo',
      '/node_modules/husky': {}
    })

    // Verify that it's not overwritten
    installFrom('/node_modules/husky')
    const hook = readHook('hooks/pre-push')
    expect(hook).toBe('foo')

    uninstallFrom('/node_modules/husky')
    expect(exists('hooks/pre-push')).toBeTruthy()
  })

  it('should not install from /node_modules/A/node_modules', function() {
    mock({
      '/.git/hooks': {},
      '/node_modules/A/node_modules/husky': {}
    })

    installFrom('/node_modules/A/node_modules/husky')
    expect(exists('hooks/pre-push')).toBeFalsy()
  })

  it("should not crash if there's no .git directory", function() {
    mock({
      '/node_modules/husky': {}
    })

    expect(function() {
      installFrom('/node_modules/husky')
    }).not.toThrow()

    expect(function() {
      uninstallFrom('/node_modules/husky')
    }).not.toThrow()
  })

  it('should migrate ghooks scripts', function() {
    mock({
      '/.git/hooks/pre-commit':
        '// Generated by ghooks. Do not edit this file.',
      '/node_modules/husky': {}
    })

    installFrom('/node_modules/husky')
    const hook = readHook('hooks/pre-commit')
    expect(hook).toMatch('husky')
    expect(hook).not.toMatch('ghooks')
  })
})
