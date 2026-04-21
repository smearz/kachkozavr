# GitHub Projects Setup (MVP Tracking)

## 1. Preconditions

- Repository is pushed to GitHub.
- You are authenticated in GitHub CLI: `gh auth login`.
- You have a GitHub Project (v2) created.

## 2. Configure repository variables/secrets

Set repository variable:

- `PROJECT_V2_URL` = full project URL, for example `https://github.com/orgs/<org>/projects/3`

Set repository secret:

- `PROJECTS_TOKEN` = PAT with scopes:
  - `repo`
  - `project`

Notes:
- Built-in `GITHUB_TOKEN` often lacks required project write permissions.
- Use a dedicated bot/user PAT if possible.

## 3. Create baseline labels

```powershell
pwsh ./scripts/setup-labels.ps1 -Repo "<owner>/<repo>"
```

## 4. Seed initial MVP issues

```powershell
pwsh ./scripts/create-issues-from-json.ps1 -File "./project/mvp-issues.json" -Repo "<owner>/<repo>"
```

## 5. How automation works

- `.github/workflows/add-to-project.yml`
  - Adds newly opened/reopened issues and PRs to your Project v2.
- `.github/workflows/issue-status-by-pr.yml`
  - When PR is opened/reopened/ready_for_review and contains `Closes #123`, sets linked issue label to `status:in-progress`.
  - When PR is merged, sets linked issue label to `status:done`.

## 6. Required PR convention

In every PR description include:

```text
Closes #<issue_number>
```

This powers auto-close and status label sync.

## 7. Recommended project views

- `Board by status` (group by labels `status:*`)
- `Table by area` (filter `area:*`)
- `Critical path` (filter `prio:p0,prio:p1`)
