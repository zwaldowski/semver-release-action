# Semantic Versioning Release Action

This action locates the current version of the repository using its tags, increments it based on the inputs, then creates a tag for that new version at that current commit. Use it to automate the release deployment of a project.

## Inputs

### `bump`

**Required** The type of semantic version increment to make. One of `major`, `premajor`, `minor`, `preminor`, `patch`, `prepatch`, or `prerelease`).

You may get this value from another action, such as zwaldowski/match-label-action.

### `github_token`

**Required**. Used to make API requests for looking through and creating tags. Pass in using `secrets.GITHUB_TOKEN`.

### `dry_run`

**Optional**. If true, only calculate the new version and exits successfully. Use this if you want to make additional changes using the version number before tagging. The calculated version number will automatically be used when this action gets re-run.

### `sha`

**Optional**. Override the commit hash used to create the version tag. Use this if you previously ran the action with `dry_run` and modified the tree.

## Outputs

### `version`

The full version number produced by incrementing the semantic version number of the latest tag according to the `bump` input. For instance, given `12.4.1` and `bump: minor`, `12.5.0`.

### `version_optimistic`

The major and minor components of `version`. For instance, given `12.4.1` and `bump: minor`, `12.5`. Use for recommending a non-specific release to users, as in a `~>` declaration in a `Gemfile`.

## Example usage

```yaml
- id: next_version
  uses: zwaldowski/match-label-action@v1
  with:
    bump: minor
    dry_run: true
    github_token: ${{ secrets.GITHUB_TOKEN }}
- run: echo "${{ steps.next_version.outputs.version }}"
```

```yaml
- id: git_commit
  run: echo ::set-output name=sha::$(git rev-parse HEAD)
- uses: zwaldowski/semver-release-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    sha: ${{ steps.git_commit.outputs.sha }}
```
