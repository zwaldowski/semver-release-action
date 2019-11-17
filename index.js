const core = require('@actions/core')
const {GitHub, context} = require('@actions/github')
const semver = require('semver')

async function mostRecentTag() {
  const token = core.getInput('github_token', { required: true })
  const octokit = new GitHub(token)

  const { data: refs } = await octokit.git.listRefs({
    ...context.repo,
    namespace: 'tags/'
  })

  const versions = refs
    .map(ref => semver.parse(ref.ref.replace(/^refs\/tags\//g, ''), { loose: true }))
    .filter(version => version !== null)
    .sort(semver.rcompare)

  return versions[0] || semver.parse('0.0.0')
}

async function createTag(version) {
  const token = core.getInput('github_token', { required: true })
  const octokit = new GitHub(token)
  const sha = core.getInput('sha') || context.sha
  const ref = `refs/tags/${version.toString()}`
  await octokit.git.createRef({
    ...context.repo,
    ref,
    sha
  })
}

async function run() {
  try {
    var version = semver.parse(process.env.VERSION)
    if (version === null) {
      const bump = core.getInput('bump', { required: true })
      const latestTag = await mostRecentTag()
      version = semver.inc(latestTag, bump)
    }

    core.exportVariable('VERSION', version.toString())
    core.setOutput('version', version.toString())
    core.setOutput('version_optimistic', `${semver.major(version)}.${semver.minor(version)}`)

    if (core.getInput('dry_run') !== 'true') {
      await createTag(version)
    }
  } 
  catch (error) {
    core.setFailed(error.message)
  }
}

run()
