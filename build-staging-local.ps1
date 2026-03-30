param(
    [string]$owner = ""
)

if ([string]::IsNullOrEmpty($owner)) {
    $owner = Read-Host "Please enter your GitHub username or organization (owner)"
}

$Registry = "ghcr.io"
# Ensure the image name is all lowercase (Docker requirement)
$Prefix = "${Registry}/${owner}/ap-gaming-hub".ToLower()

Write-Host "Building for registry: $Prefix" -ForegroundColor Cyan

# --- Backend ---
Write-Host "`n[1/3] Building Backend..." -ForegroundColor Yellow
docker build -t "${Prefix}/backend:staging" ./backend
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed"; exit 1 }

# --- Frontend ---
Write-Host "`n[2/3] Building Frontend..." -ForegroundColor Yellow
docker build -t "${Prefix}/frontend:staging" ./frontend
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }

# --- Nginx ---
Write-Host "`n[3/3] Building Nginx..." -ForegroundColor Yellow
docker build -t "${Prefix}/nginx:staging" ./nginx
if ($LASTEXITCODE -ne 0) { Write-Error "Nginx build failed"; exit 1 }

# --- Push ---
$push = Read-Host "`nBuild complete. Do you want to push to GHCR? (y/n)"
if ($push -eq 'y') {
    Write-Host "`nPushing Backend..." -ForegroundColor Cyan
    docker push "${Prefix}/backend:staging"

    Write-Host "`nPushing Frontend..." -ForegroundColor Cyan
    docker push "${Prefix}/frontend:staging"

    Write-Host "`nPushing Nginx..." -ForegroundColor Cyan
    docker push "${Prefix}/nginx:staging"
    
    Write-Host "`nAll done!" -ForegroundColor Green
} else {
    Write-Host "`nSkipping push." -ForegroundColor Yellow
}
