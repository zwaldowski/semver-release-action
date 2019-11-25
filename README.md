# Semantic Versioning Release Action

This action locates the current version of the repository using its tags, increments it based on the inputs, then creates a tag for that new version at the current commit. Use it to automate the release deployment of a project.

## Inputs

### `bump`

**Required** The type of semantic version increment to make. One of `major`, `premajor`, `minor`, `preminor`, `patch`, `prepatch`, or `prerelease`.

You may get this value from another action, such as zwaldowski/match-label-action.

### `github_token`

**Required**. Used to make API requests for looking through and creating tags. Pass in using `secrets.GITHUB_TOKEN`.

### `dry_run`

**Optional**. If true, only calculate the new version and exit successfully. Use this if you want to make additional changes using the version number before tagging. The calculated version number will automatically be used when this action gets re-run.

### `sha`

**Optional**. Override the commit hash used to create the version tag. Use this if you previously ran the action with `dry_run` and modified the tree.

## Outputs

### `version`

The full version number produced by incrementing the semantic version number of the latest tag according to the `bump` input. For instance, given `12.4.1` and `bump: minor`, `12.5.0`.

### `version_optimistic`

The major and minor components of `version`. For instance, given `12.4.1` and `bump: minor`, `12.5`. Use for recommending a non-specific release to users, as in a `~>` declaration in a `Gemfile`.

## Example usage

### Simple

Create a version, f.ex., when merging to master.

```yaml
- id: bump
  uses: zwaldowski/match-label-action@v1
  with:
    allowed: major,minor,patch
- uses: zwaldowski/semver-release-action@v1
  with:
    bump: ${{ steps.bump.outputs.match }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced

Create a version and use the version to modify the repo, such as update a `README`. Run `semver-release-action` once to determine the version number and once to actually perform the release.

```yaml
- id: next_version
  uses: zwaldowski/semver-release-action@v1
    with:
      dry_run: true
      bump: ${{ … }}
      github_token: ${{ secrets.GITHUB_TOKEN }}
// Do something to modify the repo using `${{ steps.next_version.outputs.version }}`.
- run: echo "${{ steps.next_version.outputs.version }}"
- run: |
    git add .
    git commit -m "Bump version"
    git push
    echo ::set-output name=sha::$(git rev-parse HEAD)
- uses: zwaldowski/semver-release-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    sha: ${{ steps.git_commit.outputs.sha }}
```
