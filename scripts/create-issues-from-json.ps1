param(
  [Parameter(Mandatory = $true)]
  [string]$File,
  [string]$Repo = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "gh CLI is required."
}

if (-not (Test-Path $File)) {
  throw "File not found: $File"
}

$items = Get-Content $File -Raw | ConvertFrom-Json

foreach ($item in $items) {
  $labels = ($item.labels -join ",")
  $args = @(
    "issue", "create",
    "--title", $item.title,
    "--body", $item.body,
    "--label", $labels
  )

  if ($Repo -ne "") {
    $args += @("--repo", $Repo)
  }

  $url = gh @args
  Write-Host "Created: $url"
}

Write-Host "Done."
