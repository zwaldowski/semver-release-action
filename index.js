const core = require('@actions/core')
const exec = require('@actions/exec');
const github = require('@actions/github')
const semver = require('semver')

async function getMostRecentRepoTag() {
  console.log('Getting list of tags from repository')
  const token = core.getInput('github_token', { required: true })
  const prefix = core.getInput('prefix', {required: false}) || ""
  const octokit = github.getOctokit(token)

  const { data: refs } = await octokit.git.listMatchingRefs({
    ...github.context.repo,
    ref: 'tags/'
  })

  const prx = new RegExp(`^${prefix}`,'g');
  const versions = refs
    .map(ref => ref.ref.replace(/^refs\/tags\//g, '').replace(prx, ''))
    .map(tag => semver.parse(tag, { loose: true }))
    .filter(version => version !== null)
    .sort(semver.rcompare)

  return versions[0] || semver.parse('0.0.0')
}

async function getMostRecentBranchTag() {
  console.log(`Getting list of tags from branch`)
  let output = ''
  let err = ''
  const options = {}
  options.listeners = {
    stdout: (data) => {
      output += data.toString()
    },
    stderr: (data) => {
      err += data.toString()
    }
  };
  options.cwd = '.'
  let exitCode = await exec.exec('git', ['fetch', '--tags', '--quiet'], options)
  if (exitCode != 0) {
    console.log(err)
    process.exit(exitCode)
  }
  exitCode = await exec.exec('git', ['tag', '--no-column', '--merged'], options)
  if (exitCode != 0) {
    console.log(err)
    process.exit(exitCode)
  }
  const prefix = core.getInput('prefix', {required: false}) || ""
  const prx = new RegExp(`^${prefix}`,'g');
  const versions = output.split("\n")
    .map(tag => semver.parse(tag.replace(prx, ''), { loose: true }))
    .filter(version => version !== null)
    .sort(semver.rcompare)

  return versions[0] || semver.parse('0.0.0')
}

async function mostRecentTag() {
  const perBranch = core.getInput('per_branch', { required: false })
  if (perBranch === 'true') {
    return getMostRecentBranchTag()
  } else {
    return getMostRecentRepoTag()
  }
}

async function createTag(version) {
  const token = core.getInput('github_token', { required: true })
  const octokit = github.getOctokit(token)
  const sha = core.getInput('sha') || github.context.sha
  const ref = `refs/tags/${version}`
  await octokit.git.createRef({
    ...github.context.repo,
    ref,
    sha
  })
}

async function run() {
  try {
    let version = semver.parse(process.env.VERSION)
    if (version === null) {
      const bump = core.getInput('bump', { required: true })
      const latestTag = await mostRecentTag()
      const identifier = core.getInput('preid', { required: false }) || ""
      console.log(`Using latest tag "${latestTag.toString()}" with identifier "${identifier}"`)
      version = semver.inc(latestTag, bump, identifier)
    }

    const prefix = core.getInput('prefix', {required: false}) || ""
    let version_tag = prefix + version.toString()
    console.log(`Using tag prefix "${prefix}"`)

    core.exportVariable('VERSION', version.toString())
    core.setOutput('version', version.toString())
    core.setOutput('version_optimistic', `${semver.major(version)}.${semver.minor(version)}`)
    core.setOutput('version_tag', version_tag)

    console.log(`Result: "${version.toString()}" (tag: "${version_tag}")`)

    if (core.getInput('dry_run') !== 'true') {
      await createTag(version_tag)
    }
  }
  catch (error) {
    core.setFailed(error.message)
  }
}

run()
