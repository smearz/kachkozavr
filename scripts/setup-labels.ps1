param(
  [string]$Repo = ""
)

$ErrorActionPreference = "Stop"

function Ensure-Tool($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required tool '$name' is not installed or not in PATH."
  }
}

Ensure-Tool gh

$labelSpecs = @(
  @{ name = "type:epic"; color = "5319e7"; description = "Large outcome-oriented workstream" },
  @{ name = "type:task"; color = "0e8a16"; description = "Deliverable task item" },
  @{ name = "prio:p0"; color = "b60205"; description = "Critical priority" },
  @{ name = "prio:p1"; color = "d93f0b"; description = "High priority" },
  @{ name = "prio:p2"; color = "fbca04"; description = "Medium priority" },
  @{ name = "status:todo"; color = "cfd3d7"; description = "Ready to start" },
  @{ name = "status:in-progress"; color = "1d76db"; description = "Actively in work" },
  @{ name = "status:done"; color = "0e8a16"; description = "Completed" },
  @{ name = "area:auth"; color = "0052cc"; description = "Auth and access control" },
  @{ name = "area:groups-invites"; color = "0052cc"; description = "Groups and invite flow" },
  @{ name = "area:programs"; color = "0052cc"; description = "Programs and assignments" },
  @{ name = "area:reports"; color = "0052cc"; description = "Reports and execution logging" },
  @{ name = "area:triggers"; color = "0052cc"; description = "Triggers and attention queue" },
  @{ name = "area:media"; color = "0052cc"; description = "Uploads and media access" },
  @{ name = "area:infra"; color = "0052cc"; description = "Infrastructure and CI/CD" }
)

foreach ($l in $labelSpecs) {
  $args = @("label", "create", $l.name, "--color", $l.color, "--description", $l.description, "--force")
  if ($Repo -ne "") {
    $args += @("--repo", $Repo)
  }
  gh @args | Out-Null
  Write-Host "Label ensured: $($l.name)"
}

Write-Host "Done."
