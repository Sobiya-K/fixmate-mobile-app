Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-UpperMd5 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $md5 = [System.Security.Cryptography.MD5]::Create()

    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        $hashBytes = $md5.ComputeHash($bytes)

        return (
            [System.BitConverter]::ToString($hashBytes)
        ).Replace("-", "").ToUpperInvariant()
    }
    finally {
        $md5.Dispose()
    }
}

function Get-UpperSha256 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $sha256 = [System.Security.Cryptography.SHA256]::Create()

    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        $hashBytes = $sha256.ComputeHash($bytes)

        return (
            [System.BitConverter]::ToString($hashBytes)
        ).Replace("-", "").ToUpperInvariant()
    }
    finally {
        $sha256.Dispose()
    }
}

$merchantId = (Read-Host "Enter the current PayHere Sandbox Merchant ID").Trim()

$secureSecret = Read-Host `
    "Enter the current Merchant Secret (input stays hidden)" `
    -AsSecureString

$secretPointer = [IntPtr]::Zero
$merchantSecret = ""

try {
    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
        $secureSecret
    )

    $merchantSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
        $secretPointer
    ).Trim()

    if ([string]::IsNullOrWhiteSpace($merchantId)) {
        throw "Merchant ID cannot be empty."
    }

    if ([string]::IsNullOrWhiteSpace($merchantSecret)) {
        throw "Merchant Secret cannot be empty."
    }

    $orderId = "FIXMATE-CONFIG-CHECK"
    $amount = "2500.00"
    $currency = "LKR"

    $hashedSecret = Get-UpperMd5 -Value $merchantSecret

    $testHash = Get-UpperMd5 -Value (
        $merchantId +
        $orderId +
        $amount +
        $currency +
        $hashedSecret
    )

    $secretFingerprint = (
        Get-UpperSha256 -Value $merchantSecret
    ).Substring(0, 16)

    Write-Host ""
    Write-Host "Local PayHere configuration check"
    Write-Host "----------------------------------"
    Write-Host "merchant_id:                     $merchantId"
    Write-Host "environment:                     sandbox"
    Write-Host "secret_length:                   $($merchantSecret.Length)"
    Write-Host "secret_fingerprint_sha256_16:    $secretFingerprint"
    Write-Host "test_order_id:                   $orderId"
    Write-Host "test_amount:                     $amount"
    Write-Host "test_currency:                   $currency"
    Write-Host "test_hash:                       $testHash"
    Write-Host ""
    Write-Host "Compare every value with the JSON from payhere-config-check."
}
finally {
    if ($secretPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    }

    $merchantSecret = $null
    $secureSecret = $null
}
