# Fix remaining old color references across all pages

$files = @(
    'apps\web\src\pages\MyItinerary.tsx',
    'apps\web\src\pages\PackingChecklist.tsx',
    'apps\web\src\pages\Payment.tsx',
    'apps\web\src\pages\Expenses.tsx',
    'apps\web\src\pages\Disruption.tsx',
    'apps\web\src\components\OpenClawCart.tsx'
)

$replacements = @(
    # Blue gradients -> orange
    @('from-blue-500 via-indigo-500 to-violet-500', 'from-[#e55803] to-[#c44a00]'),
    @('from-blue-500 to-indigo-600', 'from-[#e55803] to-[#c44a00]'),
    @('from-blue-500 to-blue-400', 'from-[#e55803] to-[#c44a00]'),
    @('shadow-blue-500/30', 'shadow-[#e55803]/30'),
    
    # Timeline gradients -> orange
    @('from-blue-200 via-emerald-200 to-amber-200', 'from-[#e55803]/30 via-[#e55803]/20 to-[#e55803]/10'),
    @('from-blue-400 via-emerald-400 to-amber-400', 'from-[#e55803]/60 via-[#e55803]/40 to-[#e55803]/20'),
    
    # Violet -> orange
    @('bg-violet-50', 'bg-[#fde8d8]'),
    @('border-violet-200', 'border-[#e55803]/20'),
    @('text-violet-700', 'text-[#e55803]'),
    @('hover:bg-violet-100', 'hover:bg-[#fde8d8]'),
    
    # Remaining blue refs
    @('border-blue-600', 'border-[#e55803]'),
    @('hover:border-blue-300', 'hover:border-[#e55803]/40'),
    @('focus:ring-blue-200', 'focus:ring-[#e55803]/20'),
    @('focus:border-blue-400', 'focus:border-[#e55803]'),
    @('focus:ring-blue-500', 'focus:ring-[#e55803]'),
    @('focus:border-blue-500', 'focus:border-[#e55803]'),
    @('bg-blue-50 border-blue-200 text-blue-500', 'bg-[#fde8d8] border-[#e55803]/20 text-[#e55803]'),
    @('text-blue-400', 'text-[#e55803]'),
    
    # Emerald -> brand green (keep functional but harmonize)
    @('text-emerald-400/80', 'text-[#22c55e]/80'),
    @('text-emerald-400', 'text-[#22c55e]'),
    @('bg-emerald-500/5', 'bg-[#22c55e]/5'),
    @('border-emerald-500/20', 'border-[#22c55e]/20'),
    @('text-emerald-500', 'text-[#22c55e]'),
    @('bg-emerald-50', 'bg-[#22c55e]/10'),
    @('border-emerald-200', 'border-[#22c55e]/20'),
    @('text-emerald-700', 'text-[#22c55e]'),
    @('text-emerald-600', 'text-[#22c55e]'),
    @('bg-emerald-100', 'bg-[#22c55e]/15'),
    @('border-emerald-500/50', 'border-[#22c55e]/50'),
    
    # Amber -> brand orange
    @('bg-amber-500', 'bg-[#e55803]'),
    @('hover:bg-amber-400', 'hover:bg-[#c44a00]'),
    @('text-amber-500', 'text-[#e55803]'),
    @('bg-amber-500/5', 'bg-[#e55803]/5'),
    @('bg-amber-500/10', 'bg-[#e55803]/10'),
    @('border-amber-500/20', 'border-[#e55803]/20'),
    @('bg-amber-500/20', 'bg-[#e55803]/20'),
    @('text-amber-950', 'text-[#fff6e0]'),
    @('text-amber-400', 'text-[#e55803]'),
    @('bg-amber-50', 'bg-[#fde8d8]'),
    @('border-amber-200', 'border-[#e55803]/20'),
    @('text-amber-700', 'text-[#e55803]'),
    @('text-amber-600', 'text-[#e55803]'),
    @('text-amber-800', 'text-[#0e2125]'),
    @('hover:bg-amber-100', 'hover:bg-[#fde8d8]'),
    @('focus-within:border-amber-500/50', 'focus-within:border-[#e55803]/50'),
    @('focus-within:ring-amber-500/50', 'focus-within:ring-[#e55803]/50'),
    @('focus:border-amber-500/50', 'focus:border-[#e55803]/50'),
    @('focus:ring-amber-500/50', 'focus:ring-[#e55803]/50'),
    @('shadow-[0_0_20px_rgba(245,158,11,0.2)]', 'shadow-[0_0_20px_rgba(229,88,3,0.2)]'),
    @('amber-600', 'text-[#e55803]'),
    
    # Dark slate remnants in Payment
    @('dark:shadow-slate-900/20', 'shadow-[#0e2125]/10')
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
