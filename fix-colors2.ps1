# Fix category-level color references (purple, pink, cyan, indigo)

$files = @(
    'apps\web\src\pages\MyItinerary.tsx',
    'apps\web\src\pages\PackingChecklist.tsx',
    'apps\web\src\pages\Expenses.tsx'
)

$replacements = @(
    # Purple -> warm plum
    @('bg-purple-50', 'bg-[#f3e8ff]'),
    @('border-purple-200', 'border-[#d8b4fe]/30'),
    @('text-purple-700', 'text-[#9333ea]'),
    @('text-purple-600', 'text-[#9333ea]'),
    
    # Indigo -> warm brand
    @('bg-indigo-50', 'bg-[#fde8d8]'),
    @('border-indigo-200', 'border-[#e55803]/20'),
    @('text-indigo-700', 'text-[#e55803]'),
    @('text-indigo-400', 'text-[#e55803]'),
    @('bg-indigo-500/10', 'bg-[#e55803]/10'),
    @('border-indigo-500/20', 'border-[#e55803]/20'),
    
    # Pink -> warm rose
    @('bg-pink-50', 'bg-[#fce4ec]'),
    @('border-pink-200', 'border-[#f48fb1]/30'),
    @('text-pink-700', 'text-[#c2185b]'),
    @('text-pink-400', 'text-[#e55803]'),
    @('bg-pink-500/10', 'bg-[#e55803]/10'),
    @('border-pink-500/20', 'border-[#e55803]/20'),
    
    # Cyan -> teal brand
    @('bg-cyan-50', 'bg-[#e0f2f1]'),
    @('border-cyan-200', 'border-[#0e2125]/15'),
    @('text-cyan-700', 'text-[#0e2125]'),
    @('text-cyan-400', 'text-[#0e2125]'),
    @('bg-cyan-500/10', 'bg-[#0e2125]/10'),
    @('border-cyan-500/20', 'border-[#0e2125]/15')
)

foreach ($file in $files) {
    $path = Join-Path 'c:\pirojectsssss\roamie\tripmind' $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw -Encoding UTF8
        foreach ($r in $replacements) {
            $content = $content.Replace($r[0], $r[1])
        }
        Set-Content $path -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed: $file"
    }
}
Write-Host "Done!"
