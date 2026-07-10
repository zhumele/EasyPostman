# ============================================================================
# EasyPostman Web 一键离线分发包构建脚本（Windows PowerShell）
# 用法（在项目根目录 PowerShell 中执行）：
#   .\build\package-linux.ps1
# 产物：dist\EasyPostman-6.0.12-linux-x64.tar.gz
# ============================================================================

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir      = Join-Path $ProjectRoot "easy-postman-web"
$BuildDir    = Join-Path $ProjectRoot "build"
$Downloads   = Join-Path $BuildDir "downloads"
$StageDir    = Join-Path $BuildDir "stage"
$DistDir     = Join-Path $ProjectRoot "dist"
$StageApp    = Join-Path $StageDir "EasyPostman"
$ScriptsDir  = Join-Path $BuildDir "linux"

# 读取版本
[xml]$pomXml = Get-Content (Join-Path $ProjectRoot "pom.xml")
$version = $pomXml.project.properties.revision
if (-not $version) { $version = "6.0.12" }
Write-Host "[INFO] 项目版本: $version"

# 配置
$JAVA_HOME = "C:\DevelopTools\java\jdk-21.0.10"
$env:JAVA_HOME = $JAVA_HOME
$env:Path = "$JAVA_HOME\bin;$env:Path"

# 清理阶段目录
Write-Host "[1/7] 准备阶段目录"
if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }
if (Test-Path $DistDir)  { Remove-Item -Recurse -Force $DistDir }
New-Item -ItemType Directory -Force -Path $StageApp | Out-Null
New-Item -ItemType Directory -Force -Path $DistDir  | Out-Null

# 1. 构建后端
Write-Host "[2/7] Maven 构建后端 shade jar"
Push-Location $ProjectRoot
try {
    & mvn -pl easy-postman-web -am clean package -DskipTests -q
    if ($LASTEXITCODE -ne 0) { throw "Maven 构建失败" }
} finally { Pop-Location }

$shadeJar = Join-Path $WebDir "target/easy-postman-web-$version-shaded.jar"
if (-not (Test-Path $shadeJar)) {
    $shadeJar = Join-Path $WebDir "target/easy-postman-web-$version.jar"
}
if (-not (Test-Path $shadeJar)) {
    $shadeJar = (Get-ChildItem (Join-Path $WebDir "target") -Filter "easy-postman-web-*-shaded.jar" |
        Where-Object { $_.Name -notlike "original-*" } | Select-Object -First 1).FullName
}
if (-not $shadeJar -or -not (Test-Path $shadeJar)) { throw "未找到 shade jar" }
Write-Host "  -> $shadeJar"

# 2. 构建前端
Write-Host "[3/7] npm 构建前端"
$frontendDir = Join-Path $ProjectRoot "frontend"
Push-Location $frontendDir
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "前端构建失败" }
} finally { Pop-Location }

# 复制前端产物到 target/web-dist
$webDistSrc = Join-Path $WebDir "web-dist"
$webDistDst = Join-Path $WebDir "target/web-dist"
if (-not (Test-Path $webDistDst)) {
    Copy-Item -Path $webDistSrc -Destination $webDistDst -Recurse -Force
}

# 3. 准备 JRE
Write-Host "[4/7] 检查/下载 Temurin 21 JRE (Linux x64)"
$jreZip = Join-Path $Downloads "temurin21-jre-linux.zip"
$jreDir = Join-Path $Downloads "temurin21-jre"
if (-not (Test-Path $jreDir) -or -not (Test-Path (Join-Path $jreDir "jdk-21.0.11+10-jre/bin/java"))) {
    if (Test-Path $jreDir) { Remove-Item -Recurse -Force $jreDir }
    if (-not (Test-Path $jreZip)) {
        Write-Host "  下载 Temurin 21 JRE (Linux x64)..."
        New-Item -ItemType Directory -Force -Path $Downloads | Out-Null
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $url = "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jre/hotspot/normal/eclipse"
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $jreZip)
    }
    Write-Host "  解压 JRE..."
    New-Item -ItemType Directory -Force -Path $jreDir | Out-Null
    & "C:\Windows\System32\tar.exe" -xzf $jreZip -C $jreDir
}
$jreRoot = Get-ChildItem $jreDir -Directory | Select-Object -First 1
Write-Host "  -> $($jreRoot.FullName)"

# 4. 组装阶段目录
Write-Host "[5/7] 组装分发目录"
# JRE
Copy-Item -Path $jreRoot.FullName -Destination (Join-Path $StageApp "runtime") -Recurse -Force
# 后端 jar
$libDir = Join-Path $StageApp "lib"
New-Item -ItemType Directory -Force -Path $libDir | Out-Null
Copy-Item -Path $shadeJar -Destination $libDir -Force
# 前端
Copy-Item -Path (Join-Path $WebDir "target/web-dist") -Destination (Join-Path $StageApp "web-dist") -Recurse -Force
# 脚本
Copy-Item -Path (Join-Path $ScriptsDir "start.sh")  -Destination $StageApp -Force
Copy-Item -Path (Join-Path $ScriptsDir "stop.sh")   -Destination $StageApp -Force
Copy-Item -Path (Join-Path $ScriptsDir "status.sh") -Destination $StageApp -Force
# README
Copy-Item -Path (Join-Path $ScriptsDir "README.md") -Destination $StageApp -Force

# 5. 调整 web-dist 嵌套（确保根目录就是 index.html 所在）
$indexInStage = Join-Path $StageApp "web-dist/index.html"
if (-not (Test-Path $indexInStage)) {
    throw "web-dist/index.html 不存在，请检查构建产物"
}

# 6. 打 tar.gz
Write-Host "[6/7] 打包分发包"
$tarName = "EasyPostman-$version-linux-x64.tar.gz"
$tarPath = Join-Path $DistDir $tarName
& "C:\Windows\System32\tar.exe" -czf $tarPath -C $StageDir "EasyPostman"
$size = "{0:N2} MB" -f ((Get-Item $tarPath).Length / 1MB)
Write-Host "  -> $tarPath ($size)"

# 7. 校验
Write-Host "[7/7] 校验产物"
if (-not (Test-Path $tarPath)) { throw "未生成 tar.gz" }
Write-Host ""
Write-Host "==========================================="
Write-Host "  分发包构建完成"
Write-Host "  路径: $tarPath"
Write-Host "  大小: $size"
Write-Host ""
Write-Host "  Linux 服务器部署步骤："
Write-Host "    1) 上传到服务器: scp $tarPath user@host:~/"
Write-Host "    2) 解压:        tar -xzf $tarName"
Write-Host "    3) 后台启动:    cd EasyPostman && ./start.sh --bg"
Write-Host "    4) 查看状态:    ./status.sh"
Write-Host "    5) 停止:        ./stop.sh"
Write-Host "==========================================="
