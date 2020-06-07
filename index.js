const core = require('@actions/core')
const {GitHub, context} = require('@actions/github')
const semver = require('semver')

async function getRepoTags() {
  console.log('Getting list of tags from repository')
  const token = core.getInput('github_token', { required: true })
  const octokit = new GitHub(token)

  const { data: refs } = await octokit.git.listRefs({
    ...context.repo,
    namespace: 'tags/'
  })

  return refs.map(ref => ref.ref.replace(/^refs\/tags\//g, ''), { loose: true })
}

async function getBranchTags(branch) {
  console.log('Getting list of tags from branch: ${branch}')
  return []
}

async function mostRecentTag() {
  const branch = core.getInput('branch', { required: false })

  let versions = []
  if (!branch) {
    versions = getRepoTags()
  } else {
    versions = getBranchTags(branch)
  }

  versions = versions
    .map(v => semver.parse(v, { loose: true }))
    .filter(version => version !== null)
    .sort(semver.rcompare)

  return versions[0] || semver.parse('0.0.0')
}

async function createTag(version) {
  const token = core.getInput('github_token', { required: true })
  const octokit = new GitHub(token)
  const sha = core.getInput('sha') || context.sha
  const ref = `refs/tags/${version}`
  await octokit.git.createRef({
    ...context.repo,
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
