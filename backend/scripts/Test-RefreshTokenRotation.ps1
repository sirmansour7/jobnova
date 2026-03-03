param(
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password,
  [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "Logging in..."

$loginBody = @{
  email = $Email
  password = $Password
} | ConvertTo-Json

try {
  $login = Invoke-RestMethod -Uri "$BaseUrl/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
  Write-Host "Login OK"
} catch {
  Write-Error "Login failed: $($_.Exception.Message)"
  exit 1
}

Write-Host "Refreshing once..."

$refreshBody = @{
  refreshToken = $login.refreshToken
} | ConvertTo-Json

try {
  $newPair = Invoke-RestMethod -Uri "$BaseUrl/v1/auth/refresh" -Method Post -ContentType "application/json" -Body $refreshBody
  Write-Host "First refresh OK"
} catch {
  Write-Error "First refresh failed: $($_.Exception.Message)"
  exit 1
}

Write-Host "Trying OLD refresh token again (should be 401)..."

try {
  Invoke-RestMethod -Uri "$BaseUrl/v1/auth/refresh" -Method Post -ContentType "application/json" -Body $refreshBody
  Write-Error "❌ Old refresh token STILL works (rotation broken)"
  exit 1
} catch {
  $status = $null
  try { $status = $_.Exception.Response.StatusCode.value__ } catch {}
  if ($status -eq 401) {
    Write-Host "✅ Old refresh token correctly rejected with 401"
    exit 0
  } else {
    Write-Error "Unexpected error: $($_.Exception.Message)"
    exit 1
  }
}
