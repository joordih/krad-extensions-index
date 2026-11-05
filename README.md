# Krad ADE extension index

The list of extensions Krad ADE offers in **Settings → Extensions → Browse**. The app reads `index.json` from this repository's default branch, caches it, and installs an entry by checking out exactly the commit listed here.

## Adding or updating an extension

Open a pull request that edits `index.json`:

```json
{
  "id": "docker",
  "name": "Docker",
  "description": "One line, under 200 characters.",
  "repository": "https://github.com/you/your-extension.git",
  "commit": "40-hex commit to install",
  "api": "1.0",
  "tags": ["docker", "containers"]
}
```

- `id` must equal the `id` in the extension's `extension.toml` at that commit. Ids are lowercase letters, digits, `-`, `_` and `.`, and never start with `.` or contain `..`.
- `commit` pins what users install. To ship a new version, bump the commit. Krad shows the update, and the user must trust the extension again before it runs, because trust covers the code.
- `api` is the extension API version the extension needs.

The `Check index` workflow validates every entry. It checks the fields and fetches each pinned commit to confirm that its `extension.toml` declares the same id and API.

## Trust

Listing an extension here does not make it trusted. Krad shows what each extension declares before it runs anything: its commands, views, tools, host kinds, permissions and the languages it adds. Every update asks again. Review an extension's code before you trust it.

## License

MIT or Apache-2.0, at your option.
