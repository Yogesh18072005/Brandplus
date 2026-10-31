param(
    [Parameter(Mandatory = $true)]
    [string]$VideoPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [double]$IntervalSeconds = 1.0,

    [uint32]$Width = 540,

    [uint32]$Height = 960
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime

[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Media.Editing.MediaClip, Windows.Media.Editing, ContentType = WindowsRuntime]
[void][Windows.Media.Editing.MediaComposition, Windows.Media.Editing, ContentType = WindowsRuntime]
[void][Windows.Media.Editing.VideoFramePrecision, Windows.Media.Editing, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]

function Await-WinRt {
    param(
        [Parameter(Mandatory = $true)]
        $Operation,

        [Parameter(Mandatory = $true)]
        [Type]$ResultType
    )

    $asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq 'AsTask' -and
            $_.IsGenericMethod -and
            $_.GetParameters().Count -eq 1
        } |
        Select-Object -First 1

    $task = $asTaskMethod.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

$resolvedVideo = (Resolve-Path -LiteralPath $VideoPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$storageFile = Await-WinRt -Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($resolvedVideo)) -ResultType ([Windows.Storage.StorageFile])
$mediaClip = Await-WinRt -Operation ([Windows.Media.Editing.MediaClip]::CreateFromFileAsync($storageFile)) -ResultType ([Windows.Media.Editing.MediaClip])
$duration = $mediaClip.OriginalDuration.TotalSeconds
$composition = [Windows.Media.Editing.MediaComposition]::new()
$composition.Clips.Append($mediaClip)

$metadata = [ordered]@{
    DurationSeconds = [math]::Round($duration, 3)
    IntervalSeconds = $IntervalSeconds
    Width = $Width
    Height = $Height
    Frames = @()
}

$index = 0
for ($second = 0.0; $second -lt $duration; $second += $IntervalSeconds) {
    $thumbnail = Await-WinRt -Operation ($composition.GetThumbnailAsync(
        [TimeSpan]::FromSeconds($second),
        $Width,
        $Height,
        [Windows.Media.Editing.VideoFramePrecision]::NearestFrame
    )) -ResultType ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])

    $filename = 'frame-{0:D3}-{1:D5}ms.jpg' -f $index, [int]($second * 1000)
    $outputPath = Join-Path $resolvedOutput $filename
    $inputStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($thumbnail)
    $outputStream = [System.IO.File]::Create($outputPath)
    try {
        $inputStream.CopyTo($outputStream)
    }
    finally {
        $outputStream.Dispose()
        $inputStream.Dispose()
        $thumbnail.Dispose()
    }

    $metadata.Frames += [ordered]@{
        TimeSeconds = [math]::Round($second, 3)
        Path = $outputPath
    }
    $index++
}

$metadata | ConvertTo-Json -Depth 4
