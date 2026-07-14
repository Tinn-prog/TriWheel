<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminDocumentExportService
{
    /**
     * @param  array<int, string>  $headers
     * @param  Collection<int, array<int, string|int|float|null>>|iterable<int, array<int, string|int|float|null>>  $rows
     */
    public function download(
        string $format,
        string $basename,
        string $title,
        array $headers,
        iterable $rows,
        ?string $subtitle = null,
    ): Response|StreamedResponse {
        $normalizedRows = collect($rows)
            ->map(fn ($row): array => array_map(
                static fn ($value): string => is_scalar($value) || $value === null ? (string) ($value ?? '') : json_encode($value),
                is_array($row) ? $row : (array) $row,
            ))
            ->values();

        return match (strtolower($format)) {
            'pdf' => $this->downloadPdf($basename, $title, $headers, $normalizedRows, $subtitle),
            'docx', 'doc', 'word' => $this->downloadWord($basename, $title, $headers, $normalizedRows, $subtitle),
            default => $this->downloadCsv($basename, $headers, $normalizedRows),
        };
    }

    /**
     * @param  array<int, string>  $headers
     * @param  Collection<int, array<int, string>>  $rows
     */
    private function downloadCsv(string $basename, array $headers, Collection $rows): StreamedResponse
    {
        $filename = $this->ensureExtension($basename, 'csv');

        return response()->streamDownload(function () use ($headers, $rows): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @param  array<int, string>  $headers
     * @param  Collection<int, array<int, string>>  $rows
     */
    private function downloadPdf(
        string $basename,
        string $title,
        array $headers,
        Collection $rows,
        ?string $subtitle,
    ): Response {
        $html = view('exports.admin-table', [
            'title' => $title,
            'subtitle' => $subtitle,
            'headers' => $headers,
            'rows' => $rows,
            'generatedAt' => now()->timezone(config('app.timezone'))->format('M j, Y, g:i A'),
            'logoSrc' => $this->logoDataUri(),
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'landscape');

        return $pdf->download($this->ensureExtension($basename, 'pdf'));
    }

    /**
     * Word-compatible HTML document (.doc) with logo and title.
     *
     * @param  array<int, string>  $headers
     * @param  Collection<int, array<int, string>>  $rows
     */
    private function downloadWord(
        string $basename,
        string $title,
        array $headers,
        Collection $rows,
        ?string $subtitle,
    ): StreamedResponse {
        $html = view('exports.admin-table', [
            'title' => $title,
            'subtitle' => $subtitle,
            'headers' => $headers,
            'rows' => $rows,
            'generatedAt' => now()->timezone(config('app.timezone'))->format('M j, Y, g:i A'),
            'logoSrc' => $this->logoDataUri(),
        ])->render();

        $filename = $this->ensureExtension($basename, 'doc');

        return response()->streamDownload(function () use ($html): void {
            echo $html;
        }, $filename, [
            'Content-Type' => 'application/msword',
        ]);
    }

    private function ensureExtension(string $basename, string $extension): string
    {
        $basename = preg_replace('/\.(csv|pdf|docx?|txt)$/i', '', $basename) ?: $basename;

        return $basename.'.'.$extension;
    }

    private function logoDataUri(): string
    {
        $path = public_path('triwheel-brand-logo.png');

        if (! is_file($path)) {
            return '';
        }

        $binary = file_get_contents($path);

        if ($binary === false) {
            return '';
        }

        return 'data:image/png;base64,'.base64_encode($binary);
    }
}
