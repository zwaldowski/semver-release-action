import {env} from 'node:process'
import {exportVariable, getInput, setFailed, setOutput} from '@actions/core'
import {exec} from '@actions/exec'
import {context, getOctokit} from '@actions/github'
import {coerce, inc, major, minor, parse, rcompare} from 'semver'

async function getMostRecentRepoTag() {
  console.log('Getting list of tags from repository')
  const token = getInput('github_token', {required: true})
  const prefix = getInput('prefix', {required: false}) || ''
  const octokit = getOctokit(token)

  const {data: refs} = await octokit.rest.git.listMatchingRefs({
    ...context.repo,
    ref: 'tags/'
  })

  const prx = new RegExp(`^${prefix}`, 'g')
  const versions = refs
    .map((ref) => ref.ref.replaceAll(/^refs\/tags\//g, '').replace(prx, ''))
    .map((tag) => coerce(tag, {loose: true}))
    .filter((version) => version !== null)
    .sort(rcompare)

  return versions[0] || parse('0.0.0')
}

async function getMostRecentBranchTag() {
  console.log(`Getting list of tags from branch`)
  let output = ''
  let error = ''
  const options = {}
  options.listeners = {
    stdout(data) {
      output += data.toString()
    },
    stderr(data) {
      error += data.toString()
    }
  }
  options.cwd = '.'
  let exitCode = await exec('git', ['fetch', '--tags', '--quiet'], options)
  if (exitCode !== 0) {
    throw new Error(error)
  }

  exitCode = await exec('git', ['tag', '--no-column', '--merged'], options)
  if (exitCode !== 0) {
    throw new Error(error)
  }

  const prefix = getInput('prefix', {required: false}) || ''
  const prx = new RegExp(`^${prefix}`, 'g')
  const versions = output
    .split('\n')
    .map((tag) => coerce(tag.replace(prx, ''), {loose: true}))
    .filter((version) => version !== null)
    .sort(rcompare)

  return versions[0] || parse('0.0.0')
}

async function mostRecentTag() {
  const perBranch = getInput('per_branch', {required: false})
  if (perBranch === 'true') {
    return getMostRecentBranchTag()
  }

  return getMostRecentRepoTag()
}

async function createTag(version) {
  const token = getInput('github_token', {required: true})
  const octokit = getOctokit(token)
  const sha = getInput('sha') || context.sha
  const ref = `refs/tags/${version}`
  await octokit.rest.git.createRef({
    ...context.repo,
    ref,
    sha
  })
}

try {
  let version = parse(env.VERSION)
  if (version === null) {
    const bump = getInput('bump', {required: true})
    const latestTag = await mostRecentTag()
    const identifier = getInput('preid', {required: false}) || ''
    console.log(
      `Using latest tag "${latestTag.toString()}" with identifier "${identifier}"`
    )
    version = inc(latestTag, bump, identifier)
  }

  const prefix = getInput('prefix', {required: false}) || ''
  const versionTag = prefix + version.toString()
  console.log(`Using tag prefix "${prefix}"`)

  exportVariable('VERSION', version.toString())
  setOutput('version', version.toString())
  setOutput('version_optimistic', `${major(version)}.${minor(version)}`)
  setOutput('version_tag', versionTag)

  console.log(`Result: "${version.toString()}" (tag: "${versionTag}")`)

  if (getInput('dry_run') !== 'true') {
    await createTag(versionTag)
  }
} catch (error) {
  setFailed(error.message)
}
