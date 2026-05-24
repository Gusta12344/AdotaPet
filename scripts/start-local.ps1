param(
    [int]$ApiPort = 8080,
    [int]$FrontendPort = 5500
)

$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

function Get-Executable {
    param([string[]]$Names)

    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }

    throw "Nenhum comando encontrado: $($Names -join ', ')"
}

function Test-PortInUse {
    param([int]$Port)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", $Port)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Wait-ForStopSignal {
    param(
        [System.Diagnostics.Process]$ApiProcess,
        [System.Diagnostics.Process]$FrontendProcess
    )

    $hasInteractiveInput = $false
    try {
        $hasInteractiveInput = -not [Console]::IsInputRedirected
    } catch {
        $hasInteractiveInput = $false
    }

    if (-not $hasInteractiveInput) {
        Write-Host "Entrada interativa indisponivel. Use Ctrl+C para encerrar."
        while ($true) {
            if ($ApiProcess.HasExited) {
                Write-Host "A API foi encerrada."
                return
            }
            if ($FrontendProcess.HasExited) {
                Write-Host "O frontend foi encerrado."
                return
            }
            Start-Sleep -Seconds 1
        }
    }

    while ($true) {
        if ($ApiProcess.HasExited) {
            Write-Host "A API foi encerrada."
            return
        }
        if ($FrontendProcess.HasExited) {
            Write-Host "O frontend foi encerrado."
            return
        }

        try {
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                if ($key.Key -eq [ConsoleKey]::Enter) {
                    return
                }
            }
        } catch {
            Write-Host "Entrada interativa indisponivel. Use Ctrl+C para encerrar."
            while (-not $ApiProcess.HasExited -and -not $FrontendProcess.HasExited) {
                Start-Sleep -Seconds 1
            }
            return
        }

        Start-Sleep -Milliseconds 200
    }
}

if (Test-PortInUse $ApiPort) {
    throw "A porta $ApiPort ja esta em uso. Encerre o processo atual ou informe outra porta com -ApiPort."
}

if (Test-PortInUse $FrontendPort) {
    throw "A porta $FrontendPort ja esta em uso. Encerre o processo atual ou informe outra porta com -FrontendPort."
}

$mavenWrapper = Join-Path $BackendDir "mvnw.cmd"
if (Test-Path $mavenWrapper) {
    $maven = $mavenWrapper
} else {
    $maven = Get-Executable @("mvn.cmd", "mvn")
}

$python = Get-Command "python" -ErrorAction SilentlyContinue
$pythonArgs = @("-m", "http.server", "$FrontendPort", "--directory", $FrontendDir)
if (-not $python) {
    $python = Get-Command "py" -ErrorAction SilentlyContinue
    $pythonArgs = @("-3") + $pythonArgs
}
if (-not $python) {
    throw "Python 3 nao foi encontrado. Instale Python ou rode o frontend manualmente com outro servidor estatico."
}

Write-Host "Iniciando API na porta $ApiPort..."
$apiProcess = Start-Process -FilePath $maven `
    -ArgumentList @("spring-boot:run", "-Dspring-boot.run.arguments=--server.port=$ApiPort") `
    -WorkingDirectory $BackendDir `
    -PassThru

Write-Host "Iniciando frontend na porta $FrontendPort..."
$frontendProcess = Start-Process -FilePath $python.Source `
    -ArgumentList $pythonArgs `
    -WorkingDirectory $RootDir `
    -PassThru

Write-Host ""
Write-Host "API:      http://localhost:$ApiPort"
Write-Host "Frontend: http://localhost:$FrontendPort/index.html"
Write-Host ""
Write-Host "Pressione Enter para encerrar API e frontend."

try {
    Wait-ForStopSignal -ApiProcess $apiProcess -FrontendProcess $frontendProcess
} finally {
    foreach ($process in @($frontendProcess, $apiProcess)) {
        if ($process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
        }
    }
}
